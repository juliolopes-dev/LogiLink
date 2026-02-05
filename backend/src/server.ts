import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import path from 'path'
import prisma from './lib/prisma.js'
import poolAuditoria from './lib/database-auditoria.js'
import { produtosRoutes } from './routes/produtos'
import { combinadosRoutes } from './routes/combinados'
import movimentacaoRoutes from './routes/movimentacao'
import { nfEntradaRoutes } from './routes/nf-entrada'
import { estoqueHistoricoRoutes } from './routes/estoque-historico'
import { dashboardRoutes } from './routes/dashboard'
import produtoConfigRoutes from './routes/produto-config'
import notificationsRoutes from './routes/notifications'
import { estoqueMinRoutes } from './routes/estoque-minimo'

// Novas rotas DRP refatoradas
import drpProdutoRoutes from './routes/drp/produto.routes'

// Serialização de BigInt para JSON
declare global {
  interface BigInt {
    toJSON(): string
  }
}
BigInt.prototype.toJSON = function() {
  return this.toString()
}

const fastify = Fastify({
  logger: true
})

// CORS para desenvolvimento e produção
const isDevelopment = process.env.NODE_ENV !== 'production'
fastify.register(cors, {
  origin: isDevelopment 
    ? ['http://localhost:5173', 'http://127.0.0.1:5173']
    : true, // Em produção, permite qualquer origem (ajuste conforme necessário)
  credentials: true
})

// Servir arquivos estáticos do frontend em produção
if (!isDevelopment) {
  // Em produção, o frontend buildado está em /app/public
  // O servidor roda de /app/dist, então public está em /app/public
  fastify.register(fastifyStatic, {
    root: path.resolve(process.cwd(), 'public'),
    prefix: '/',
  })

  // Fallback para SPA - todas rotas não-API retornam index.html
  fastify.setNotFoundHandler((request, reply) => {
    if (!request.url.startsWith('/api')) {
      reply.sendFile('index.html')
    } else {
      reply.code(404).send({ error: 'Not found' })
    }
  })
}

// Rota de health check
fastify.get('/api/health', async () => {
  return { 
    success: true, 
    message: 'DRP Bezerra API está funcionando!',
    timestamp: new Date().toISOString(),
    timezone: 'America/Sao_Paulo'
  }
})

// Rota de teste de conexão com banco
fastify.get('/api/db-test', async () => {
  try {
    const produtosResult = await poolAuditoria.query('SELECT COUNT(*) FROM auditoria_integracao.auditoria_produtos_drp')
    const estoqueResult = await poolAuditoria.query('SELECT COUNT(*) FROM auditoria_integracao."Estoque_DRP"')
    
    return { 
      success: true, 
      message: 'Conexão com banco OK!',
      dados: {
        totalProdutos: produtosResult.rows[0].count,
        totalEstoque: estoqueResult.rows[0].count
      }
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
})

// Registrar rotas de produtos
fastify.register(produtosRoutes, { prefix: '/api' })

// Registrar rotas de combinados
fastify.register(combinadosRoutes, { prefix: '/api' })

// Registrar rotas de movimentação (banco de auditoria)
fastify.register(movimentacaoRoutes, { prefix: '/api' })

// Registrar rotas de NF Entrada (banco de auditoria)
fastify.register(nfEntradaRoutes, { prefix: '/api' })

// Registrar rotas de Estoque Histórico (banco de auditoria)
fastify.register(estoqueHistoricoRoutes, { prefix: '/api' })

// Registrar rotas de Dashboard
fastify.register(dashboardRoutes, { prefix: '/api' })

// Registrar rotas de Configuração de Produtos
fastify.register(produtoConfigRoutes, { prefix: '/api' })

// Registrar rotas de Notificações Push
fastify.register(notificationsRoutes, { prefix: '/api' })

// Registrar rotas de Estoque Mínimo
fastify.register(estoqueMinRoutes, { prefix: '/api' })

// Registrar novas rotas DRP refatoradas
fastify.register(drpProdutoRoutes)

// Rota para listar estoque por filial (resumo)
fastify.get('/api/estoque/resumo', async (request) => {
  try {
    const { ativo = 'S' } = request.query as { ativo?: string }
    
    let filtroAtivo = ''
    let filtroAtivoWhere = ''
    if (ativo === 'S') {
      filtroAtivo = "WHERE p.ativo = 'S'"
      filtroAtivoWhere = "WHERE ativo = 'S'"
    } else if (ativo === 'N') {
      filtroAtivo = "WHERE p.ativo = 'N'"
      filtroAtivoWhere = "WHERE ativo = 'N'"
    } else if (ativo === 'todos') {
      filtroAtivo = '' // Sem filtro, pega todos
      filtroAtivoWhere = ''
    }
    
    const [resumoPorFilialResult, totaisGeraisResult] = await Promise.all([
      poolAuditoria.query(`
        SELECT 
          e.cod_filial,
          COUNT(DISTINCT CASE WHEN e.estoque > 0 THEN p.cod_produto END) as total_skus,
          SUM(e.estoque) as estoque_total,
          SUM(e.estoque - COALESCE(e.quantidade_bloqueada, 0)) as estoque_disponivel,
          COUNT(DISTINCT CASE WHEN e.estoque <= 0 THEN p.cod_produto END) as skus_zerados,
          COUNT(DISTINCT CASE WHEN e.estoque > 0 AND e.estoque <= e.estoque_minimo THEN p.cod_produto END) as skus_abaixo_minimo
        FROM auditoria_integracao.auditoria_produtos_drp p
        INNER JOIN auditoria_integracao."Estoque_DRP" e ON p.cod_produto = e.cod_produto
        ${filtroAtivo}
        GROUP BY e.cod_filial
        ORDER BY e.cod_filial
      `),
      poolAuditoria.query(`
        SELECT 
          (SELECT COUNT(*) FROM auditoria_integracao.auditoria_produtos_drp ${filtroAtivoWhere}) as total_skus_unicos,
          (SELECT COUNT(DISTINCT p.cod_produto) 
           FROM auditoria_integracao.auditoria_produtos_drp p 
           INNER JOIN auditoria_integracao."Estoque_DRP" e ON p.cod_produto = e.cod_produto 
           WHERE e.estoque <= 0 ${filtroAtivoWhere ? 'AND ' + filtroAtivoWhere.replace('WHERE', 'p.') : ''}) as total_zerados,
          (SELECT COUNT(DISTINCT p.cod_produto) 
           FROM auditoria_integracao.auditoria_produtos_drp p 
           INNER JOIN auditoria_integracao."Estoque_DRP" e ON p.cod_produto = e.cod_produto 
           WHERE e.estoque > 0 AND e.estoque <= e.estoque_minimo ${filtroAtivoWhere ? 'AND ' + filtroAtivoWhere.replace('WHERE', 'p.') : ''}) as total_abaixo_minimo
      `)
    ])
    
    return { 
      success: true, 
      data: resumoPorFilialResult.rows,
      totais: totaisGeraisResult.rows[0]
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
})

// Graceful shutdown - fechar conexões corretamente
const gracefulShutdown = async (signal: string) => {
  console.log(`\n⚠️ Recebido ${signal}. Encerrando servidor...`)
  
  try {
    await fastify.close()
    console.log('✅ Fastify fechado')
    
    await prisma.$disconnect()
    console.log('✅ Prisma desconectado')
    
    await poolAuditoria.end()
    console.log('✅ Pool de auditoria fechado')
    
    console.log('👋 Servidor encerrado com sucesso')
    process.exit(0)
  } catch (err) {
    console.error('❌ Erro ao encerrar servidor:', err)
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Iniciar servidor
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333
    const host = process.env.HOST || '0.0.0.0'
    
    await fastify.listen({ port, host })
    console.log(`🚀 Servidor rodando em http://${host}:${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
