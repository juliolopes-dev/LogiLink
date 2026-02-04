import { FastifyInstance } from 'fastify'
import * as admin from 'firebase-admin'

// Inicializar Firebase Admin usando variáveis de ambiente
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID || "logilink-9a32d",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "1be76adfc661fc87c7040893051d9197a62475c1",
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || "-----BEGIN PRIVATE KEY-----\nMIIEugIBADANBgkqhkiG9w0BAQEFAASCBKQwggSgAgEAAoIBAQDgoJIn8TD3IA+j\nbWqxRdXlJU8Dg2+mcwNHEk7oUxbO9ejl/9NSSuDnmcrHe6mQGIjdhayBiZeiJaZH\nzPr1g/SD7nlHYYGSiWGt7p83GssWNBFMGx6spj5sJrCx/GMUvoOAKj91/gEm0Zvs\n7vxF/GgrJ8d04+OoexY/4qWu9R2D7YctMaZMc2bGOh9LCZdI08W3lZAMkFJP8Nkd\nJsRUdEY14jV14BY7wFX0f7zGldKU6Cx9/kYSZwi6bd/zM9BTW7YbfGoyMrSuE/gW\nkXo+2jutZhTW1UYWUKiZnfb0vSD09dKIR3j4a70NT7rIDYew9kYbV/6nP5JBvoTO\nsYIneJTXAgMBAAECggEAEJDxtoMR5WfhP2BLxL8twzSOhefPotWgoZaMEz5C1F32\ndd/5fybekgtu6moIW1mJM9fZR8RqAR9dtWCSBuwFwHp59KBlpJ+qgIq0sKUH4p9R\nwex4xVWNYlSIJi2YRmi2h2FA75FywaDRKxbaVsmtX7a9/bTrjqVlQq49zJAZ7nzB\nYIyQ//aB+TL1HQ3urEUTsn9LC/wTy7h0V/hiWpCgeyAezw62LcJoK4EdSmt/6igK\n6mp6sAS2kDjMY79s0PPIbQi6xGsrK9OKTdyvCJnZRuzY9CruTbHMxVF4iFxNN7qc\n37roBvQY60KZAdOG0wtKJPUbluj6DYfRSgwoyIkcAQKBgQD1ipsrYoBUxj4nse2X\nsC1H46EYnkhaczPgagfP4RpCLVR6DITFxgNjGQ0uHT0w+XrCBDuHW1NMuP1VCnzc\nRqvB0UZcyRSt87OGRAHThax4tFkDU2cXSRvE+9lJvycoBpw/RMfwfnb/diayOGYu\njcHhCV837qn+C33kHKHLbCqTgQKBgQDqMepduDAgEakl2qAS1GihKS1OFdb8msPj\nj8WjSt6M+uRaEbTd0U1WHoosT8Hfqma4hcNSdmuXTdB71oEcSIq8GmkNETu1bR2G\nTIGM4PZLp00OooJ2GGmDH9/EfN5Yeq6kKL6cOOhjgzNCYIV8hghDuWHmyClWSTiR\noAwIZyp0VwJ/YdTX/nFAsIZMPYSnJckMQZhwl155dZBxGvkkI6+MxtFI11gljqdW\nsiVJGxaLSvgb8TG+hi/dALS0Oy3ykdGWnaLEZjO4CZcP8G8oSx73mSBCVxDkAmMe\nrV2rNbbz4v6/QnYlM60vvJlW0aunCuVwWjlhtudg09fAUSMXU/XFAQKBgAX0EuMj\nBYYrLMOblSolYCuIonAzue1d+dDVHM8T3ihzUE7B2HkzEuY3jIen12PaLxZNwDNe\nc0m7XqtnPoz7gxtZCIaeg4gPKAr78ucj6N7vd9QBaZOa90OwEb4q9nQFWl8t8fqC\nr9WnxivPzFToC1m9YrG9MN/SqK97BBNKnBetAoGAEHsY3QRFotibhnjtK+IKxsYF\nd45e7bQiH1+7KJG/+JVxmv65rFybioMlULAM1N4LFFgc/hPUXXinNREnVn/koHY7\n8o1iX0tWwDrv5F9stIxjF9tc5MZ8Lnu12YVl+uWAKPDh4AUsd6cVm/bXlaI/Y39b\nlHKHu4s5wWaHZ/xeQVk=\n-----END PRIVATE KEY-----\n",
  client_email: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@logilink-9a32d.iam.gserviceaccount.com",
  client_id: process.env.FIREBASE_CLIENT_ID || "107358477568487673842",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40logilink-9a32d.iam.gserviceaccount.com",
  universe_domain: "googleapis.com"
}

// Inicializar apenas uma vez
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
  })
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
