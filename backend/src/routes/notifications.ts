import { FastifyInstance } from 'fastify'
import * as admin from 'firebase-admin'

// Verificar se Firebase está configurado
const firebaseConfigured = process.env.FIREBASE_PROJECT_ID && 
                           process.env.FIREBASE_PRIVATE_KEY && 
                           process.env.FIREBASE_CLIENT_EMAIL

let firebaseInitialized = false

// Inicializar Firebase Admin apenas se configurado
if (firebaseConfigured && !admin.apps.length) {
  try {
    // Processar chave privada: substituir \n literal por quebras de linha reais
    let privateKey = process.env.FIREBASE_PRIVATE_KEY || ''
    
    // Se a chave contém \n literal (como string), substituir por quebra de linha real
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n')
    }
    
    // Validar se a chave tem formato PEM válido
    const hasBegin = privateKey.includes('BEGIN PRIVATE KEY')
    const hasEnd = privateKey.includes('END PRIVATE KEY')
    
    if (hasBegin && hasEnd) {
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: privateKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        universe_domain: "googleapis.com"
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
      })
      
      firebaseInitialized = true
      console.log('✅ Firebase Admin inicializado com sucesso')
    } else {
      console.warn('⚠️ Firebase: Chave privada com formato inválido - notificações push desabilitadas')
      console.warn(`   - BEGIN PRIVATE KEY encontrado: ${hasBegin}`)
      console.warn(`   - END PRIVATE KEY encontrado: ${hasEnd}`)
      console.warn(`   - Tamanho da chave: ${privateKey.length} caracteres`)
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error instanceof Error ? error.message : error)
    console.warn('⚠️ Notificações push desabilitadas')
  }
} else {
  console.warn('⚠️ Firebase não configurado - notificações push desabilitadas')
}

// Armazenar tokens registrados (em produção, usar banco de dados)
const registeredTokens: Set<string> = new Set()

export default async function notificationsRoutes(fastify: FastifyInstance) {
  
  // POST /api/notifications/register - Registrar token FCM
  fastify.post('/notifications/register', async (request, reply) => {
    try {
      const { token } = request.body as { token: string }
      
      if (!token) {
        return reply.status(400).send({ success: false, error: 'Token é obrigatório' })
      }

      registeredTokens.add(token)
      console.log(`📱 Token FCM registrado: ${token.substring(0, 20)}...`)
      
      return { success: true, message: 'Token registrado com sucesso' }
    } catch (error) {
      console.error('Erro ao registrar token:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao registrar token' })
    }
  })

  // POST /api/notifications/send - Enviar notificação para todos os tokens
  fastify.post('/notifications/send', async (request, reply) => {
    try {
      if (!firebaseInitialized) {
        return reply.status(503).send({ 
          success: false, 
          error: 'Notificações push não disponíveis - Firebase não configurado' 
        })
      }

      const { title, body, data, url } = request.body as {
        title: string
        body: string
        data?: Record<string, string>
        url?: string
      }

      if (!title || !body) {
        return reply.status(400).send({ success: false, error: 'Title e body são obrigatórios' })
      }

      const tokens = Array.from(registeredTokens)
      
      if (tokens.length === 0) {
        return reply.status(400).send({ success: false, error: 'Nenhum dispositivo registrado' })
      }

      const message: admin.messaging.MulticastMessage = {
        notification: {
          title,
          body
        },
        data: {
          ...data,
          url: url || '/',
          timestamp: Date.now().toString()
        },
        webpush: {
          notification: {
            icon: '/logo-192.png',
            badge: '/logo-72.png',
            requireInteraction: true
          },
          fcmOptions: {
            link: url || '/'
          }
        },
        tokens
      }

      const response = await admin.messaging().sendEachForMulticast(message)
      
      console.log(`📤 Notificação enviada: ${response.successCount} sucesso, ${response.failureCount} falha`)

      // Remover tokens inválidos
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
          registeredTokens.delete(tokens[idx])
          console.log(`🗑️ Token removido (inválido): ${tokens[idx].substring(0, 20)}...`)
        }
      })

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount
      }
    } catch (error) {
      console.error('Erro ao enviar notificação:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao enviar notificação' })
    }
  })

  // POST /api/notifications/send-to-token - Enviar para um token específico
  fastify.post('/notifications/send-to-token', async (request, reply) => {
    try {
      const { token, title, body, data, url } = request.body as {
        token: string
        title: string
        body: string
        data?: Record<string, string>
        url?: string
      }

      if (!token || !title || !body) {
        return reply.status(400).send({ success: false, error: 'Token, title e body são obrigatórios' })
      }

      const message: admin.messaging.Message = {
        notification: {
          title,
          body
        },
        data: {
          ...data,
          url: url || '/',
          timestamp: Date.now().toString()
        },
        webpush: {
          notification: {
            icon: '/logo-192.png',
            badge: '/logo-72.png',
            requireInteraction: true
          },
          fcmOptions: {
            link: url || '/'
          }
        },
        token
      }

      const response = await admin.messaging().send(message)
      console.log(`📤 Notificação enviada para token: ${response}`)

      return { success: true, messageId: response }
    } catch (error) {
      console.error('Erro ao enviar notificação:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao enviar notificação' })
    }
  })

  // GET /api/notifications/tokens - Listar tokens registrados (debug)
  fastify.get('/notifications/tokens', async (request, reply) => {
    return {
      success: true,
      count: registeredTokens.size,
      tokens: Array.from(registeredTokens).map(t => t.substring(0, 30) + '...')
    }
  })

  // POST /api/notifications/test - Enviar notificação de teste
  fastify.post('/notifications/test', async (request, reply) => {
    try {
      const tokens = Array.from(registeredTokens)
      
      if (tokens.length === 0) {
        return reply.status(400).send({ success: false, error: 'Nenhum dispositivo registrado. Ative as notificações primeiro.' })
      }

      const message: admin.messaging.MulticastMessage = {
        notification: {
          title: '🔔 LogiLink - Teste',
          body: 'Notificações funcionando! Você receberá alertas importantes aqui.'
        },
        data: {
          type: 'test',
          timestamp: Date.now().toString()
        },
        webpush: {
          notification: {
            icon: '/logo-192.png',
            badge: '/logo-72.png'
          }
        },
        tokens
      }

      const response = await admin.messaging().sendEachForMulticast(message)
      
      return {
        success: true,
        message: 'Notificação de teste enviada!',
        successCount: response.successCount,
        failureCount: response.failureCount
      }
    } catch (error) {
      console.error('Erro ao enviar teste:', error)
      return reply.status(500).send({ success: false, error: 'Erro ao enviar notificação de teste' })
    }
  })
}
