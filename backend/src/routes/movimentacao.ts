import { FastifyInstance } from 'fastify'
import { buscarMovimentacoes, buscarVendasProduto, calcularMediaVendasPorFilial, buscarHistoricoMensal } from '../lib/database-auditoria'

export default async function movimentacaoRoutes(fastify: FastifyInstance) {
  
  // Buscar movimentações com filtros
  fastify.get('/movimentacoes', async (request, reply) => {
    try {
      const { 
        cod_produto, 
        cod_filial, 
        data_inicio, 
        data_fim, 
        tipo_movimento,
        limit 
      } = request.query as any

      const movimentacoes = await buscarMovimentacoes({
        codProduto: cod_produto,
        codFilial: cod_filial,
        dataInicio: data_inicio ? new Date(data_inicio) : undefined,
        dataFim: data_fim ? new Date(data_fim) : undefined,
        tipoMovimento: tipo_movimento,
        limit: limit ? parseInt(limit) : undefined
      })

      return reply.send({
        success: true,
        data: movimentacoes,
        total: movimentacoes.length
      })
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar movimentações'
      })
    }
  })

  // Buscar vendas de um produto
  fastify.get('/movimentacoes/vendas/:cod_produto', async (request, reply) => {
    try {
      const { cod_produto } = request.params as { cod_produto: string }
      const { periodo_dias, cod_filial } = request.query as any

      const vendas = await buscarVendasProduto(
        cod_produto,
        periodo_dias ? parseInt(periodo_dias) : 90,
        cod_filial
      )

      return reply.send({
        success: true,
        data: vendas,
        total: vendas.length
      })
    } catch (error) {
      console.error('Erro ao buscar vendas:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar vendas'
      })
    }
  })

  // Calcular média de vendas por filial
  fastify.get('/movimentacoes/media-vendas/:cod_produto', async (request, reply) => {
    try {
      const { cod_produto } = request.params as { cod_produto: string }
      const { periodo_dias } = request.query as any

      const mediaVendas = await calcularMediaVendasPorFilial(
        cod_produto,
        periodo_dias ? parseInt(periodo_dias) : 90
      )

      return reply.send({
        success: true,
        data: mediaVendas
      })
    } catch (error) {
      console.error('Erro ao calcular média de vendas:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao calcular média de vendas'
      })
    }
  })

  // Buscar histórico mensal
  fastify.get('/movimentacoes/historico-mensal/:cod_produto', async (request, reply) => {
    try {
      const { cod_produto } = request.params as { cod_produto: string }
      const { meses } = request.query as any

      const historico = await buscarHistoricoMensal(
        cod_produto,
        meses ? parseInt(meses) : 6
      )

      return reply.send({
        success: true,
        data: historico
      })
    } catch (error) {
      console.error('Erro ao buscar histórico mensal:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar histórico mensal'
      })
    }
  })
}
