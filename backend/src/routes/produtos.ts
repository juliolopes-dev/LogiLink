import { FastifyInstance } from 'fastify'
import prisma from '../lib/prisma.js'
import poolAuditoria from '../lib/database-auditoria.js'

interface ProdutoQuery {
  page?: string
  limit?: string
  busca?: string
  filial?: string
  grupo?: string
  status?: 'todos' | 'zerado' | 'abaixo_minimo' | 'ok'
}

export async function produtosRoutes(fastify: FastifyInstance) {
  
  fastify.get('/produtos', async (request, reply) => {
    try {
      const { 
        page = '1', 
        limit = '50', 
        busca = '', 
        filial = '',
        grupo = '',
        status = 'todos'
      } = request.query as ProdutoQuery

      const pageNum = Math.max(1, parseInt(page))
      const limitNum = Math.min(100, Math.max(10, parseInt(limit)))
      const offset = (pageNum - 1) * limitNum

      let whereClause = 'WHERE 1=1'
      const params: (string | number)[] = []
      let paramIndex = 1

      if (busca) {
        whereClause += ` AND (
          UPPER(p.descricao) LIKE UPPER($${paramIndex}) 
          OR p.cod_produto LIKE $${paramIndex}
          OR p.codigo_barras LIKE $${paramIndex}
          OR UPPER(p.referencia_fabricante) LIKE UPPER($${paramIndex})
          OR UPPER(p.descricao3) LIKE UPPER($${paramIndex})
        )`
        params.push(`%${busca}%`)
        paramIndex++
      }

      if (filial) {
        whereClause += ` AND e.cod_filial = $${paramIndex}`
        params.push(filial)
        paramIndex++
      }

      if (grupo) {
        whereClause += ` AND p.cod_grupo = $${paramIndex}`
        params.push(grupo)
        paramIndex++
      }

      if (status === 'zerado') {
        whereClause += ` AND COALESCE(e.estoque, 0) <= 0`
      } else if (status === 'abaixo_minimo') {
        whereClause += ` AND COALESCE(e.estoque, 0) > 0 AND COALESCE(e.estoque, 0) <= COALESCE(e.estoque_minimo, 0)`
      } else if (status === 'ok') {
        whereClause += ` AND COALESCE(e.estoque, 0) > COALESCE(e.estoque_minimo, 0)`
      }

      const countQuery = `
        SELECT COUNT(DISTINCT p.cod_produto) as total
        FROM auditoria_integracao.auditoria_produtos_drp p
        LEFT JOIN auditoria_integracao."Estoque_DRP" e ON p.cod_produto = e.cod_produto
        ${whereClause}
      `

      const dataQuery = `
        SELECT 
          p.cod_produto,
          p.descricao,
          COALESCE(p.referencia_fabricante, '-') as referencia_fabricante,
          p.codigo_barras,
          p.cod_grupo,
          p.cod_fabricante,
          p.cod_fornecedor_principal,
          p.ativo,
          p.produto_bloqueado,
          COALESCE(g.descricao, 'Sem Grupo') as grupo_descricao,
          CASE 
            WHEN cp.cod_grupo IS NOT NULL THEN true
            ELSE false
          END as tem_combinado,
          cp.cod_grupo as cod_grupo_combinado,
          (SELECT COUNT(*) FROM auditoria_integracao."Produtos_Combinado_DRP" WHERE cod_grupo = cp.cod_grupo) as qtd_combinados,
          COALESCE((
            SELECT SUM(e2.estoque)
            FROM auditoria_integracao."Estoque_DRP" e2
            WHERE e2.cod_produto = p.cod_produto
            AND e2.cod_filial != '03'
          ), 0) as estoque_total_grupo,
          COALESCE((
            SELECT SUM(e2.estoque - COALESCE(e2.quantidade_bloqueada, 0))
            FROM auditoria_integracao."Estoque_DRP" e2
            WHERE e2.cod_produto = p.cod_produto
            AND e2.cod_filial != '03'
          ), 0) as estoque_disponivel_grupo
        FROM auditoria_integracao.auditoria_produtos_drp p
        LEFT JOIN auditoria_integracao."Estoque_DRP" e ON p.cod_produto = e.cod_produto
        LEFT JOIN auditoria_integracao."Grupo" g ON p.cod_grupo = g.codgrupo
        LEFT JOIN auditoria_integracao."Produtos_Combinado_DRP" cp ON p.cod_produto = cp.cod_produto
        ${whereClause}
        AND LENGTH(TRIM(p.descricao)) > 1
        GROUP BY p.cod_produto, p.descricao, p.referencia_fabricante, p.codigo_barras, p.cod_grupo, 
                 p.cod_fabricante, p.cod_fornecedor_principal, p.ativo, 
                 p.produto_bloqueado, g.descricao, cp.cod_grupo
        ORDER BY p.cod_produto
        LIMIT ${limitNum} OFFSET ${offset}
      `

      const [countResult, produtosResult] = await Promise.all([
        poolAuditoria.query(countQuery, params),
        poolAuditoria.query(dataQuery, params)
      ])

      const produtos = produtosResult.rows

      const total = Number(countResult.rows[0]?.total || 0)
      const totalPages = Math.ceil(total / limitNum)

      return {
        success: true,
        data: produtos,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar produtos'
      })
    }
  })

  fastify.get('/grupos', async (request, reply) => {
    try {
      const gruposResult = await poolAuditoria.query(`
        SELECT codgrupo as cod_grupo, descricao
        FROM auditoria_integracao."Grupo"
        ORDER BY descricao
      `)
      const grupos = gruposResult.rows

      return {
        success: true,
        data: grupos
      }
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar grupos'
      })
    }
  })

  // Rota para busca rápida de produtos (autocomplete)
  fastify.get('/produtos/buscar', async (request, reply) => {
    try {
      const { q, filial_origem } = request.query as { q?: string; filial_origem?: string }
      
      if (!q || q.length < 2) {
        return {
          success: true,
          data: []
        }
      }

      // Usar filial origem informada ou CD como padrão
      const filialEstoque = filial_origem || '04'

      const produtosResult = await poolAuditoria.query(`
        SELECT 
          p.cod_produto,
          p.descricao,
          p.referencia_fabricante,
          COALESCE(g.descricao, 'Sem Grupo') as grupo_descricao,
          COALESCE((
            SELECT SUM(e.estoque)
            FROM auditoria_integracao."Estoque_DRP" e
            WHERE e.cod_produto = p.cod_produto
            AND e.cod_filial = $2
          ), 0) as estoque_cd
        FROM auditoria_integracao.auditoria_produtos_drp p
        LEFT JOIN auditoria_integracao."Grupo" g ON p.cod_grupo = g.codgrupo
        WHERE p.ativo = 'S'
          AND (
            p.cod_produto ILIKE $1
            OR p.descricao ILIKE $1
            OR p.referencia_fabricante ILIKE $1
          )
        ORDER BY p.cod_produto
      `, [`%${q}%`, filialEstoque])

      return {
        success: true,
        data: produtosResult.rows
      }
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar produtos'
      })
    }
  })

  fastify.get('/filiais', async () => {
    return {
      success: true,
      data: [
        { cod_filial: '00', nome: 'Petrolina' },
        { cod_filial: '01', nome: 'Juazeiro' },
        { cod_filial: '02', nome: 'Salgueiro' },
        { cod_filial: '03', nome: 'Garantia' },
        { cod_filial: '04', nome: 'CD' },
        { cod_filial: '05', nome: 'Bonfim' },
        { cod_filial: '06', nome: 'Picos' },
      ]
    }
  })

  // Endpoint para detalhes completos do produto
  fastify.get<{
    Params: { cod_produto: string }
    Querystring: { periodo_dias?: string }
  }>('/produtos/:cod_produto/detalhes', async (request, reply) => {
    try {
      const { cod_produto } = request.params
      const periodo_dias = request.query.periodo_dias || '30'

      // 1. Buscar informações básicas do produto
      const produtoResult = await poolAuditoria.query(`
        SELECT 
          p.cod_produto,
          p.descricao,
          p.codigo_barras,
          p.cod_grupo,
          COALESCE(g.descricao, 'Sem Grupo') as grupo_descricao,
          COALESCE(p.referencia_fabricante, '-') as referencia_fabricante,
          p.ativo
        FROM auditoria_integracao.auditoria_produtos_drp p
        LEFT JOIN auditoria_integracao."Grupo" g ON p.cod_grupo = g.codgrupo
        WHERE p.cod_produto = $1
      `, [cod_produto])

      const produto = produtoResult.rows

      if (!produto || produto.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Produto não encontrado'
        })
      }

      // 2. Verificar se faz parte de algum grupo combinado
      const combinadoResult = await poolAuditoria.query(`
        SELECT 
          cp.cod_grupo,
          (SELECT COUNT(*) FROM auditoria_integracao."Produtos_Combinado_DRP" WHERE cod_grupo = cp.cod_grupo) as qtd_produtos
        FROM auditoria_integracao."Produtos_Combinado_DRP" cp
        WHERE cp.cod_produto = $1
      `, [cod_produto])

      const combinado = combinadoResult.rows

      // 3. Buscar estoque por filial
      const estoquesResult = await poolAuditoria.query(`
        SELECT 
          e.cod_filial,
          COALESCE(e.estoque, 0) as estoque,
          COALESCE(e.quantidade_bloqueada, 0) as quantidade_bloqueada,
          COALESCE(e.estoque, 0) - COALESCE(e.quantidade_bloqueada, 0) as estoque_disponivel,
          COALESCE(e.estoque_minimo, 0) as estoque_minimo,
          COALESCE(e.preco_custo, 0) as preco_custo,
          COALESCE(e.preco_medio, 0) as preco_medio
        FROM auditoria_integracao."Estoque_DRP" e
        WHERE e.cod_produto = $1
        ORDER BY e.cod_filial
      `, [cod_produto])

      const estoques = estoquesResult.rows

      // 4. Buscar vendas por filial (últimos X dias) - BANCO AUDITORIA
      // Apenas Vendas (tipo_movimento = '55')
      const vendasPorFilialResult = await poolAuditoria.query(`
        SELECT 
          cod_filial,
          COALESCE(SUM(quantidade), 0) as total_vendas
        FROM auditoria_integracao."Movimentacao_DRP"
        WHERE cod_produto = $1
          AND tipo_movimento = '55'
          AND data_movimento >= CURRENT_DATE - INTERVAL '1 day' * $2
          AND cod_filial != '03'
        GROUP BY cod_filial
        ORDER BY cod_filial
      `, [cod_produto, periodo_dias])
      
      const vendasPorFilial = vendasPorFilialResult.rows.map(row => ({
        cod_filial: row.cod_filial,
        total_vendas: row.total_vendas.toString()
      }))

      // 5. Buscar vendas totais (histórico mensal dos últimos 12 meses) - BANCO AUDITORIA
      // Apenas Vendas (tipo_movimento = '55') - excluindo trocas/devoluções
      const historicoVendasResult = await poolAuditoria.query(`
        SELECT 
          EXTRACT(MONTH FROM data_movimento) as mes,
          EXTRACT(YEAR FROM data_movimento) as ano,
          COALESCE(SUM(quantidade), 0) as total
        FROM auditoria_integracao."Movimentacao_DRP"
        WHERE cod_produto = $1
          AND tipo_movimento = '55'
          AND data_movimento >= CURRENT_DATE - INTERVAL '12 months'
          AND cod_filial != '03'
        GROUP BY EXTRACT(YEAR FROM data_movimento), EXTRACT(MONTH FROM data_movimento)
        ORDER BY ano DESC, mes DESC
      `, [cod_produto])
      
      const historicoVendas = historicoVendasResult.rows.map(row => ({
        mes: row.mes.toString(),
        ano: row.ano.toString(),
        total: row.total.toString()
      }))

      // 6. Buscar histórico de entradas (últimos 12 meses) - BANCO AUDITORIA
      // Apenas Entrada NF (tipo_movimento = '01') = Compras de fornecedores
      const historicoEntradasResult = await poolAuditoria.query(`
        SELECT 
          EXTRACT(MONTH FROM data_movimento) as mes,
          EXTRACT(YEAR FROM data_movimento) as ano,
          COALESCE(SUM(quantidade), 0) as total
        FROM auditoria_integracao."Movimentacao_DRP"
        WHERE cod_produto = $1
          AND tipo_movimento = '01'
          AND data_movimento >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY EXTRACT(YEAR FROM data_movimento), EXTRACT(MONTH FROM data_movimento)
        ORDER BY ano DESC, mes DESC
      `, [cod_produto])
      
      const historicoEntradas = historicoEntradasResult.rows.map(row => ({
        mes: row.mes.toString(),
        ano: row.ano.toString(),
        total: row.total.toString()
      }))

      // 7. Calcular médias de vendas (3, 6 e 12 meses) - BANCO AUDITORIA
      // Apenas Vendas (tipo_movimento = '55')
      const mediaVendasResult = await poolAuditoria.query(`
        SELECT 
          COALESCE(AVG(CASE WHEN data_movimento >= CURRENT_DATE - INTERVAL '3 months' THEN quantidade END), 0) as media_3_meses,
          COALESCE(AVG(CASE WHEN data_movimento >= CURRENT_DATE - INTERVAL '6 months' THEN quantidade END), 0) as media_6_meses,
          COALESCE(AVG(quantidade), 0) as media_12_meses
        FROM auditoria_integracao."Movimentacao_DRP"
        WHERE cod_produto = $1
          AND tipo_movimento = '55'
          AND data_movimento >= CURRENT_DATE - INTERVAL '12 months'
          AND cod_filial != '03'
      `, [cod_produto])
      
      const mediaVendas = mediaVendasResult.rows.map(row => ({
        media_3_meses: row.media_3_meses.toString(),
        media_6_meses: row.media_6_meses.toString(),
        media_12_meses: row.media_12_meses.toString()
      }))

      // Calcular totais
      const estoqueTotal = estoques.reduce((acc, e) => acc + parseFloat(e.estoque), 0)
      const estoqueDisponivel = estoques.reduce((acc, e) => acc + parseFloat(e.estoque_disponivel), 0)

      return reply.send({
        success: true,
        data: {
          produto: produto[0],
          combinado: combinado.length > 0 ? {
            cod_grupo: combinado[0].cod_grupo,
            qtd_produtos: parseInt(combinado[0].qtd_produtos)
          } : null,
          estoques: estoques.map(e => ({
            cod_filial: e.cod_filial,
            estoque: parseFloat(e.estoque),
            estoque_minimo: parseFloat(e.estoque_minimo),
            preco_custo: parseFloat(e.preco_custo),
            preco_medio: parseFloat(e.preco_medio)
          })),
          vendas: vendasPorFilial.map(v => ({
            cod_filial: v.cod_filial,
            total_vendas: parseFloat(v.total_vendas)
          })),
          historico_vendas: historicoVendas.map(h => ({
            mes: parseInt(h.mes),
            ano: parseInt(h.ano),
            total: parseFloat(h.total)
          })),
          historico_entradas: historicoEntradas.map(h => ({
            mes: parseInt(h.mes),
            ano: parseInt(h.ano),
            total: parseFloat(h.total)
          })),
          estatisticas: {
            estoque_total: estoqueTotal,
            estoque_disponivel: estoqueDisponivel,
            media_vendas_3_meses: mediaVendas.length > 0 ? parseFloat(mediaVendas[0].media_3_meses) : 0,
            media_vendas_6_meses: mediaVendas.length > 0 ? parseFloat(mediaVendas[0].media_6_meses) : 0,
            media_vendas_12_meses: mediaVendas.length > 0 ? parseFloat(mediaVendas[0].media_12_meses) : 0
          }
        }
      })
    } catch (error) {
      console.error('Erro ao buscar detalhes do produto:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar detalhes do produto'
      })
    }
  })
}