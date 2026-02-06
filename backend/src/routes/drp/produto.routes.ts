/**
 * Rotas para DRP por Produto
 * 
 * Endpoints:
 * - POST /api/drp/calcular - Calcula DRP por Produto
 * - GET /api/drp/grupos - Lista grupos para filtro
 * - GET /api/drp/combinados/:cod_grupo - Detalhes de produtos combinados
 */

import { FastifyInstance } from 'fastify'
import { DRPProdutoService } from '../../services/drp'
import { CalcularDRPProdutoRequest } from '../../types/drp'
import poolAuditoria from '../../lib/database-auditoria'
import { CD_FILIAL, FILIAL_GARANTIA } from '../../utils/drp'
import * as XLSX from 'xlsx'
import { calcularFrequenciaSaida } from '../../utils/drp/frequencia-saida'
import { enviarWebhookPedido } from '../../utils/webhook-pedido'

const FILIAIS_MAP: Record<string, string> = {
  '00': 'Petrolina',
  '01': 'Juazeiro',
  '02': 'Salgueiro',
  '04': 'CD',
  '05': 'Bonfim',
  '06': 'Picos'
}

export default async function drpProdutoRoutes(fastify: FastifyInstance) {
  const service = new DRPProdutoService()

  /**
   * POST /api/drp/calcular
   * Calcula DRP por Produto com paginação
   */
  fastify.post('/api/drp/calcular', async (request, reply) => {
    try {
      const body = request.body as CalcularDRPProdutoRequest

      const resultado = await service.calcular(body)

      // Calcular resumo da página atual
      let totalNecessidade = 0
      let totalEstoqueCD = 0
      let totalDeficit = 0
      let produtosOk = 0
      let produtosRateio = 0
      let produtosDeficit = 0

      for (const produto of resultado.produtos) {
        totalNecessidade += produto.necessidade_total
        totalEstoqueCD += produto.estoque_cd
        totalDeficit += produto.deficit

        if (produto.status === 'ok') produtosOk++
        else if (produto.status === 'rateio') produtosRateio++
        else produtosDeficit++
      }

      return {
        success: true,
        resumo: {
          total_skus: resultado.paginacao.total_produtos,
          skus_pagina: resultado.produtos.length,
          necessidade_total: Math.round(totalNecessidade),
          estoque_cd: Math.round(totalEstoqueCD),
          deficit_total: Math.round(totalDeficit),
          produtos_ok: produtosOk,
          produtos_rateio: produtosRateio,
          produtos_deficit: produtosDeficit,
          periodo_dias: body.periodo_dias,
          filial_origem: body.filial_origem || CD_FILIAL
        },
        paginacao: resultado.paginacao,
        produtos: resultado.produtos
      }
    } catch (error: any) {
      console.error('❌ Erro ao calcular DRP por Produto:', error)
      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro ao calcular DRP'
      })
    }
  })

  /**
   * GET /api/drp/grupos
   * Lista grupos para filtro
   */
  fastify.get('/api/drp/grupos', async (request, reply) => {
    try {
      const gruposResult = await poolAuditoria.query(`
        SELECT codgrupo as cod_grupo, descricao
        FROM auditoria_integracao."Grupo"
        ORDER BY descricao
      `)

      return {
        success: true,
        data: gruposResult.rows
      }
    } catch (error: any) {
      console.error('❌ Erro ao buscar grupos:', error)
      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro ao buscar grupos'
      })
    }
  })

  /**
   * GET /api/drp/combinados/:cod_grupo
   * Detalhes de produtos combinados
   */
  fastify.get<{
    Params: { cod_grupo: string }
    Querystring: { periodo_dias?: string }
  }>('/api/drp/combinados/:cod_grupo', async (request, reply) => {
    try {
      const { cod_grupo } = request.params
      const periodo_dias = request.query.periodo_dias || '30'

      // Buscar produtos do grupo combinado
      const produtosBaseResult = await poolAuditoria.query(`
        SELECT 
          p.cod_produto,
          p.descricao,
          COALESCE(p.referencia_fabricante, '-') as referencia_fabricante,
          COALESCE(e.estoque, 0) as estoque_cd,
          cp.ordem
        FROM auditoria_integracao."Produtos_Combinado_DRP" cp
        INNER JOIN auditoria_integracao.auditoria_produtos_drp p ON cp.cod_produto = p.cod_produto
        LEFT JOIN auditoria_integracao."Estoque_DRP" e ON p.cod_produto = e.cod_produto AND e.cod_filial = '${CD_FILIAL}'
        WHERE cp.cod_grupo = $1
        ORDER BY cp.ordem, p.descricao
      `, [cod_grupo])

      const produtosBase = produtosBaseResult.rows

      // Buscar vendas de cada produto
      const produtos = await Promise.all(produtosBase.map(async (p: any) => {
        const vendasResult = await poolAuditoria.query(`
          SELECT COALESCE(SUM(quantidade), 0) as vendas_periodo
          FROM auditoria_integracao."Movimentacao_DRP"
          WHERE cod_produto = $1
            AND tipo_movimento = '55'
            AND data_movimento >= CURRENT_DATE - INTERVAL '1 day' * $2
            AND cod_filial != $3
        `, [p.cod_produto, parseInt(periodo_dias), FILIAL_GARANTIA])

        return {
          ...p,
          vendas_periodo: vendasResult.rows[0]?.vendas_periodo?.toString() || '0'
        }
      }))

      return {
        success: true,
        data: produtos,
        periodo_dias: parseInt(periodo_dias)
      }
    } catch (error: any) {
      console.error('❌ Erro ao buscar produtos combinados:', error)
      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro ao buscar produtos combinados'
      })
    }
  })

  /**
   * POST /api/drp/exportar-xlsx
   * Exportar DRP por Produto em formato XLSX
   */
  fastify.post('/api/drp/exportar-xlsx', async (request, reply) => {
    try {
      const { produtos, periodo_dias, filial_origem } = request.body as {
        periodo_dias: number
        filial_origem: string
        produtos: Array<{
          cod_produto: string
          descricao: string
          estoque_cd: number
          filiais: Array<{
            cod_filial: string
            nome: string
            estoque_atual: number
            saida_periodo: number
            necessidade: number
            alocacao_sugerida: number
          }>
        }>
      }

      console.log(`📊 Gerando exportação XLSX para DRP por Produto...`)

      // Buscar referência do fabricante para todos os produtos
      const referenciaResult = await poolAuditoria.query(`
        SELECT cod_produto, referencia_fabricante
        FROM auditoria_integracao.auditoria_produtos_drp
        WHERE cod_produto = ANY($1)
      `, [produtos.map(p => p.cod_produto)])

      const referenciaMap = new Map(
        referenciaResult.rows.map((r: any) => [r.cod_produto, r.referencia_fabricante || ''])
      )

      // Buscar quantidade bloqueada da filial origem
      const bloqueadoOrigemResult = await poolAuditoria.query(`
        SELECT cod_produto, COALESCE(SUM(quantidade_bloqueada), 0) as qtd_bloqueada
        FROM auditoria_integracao."Estoque_DRP"
        WHERE cod_filial = $1 
          AND cod_produto = ANY($2)
        GROUP BY cod_produto
      `, [filial_origem, produtos.map(p => p.cod_produto)])

      const bloqueadoOrigemMap = new Map(
        bloqueadoOrigemResult.rows.map((r: any) => [r.cod_produto, parseFloat(r.qtd_bloqueada)])
      )

      // Preparar dados para o Excel
      const dadosExcel: any[] = []

      for (const produto of produtos) {
        // Buscar quantidade bloqueada e estoque mínimo por filial (destino)
        const estoqueDestinoResult = await poolAuditoria.query(`
          SELECT 
            cod_filial, 
            COALESCE(quantidade_bloqueada, 0) as qtd_bloqueada,
            COALESCE(estoque_minimo, 0) as estoque_minimo
          FROM auditoria_integracao."Estoque_DRP"
          WHERE cod_produto = $1 
            AND cod_filial IN ('00', '01', '02', '05', '06')
        `, [produto.cod_produto])

        const bloqueadoDestinoMap = new Map(
          estoqueDestinoResult.rows.map((r: any) => [r.cod_filial, parseFloat(r.qtd_bloqueada)])
        )
        
        const estoqueMinDestinoMap = new Map(
          estoqueDestinoResult.rows.map((r: any) => [r.cod_filial, parseFloat(r.estoque_minimo)])
        )

        // Calcular frequência de saída para cada filial usando função utilitária
        for (const filial of produto.filiais) {
          const resultadoFrequencia = await calcularFrequenciaSaida(
            produto.cod_produto,
            filial.cod_filial,
            periodo_dias
          )

          const nomeOrigem = FILIAIS_MAP[filial_origem] || filial_origem

          dadosExcel.push({
            'Produto': produto.cod_produto,
            'Referência': referenciaMap.get(produto.cod_produto) || '',
            'Descrição': produto.descricao,
            'Filial Destino': `${filial.cod_filial} - ${filial.nome}`,
            [`Estoque Origem (${nomeOrigem})`]: produto.estoque_cd,
            'Bloqueado Origem': bloqueadoOrigemMap.get(produto.cod_produto) || 0,
            'Estoque Destino': filial.estoque_atual,
            'Bloqueado Destino': bloqueadoDestinoMap.get(filial.cod_filial) || 0,
            'Estoque Mínimo': estoqueMinDestinoMap.get(filial.cod_filial) || 0,
            [`Saída ${periodo_dias}d`]: filial.saida_periodo,
            'Frequência Saída': resultadoFrequencia.frequencia,
            'Necessidade': filial.necessidade,
            'Sugestão': filial.alocacao_sugerida
          })
        }
      }

      // Criar workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(dadosExcel)

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 12 }, // Produto
        { wch: 20 }, // Referência
        { wch: 40 }, // Descrição
        { wch: 20 }, // Filial Destino
        { wch: 18 }, // Estoque Origem
        { wch: 18 }, // Bloqueado Origem
        { wch: 18 }, // Estoque Destino
        { wch: 18 }, // Bloqueado Destino
        { wch: 16 }, // Estoque Mínimo
        { wch: 15 }, // Saída
        { wch: 18 }, // Frequência Saída
        { wch: 15 }, // Necessidade
        { wch: 12 }  // Sugestão
      ]
      ws['!cols'] = colWidths

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'DRP')

      // Gerar buffer do arquivo
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

      const nomeOrigem = FILIAIS_MAP[filial_origem] || filial_origem

      // Enviar arquivo
      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="DRP_Produto_${nomeOrigem}_${new Date().toISOString().split('T')[0]}.xlsx"`)
        .send(buffer)

    } catch (error) {
      console.error('❌ Erro ao exportar XLSX:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao exportar XLSX'
      })
    }
  })

  /**
   * POST /api/drp/gerar-pedidos
   * Gerar pedidos para cada filial a partir do DRP por Produto calculado
   */
  fastify.post('/api/drp/gerar-pedidos', async (request, reply) => {
    try {
      const { produtos, usuario, filial_origem } = request.body as {
        filial_origem: string
        usuario?: string
        produtos: Array<{
          cod_produto: string
          descricao: string
          filiais: Array<{
            cod_filial: string
            nome: string
            estoque_atual: number
            necessidade: number
            alocacao_sugerida: number
            usou_estoque_minimo?: boolean
            usou_combinado?: boolean
          }>
        }>
      }

      if (!produtos || produtos.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Produtos são obrigatórios'
        })
      }

      const nomeOrigem = FILIAIS_MAP[filial_origem] || filial_origem
      console.log(`📦 Gerando pedidos DRP por Produto (origem: ${nomeOrigem})...`)

      // Agrupar itens por filial
      const itensPorFilial: Record<string, Array<{
        cod_produto: string
        descricao: string
        quantidade: number
        tipo_calculo: string
        necessidade_original: number
        estoque_filial: number
      }>> = {}

      for (const produto of produtos) {
        for (const filial of produto.filiais) {
          if (filial.alocacao_sugerida > 0) {
            if (!itensPorFilial[filial.cod_filial]) {
              itensPorFilial[filial.cod_filial] = []
            }

            // Determinar tipo de cálculo
            let tipoCalculo = 'vendas'
            if (filial.usou_estoque_minimo) {
              tipoCalculo = 'estoque_minimo'
            } else if (filial.usou_combinado) {
              tipoCalculo = 'combinado'
            }

            itensPorFilial[filial.cod_filial].push({
              cod_produto: produto.cod_produto,
              descricao: produto.descricao,
              quantidade: filial.alocacao_sugerida,
              tipo_calculo: tipoCalculo,
              necessidade_original: filial.necessidade,
              estoque_filial: filial.estoque_atual
            })
          }
        }
      }

      const pedidosCriados: Array<{
        numero_pedido: string
        cod_filial: string
        nome_filial: string
        total_itens: number
        total_quantidade: number
      }> = []

      // Criar um pedido para cada filial que tem itens
      for (const [codFilial, itens] of Object.entries(itensPorFilial)) {
        if (itens.length === 0) continue

        const nomeFilial = FILIAIS_MAP[codFilial] || codFilial
        const totalItens = itens.length
        const totalQuantidade = itens.reduce((sum, item) => sum + item.quantidade, 0)

        // Gerar número do pedido
        const numeroPedidoResult = await poolAuditoria.query(
          `SELECT auditoria_integracao.gerar_numero_pedido_drp($1) as numero`,
          [codFilial]
        )
        const numeroPedido = numeroPedidoResult.rows[0].numero

        // DRP por Produto não tem NF real
        const nfOrigem = 'DRP-PROD'

        // Inserir pedido
        const pedidoResult = await poolAuditoria.query(`
          INSERT INTO auditoria_integracao."Pedido_DRP" (
            numero_pedido, numero_nf_origem, cod_filial_destino, nome_filial_destino,
            usuario, total_itens, total_quantidade, status, cod_fornecedor, nome_fornecedor
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendente', NULL, $8)
          RETURNING id
        `, [numeroPedido, nfOrigem, codFilial, nomeFilial, usuario || 'Sistema', totalItens, totalQuantidade, `DRP Produto - Origem: ${nomeOrigem}`])

        const pedidoId = pedidoResult.rows[0].id

        // Inserir itens do pedido
        for (const item of itens) {
          await poolAuditoria.query(`
            INSERT INTO auditoria_integracao."Pedido_DRP_Itens" (
              pedido_id, cod_produto, descricao_produto, quantidade,
              tipo_calculo, necessidade_original, estoque_filial
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [pedidoId, item.cod_produto, item.descricao, item.quantidade,
              item.tipo_calculo, item.necessidade_original, item.estoque_filial])
        }

        pedidosCriados.push({
          numero_pedido: numeroPedido,
          cod_filial: codFilial,
          nome_filial: nomeFilial,
          total_itens: totalItens,
          total_quantidade: totalQuantidade
        })

        console.log(`✅ Pedido ${numeroPedido} criado para ${nomeFilial}: ${totalItens} itens, ${totalQuantidade} unidades`)
      }

      // Enviar webhook para n8n (fire and forget)
      enviarWebhookPedido({
        origem: 'DRP-PROD',
        numero_nf_origem: 'DRP-PROD',
        filial_origem: filial_origem,
        nome_filial_origem: nomeOrigem,
        fornecedor: null,
        usuario: usuario || 'Sistema',
        pedidos: pedidosCriados
      })

      return reply.send({
        success: true,
        message: `${pedidosCriados.length} pedido(s) gerado(s) com sucesso`,
        data: {
          filial_origem: filial_origem,
          nome_origem: nomeOrigem,
          pedidos: pedidosCriados
        }
      })

    } catch (error) {
      console.error('Erro ao gerar pedidos:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao gerar pedidos'
      })
    }
  })
}
