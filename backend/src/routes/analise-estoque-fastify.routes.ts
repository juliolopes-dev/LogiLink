import { FastifyInstance } from 'fastify'
import { Pool } from 'pg'

export async function analiseEstoqueRoutes(fastify: FastifyInstance) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  })

  // GET /api/analise-estoque - Lista análise de estoque com filtros
  fastify.get('/analise-estoque', async (request, reply) => {
    try {
      const { 
        status, 
        filial, 
        limite = '50', 
        pagina = '1',
        ordenar = 'quantidade_comprar',
        direcao = 'DESC'
      } = request.query as any

      let query = `
        SELECT 
          cod_produto,
          cod_filial,
          nome_filial,
          estoque_atual,
          vendas_30_dias,
          demanda_diaria,
          cobertura_dias_atual,
          cobertura_desejada_dias,
          estoque_ideal,
          estoque_cobertura_maxima,
          quantidade_comprar,
          status_estoque,
          recomendacao
        FROM public.vw_analise_estoque_cobertura
        WHERE demanda_diaria > 0
      `

      const params: any[] = []
      let paramIndex = 1

      if (status) {
        query += ` AND status_estoque = $${paramIndex}`
        params.push(status)
        paramIndex++
      }

      if (filial) {
        query += ` AND cod_filial = $${paramIndex}`
        params.push(filial)
        paramIndex++
      }

      query += ` ORDER BY ${ordenar} ${direcao}`
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
      params.push(parseInt(limite))
      params.push((parseInt(pagina) - 1) * parseInt(limite))

      const resultado = await pool.query(query, params)

      // Contar total
      let countQuery = `
        SELECT COUNT(*) as total
        FROM public.vw_analise_estoque_cobertura
        WHERE demanda_diaria > 0
      `
      const countParams: any[] = []
      let countParamIndex = 1

      if (status) {
        countQuery += ` AND status_estoque = $${countParamIndex}`
        countParams.push(status)
        countParamIndex++
      }

      if (filial) {
        countQuery += ` AND cod_filial = $${countParamIndex}`
        countParams.push(filial)
      }

      const countResult = await pool.query(countQuery, countParams)
      const total = parseInt(countResult.rows[0].total)

      return {
        success: true,
        data: resultado.rows,
        pagination: {
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          total,
          totalPaginas: Math.ceil(total / parseInt(limite))
        }
      }
    } catch (error) {
      fastify.log.error(error)
      reply.status(500)
      return {
        success: false,
        error: 'Erro ao buscar análise de estoque'
      }
    }
  })

  // GET /api/analise-estoque/produto/:codigo - Análise de um produto específico
  fastify.get('/analise-estoque/produto/:codigo', async (request, reply) => {
    try {
      const { codigo } = request.params as any
      const { filial } = request.query as any

      let query = `
        SELECT *
        FROM public.vw_analise_estoque_cobertura
        WHERE cod_produto = $1
      `

      const params: any[] = [codigo]

      if (filial) {
        query += ` AND cod_filial = $2`
        params.push(filial)
      }

      const resultado = await pool.query(query, params)

      if (resultado.rows.length === 0) {
        reply.status(404)
        return {
          success: false,
          error: 'Produto não encontrado'
        }
      }

      return {
        success: true,
        data: resultado.rows
      }
    } catch (error) {
      fastify.log.error(error)
      reply.status(500)
      return {
        success: false,
        error: 'Erro ao buscar produto'
      }
    }
  })

  // GET /api/analise-estoque/estatisticas - Estatísticas gerais
  fastify.get('/analise-estoque/estatisticas', async (request, reply) => {
    try {
      const { filial } = request.query as any

      let query = `
        SELECT 
          COUNT(*) as total_produtos,
          COUNT(CASE WHEN status_estoque = 'EXCESSO_CRITICO' THEN 1 END) as excesso_critico,
          COUNT(CASE WHEN status_estoque = 'EXCESSO_ALERTA' THEN 1 END) as excesso_alerta,
          COUNT(CASE WHEN status_estoque = 'NORMAL' THEN 1 END) as normal,
          COUNT(CASE WHEN status_estoque = 'RUPTURA_ALERTA' THEN 1 END) as ruptura_alerta,
          COUNT(CASE WHEN status_estoque = 'RUPTURA_CRITICO' THEN 1 END) as ruptura_critico,
          SUM(quantidade_comprar) as total_comprar,
          SUM(estoque_atual) as estoque_total_atual,
          SUM(estoque_cobertura_maxima) as estoque_total_ideal
        FROM public.vw_analise_estoque_cobertura
        WHERE demanda_diaria > 0
      `

      const params: any[] = []

      if (filial) {
        query += ` AND cod_filial = $1`
        params.push(filial)
      }

      const resultado = await pool.query(query, params)

      return {
        success: true,
        data: resultado.rows[0]
      }
    } catch (error) {
      fastify.log.error(error)
      reply.status(500)
      return {
        success: false,
        error: 'Erro ao buscar estatísticas'
      }
    }
  })

  // GET /api/analise-estoque/top-comprar - Top produtos para comprar
  fastify.get('/analise-estoque/top-comprar', async (request, reply) => {
    try {
      const { filial, limite = '20' } = request.query as any

      let query = `
        SELECT 
          cod_produto,
          cod_filial,
          nome_filial,
          estoque_atual,
          demanda_diaria,
          cobertura_dias_atual,
          quantidade_comprar,
          status_estoque
        FROM public.vw_analise_estoque_cobertura
        WHERE quantidade_comprar > 0
      `

      const params: any[] = []

      if (filial) {
        query += ` AND cod_filial = $1`
        params.push(filial)
        query += ` ORDER BY quantidade_comprar DESC LIMIT $2`
        params.push(parseInt(limite))
      } else {
        query += ` ORDER BY quantidade_comprar DESC LIMIT $1`
        params.push(parseInt(limite))
      }

      const resultado = await pool.query(query, params)

      return {
        success: true,
        data: resultado.rows
      }
    } catch (error) {
      fastify.log.error(error)
      reply.status(500)
      return {
        success: false,
        error: 'Erro ao buscar top produtos'
      }
    }
  })

  // GET /api/regras-estoque - Listar regras
  fastify.get('/regras-estoque', async (request, reply) => {
    try {
      const resultado = await pool.query(`
        SELECT *
        FROM public.config_regras_estoque
        ORDER BY aplicar_global DESC, id DESC
      `)

      return {
        success: true,
        data: resultado.rows
      }
    } catch (error) {
      fastify.log.error(error)
      reply.status(500)
      return {
        success: false,
        error: 'Erro ao listar regras'
      }
    }
  })

  // PUT /api/regras-estoque/:id - Atualizar regra
  fastify.put('/regras-estoque/:id', async (request, reply) => {
    try {
      const { id } = request.params as any
      const body = request.body as any

      const resultado = await pool.query(`
        UPDATE public.config_regras_estoque
        SET 
          lead_time_dias = $1,
          estoque_seguranca_dias = $2,
          cobertura_maxima_dias = $3,
          descricao = $4,
          usuario_atualizacao = $5,
          data_atualizacao = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [
        body.lead_time_dias,
        body.estoque_seguranca_dias,
        body.cobertura_maxima_dias,
        body.descricao,
        body.usuario_atualizacao || 'SISTEMA',
        id
      ])

      if (resultado.rows.length === 0) {
        reply.status(404)
        return {
          success: false,
          error: 'Regra não encontrada'
        }
      }

      return {
        success: true,
        data: resultado.rows[0]
      }
    } catch (error) {
      fastify.log.error(error)
      reply.status(500)
      return {
        success: false,
        error: 'Erro ao atualizar regra'
      }
    }
  })
}
