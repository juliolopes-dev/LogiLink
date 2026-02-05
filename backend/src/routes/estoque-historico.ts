import { FastifyInstance } from 'fastify'
import { 
  buscarEstoqueHistorico, 
  buscarEstoquePorProduto, 
  buscarEstoquePorFilial,
  buscarUltimoEstoque
} from '../lib/database-auditoria.js'

export async function estoqueHistoricoRoutes(fastify: FastifyInstance) {
  
  // Listar histórico de estoque com filtros
  fastify.get('/estoque-historico', async (request, reply) => {
    try {
      const { 
        cod_produto, 
        cod_filial,
        data_inicio,
        data_fim,
        limit = 100,
        offset = 0
      } = request.query as any

      const filtros: any = {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }

      if (cod_produto) filtros.codProduto = cod_produto
      if (cod_filial) filtros.codFilial = cod_filial
      if (data_inicio) filtros.dataInicio = new Date(data_inicio)
      if (data_fim) filtros.dataFim = new Date(data_fim)

      const historico = await buscarEstoqueHistorico(filtros)

      return reply.send({
        success: true,
        data: historico,
        total: historico.length
      })
    } catch (error) {
      console.error('Erro ao buscar histórico de estoque:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar histórico de estoque'
      })
    }
  })

  // Buscar histórico de estoque por produto
  fastify.get<{
    Params: { cod_produto: string }
    Querystring: { limit?: string }
  }>('/estoque-historico/produto/:cod_produto', async (request, reply) => {
    try {
      const { cod_produto } = request.params
      const { limit = '30' } = request.query

      const historico = await buscarEstoquePorProduto(cod_produto, parseInt(limit))

      return reply.send({
        success: true,
        data: historico,
        total: historico.length
      })
    } catch (error) {
      console.error('Erro ao buscar histórico do produto:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar histórico do produto'
      })
    }
  })

  // Buscar histórico de estoque por filial
  fastify.get<{
    Params: { cod_filial: string }
    Querystring: { limit?: string }
  }>('/estoque-historico/filial/:cod_filial', async (request, reply) => {
    try {
      const { cod_filial } = request.params
      const { limit = '100' } = request.query

      const historico = await buscarEstoquePorFilial(cod_filial, parseInt(limit))

      return reply.send({
        success: true,
        data: historico,
        total: historico.length
      })
    } catch (error) {
      console.error('Erro ao buscar histórico da filial:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar histórico da filial'
      })
    }
  })

  // Buscar último estoque de um produto
  fastify.get<{
    Params: { cod_produto: string }
    Querystring: { cod_filial?: string }
  }>('/estoque-historico/ultimo/:cod_produto', async (request, reply) => {
    try {
      const { cod_produto } = request.params
      const { cod_filial } = request.query

      const ultimo = await buscarUltimoEstoque(cod_produto, cod_filial)

      if (ultimo.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Histórico de estoque não encontrado'
        })
      }

      return reply.send({
        success: true,
        data: cod_filial ? ultimo[0] : ultimo
      })
    } catch (error) {
      console.error('Erro ao buscar último estoque:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar último estoque'
      })
    }
  })
}
