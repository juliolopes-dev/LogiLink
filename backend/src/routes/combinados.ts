import { FastifyInstance } from 'fastify'
import poolAuditoria from '../lib/database-auditoria.js'

export async function combinadosRoutes(fastify: FastifyInstance) {
  
  // Gerar próximo código de grupo
  fastify.get('/combinados/proximo-codigo', async (request, reply) => {
    try {
      const result = await poolAuditoria.query(`
        SELECT cod_grupo
        FROM auditoria_integracao."Grupo_Combinado_DRP"
        WHERE cod_grupo ~ '^SYSCOMB[0-9]+$'
        ORDER BY CAST(SUBSTRING(cod_grupo FROM 8) AS INTEGER) DESC
        LIMIT 1
      `)

      let proximoCodigo = 'SYSCOMB1'
      
      if (result.rows.length > 0) {
        const ultimoCodigo = result.rows[0].cod_grupo
        const numero = parseInt(ultimoCodigo.replace('SYSCOMB', ''))
        proximoCodigo = `SYSCOMB${numero + 1}`
      }

      return reply.send({
        success: true,
        proximo_codigo: proximoCodigo
      })
    } catch (error) {
      console.error('Erro ao gerar próximo código:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao gerar próximo código'
      })
    }
  })

  // Listar todos os grupos combinados
  fastify.get('/combinados', async (request, reply) => {
    try {
      const { ativo, page = '1', limit = '50', busca } = request.query as { 
        ativo?: string
        page?: string
        limit?: string
        busca?: string
      }

      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)
      const offset = (pageNum - 1) * limitNum

      let whereConditions: string[] = []
      const params: any[] = []
      let paramIndex = 1

      if (ativo === 'true') {
        whereConditions.push(`g.ativo = true`)
      } else if (ativo === 'false') {
        whereConditions.push(`g.ativo = false`)
      }

      if (busca && busca.trim()) {
        whereConditions.push(`(g.cod_grupo ILIKE $${paramIndex} OR g.descricao ILIKE $${paramIndex})`)
        params.push(`%${busca.trim()}%`)
        paramIndex++
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

      // Contar total de registros
      const countQuery = `
        SELECT COUNT(DISTINCT g.id) as total
        FROM auditoria_integracao."Grupo_Combinado_DRP" g
        ${whereClause}
      `
      const countResult = await poolAuditoria.query(countQuery, params)
      const total = parseInt(countResult.rows[0].total)

      // Buscar registros paginados
      const dataQuery = `
        SELECT 
          g.id,
          g.cod_grupo,
          g.descricao,
          g.ativo,
          g.observacao,
          g.created_at,
          g.updated_at,
          COUNT(p.cod_produto) as total_produtos
        FROM auditoria_integracao."Grupo_Combinado_DRP" g
        LEFT JOIN auditoria_integracao."Produtos_Combinado_DRP" p ON g.cod_grupo = p.cod_grupo
        ${whereClause}
        GROUP BY g.id, g.cod_grupo, g.descricao, g.ativo, g.observacao, g.created_at, g.updated_at
        ORDER BY g.descricao
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `
      params.push(limitNum, offset)

      const result = await poolAuditoria.query(dataQuery, params)

      return reply.send({
        success: true,
        data: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total,
          totalPages: Math.ceil(total / limitNum)
        }
      })
    } catch (error) {
      console.error('Erro ao listar grupos combinados:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao listar grupos combinados'
      })
    }
  })

  // Buscar um grupo combinado específico
  fastify.get('/combinados/:cod_grupo', async (request, reply) => {
    try {
      const { cod_grupo } = request.params as { cod_grupo: string }

      const grupoResult = await poolAuditoria.query(`
        SELECT 
          g.id,
          g.cod_grupo,
          g.descricao,
          g.ativo,
          g.observacao,
          g.created_at,
          g.updated_at,
          COUNT(p.cod_produto) as total_produtos
        FROM auditoria_integracao."Grupo_Combinado_DRP" g
        LEFT JOIN auditoria_integracao."Produtos_Combinado_DRP" p ON g.cod_grupo = p.cod_grupo
        WHERE g.cod_grupo = $1
        GROUP BY g.id, g.cod_grupo, g.descricao, g.ativo, g.observacao, g.created_at, g.updated_at
      `, [cod_grupo])

      if (grupoResult.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Grupo combinado não encontrado'
        })
      }

      return reply.send({
        success: true,
        data: grupoResult.rows[0]
      })
    } catch (error) {
      console.error('Erro ao buscar grupo combinado:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar grupo combinado'
      })
    }
  })

  // Criar novo grupo combinado
  fastify.post('/combinados', async (request, reply) => {
    try {
      const { cod_grupo, descricao, observacao } = request.body as {
        cod_grupo: string
        descricao: string
        observacao?: string
      }

      if (!cod_grupo || !descricao) {
        return reply.status(400).send({
          success: false,
          error: 'Código e descrição são obrigatórios'
        })
      }

      const result = await poolAuditoria.query(`
        INSERT INTO auditoria_integracao."Grupo_Combinado_DRP" 
          (cod_grupo, descricao, ativo, observacao, created_at, updated_at)
        VALUES ($1, $2, true, $3, NOW(), NOW())
        RETURNING *
      `, [cod_grupo, descricao, observacao || null])

      return reply.status(201).send({
        success: true,
        data: result.rows[0]
      })
    } catch (error: any) {
      console.error('Erro ao criar grupo combinado:', error)
      
      if (error.code === '23505') {
        return reply.status(409).send({
          success: false,
          error: 'Já existe um grupo com este código'
        })
      }

      return reply.status(500).send({
        success: false,
        error: 'Erro ao criar grupo combinado'
      })
    }
  })

  // Atualizar grupo combinado
  fastify.put('/combinados/:cod_grupo', async (request, reply) => {
    try {
      const { cod_grupo } = request.params as { cod_grupo: string }
      const { descricao, ativo, observacao } = request.body as {
        descricao?: string
        ativo?: boolean
        observacao?: string
      }

      const updates: string[] = []
      const values: any[] = []
      let paramIndex = 1

      if (descricao !== undefined) {
        updates.push(`descricao = $${paramIndex++}`)
        values.push(descricao)
      }

      if (ativo !== undefined) {
        updates.push(`ativo = $${paramIndex++}`)
        values.push(ativo)
      }

      if (observacao !== undefined) {
        updates.push(`observacao = $${paramIndex++}`)
        values.push(observacao)
      }

      if (updates.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Nenhum campo para atualizar'
        })
      }

      updates.push(`updated_at = NOW()`)
      values.push(cod_grupo)

      const result = await poolAuditoria.query(`
        UPDATE auditoria_integracao."Grupo_Combinado_DRP"
        SET ${updates.join(', ')}
        WHERE cod_grupo = $${paramIndex}
        RETURNING *
      `, values)

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Grupo combinado não encontrado'
        })
      }

      return reply.send({
        success: true,
        data: result.rows[0]
      })
    } catch (error) {
      console.error('Erro ao atualizar grupo combinado:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao atualizar grupo combinado'
      })
    }
  })

  // Deletar grupo combinado
  fastify.delete('/combinados/:cod_grupo', async (request, reply) => {
    try {
      const { cod_grupo } = request.params as { cod_grupo: string }

      await poolAuditoria.query('BEGIN')

      await poolAuditoria.query(`
        DELETE FROM auditoria_integracao."Produtos_Combinado_DRP"
        WHERE cod_grupo = $1
      `, [cod_grupo])

      const result = await poolAuditoria.query(`
        DELETE FROM auditoria_integracao."Grupo_Combinado_DRP"
        WHERE cod_grupo = $1
        RETURNING *
      `, [cod_grupo])

      await poolAuditoria.query('COMMIT')

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Grupo combinado não encontrado'
        })
      }

      return reply.send({
        success: true,
        message: 'Grupo combinado deletado com sucesso'
      })
    } catch (error) {
      await poolAuditoria.query('ROLLBACK')
      console.error('Erro ao deletar grupo combinado:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao deletar grupo combinado'
      })
    }
  })

  // Buscar produtos de um grupo combinado
  fastify.get('/combinados/:cod_grupo/produtos', async (request, reply) => {
    try {
      const { cod_grupo } = request.params as { cod_grupo: string }

      const produtosResult = await poolAuditoria.query(`
        SELECT 
          p.cod_produto,
          p.descricao,
          COALESCE(p.referencia_fabricante, '-') as referencia_fabricante,
          COALESCE((
            SELECT SUM(e.estoque)
            FROM auditoria_integracao."Estoque_DRP" e
            WHERE e.cod_produto = p.cod_produto
            AND e.cod_filial != '03'
          ), 0) as estoque_total,
          COALESCE((
            SELECT SUM(e.estoque - COALESCE(e.quantidade_bloqueada, 0))
            FROM auditoria_integracao."Estoque_DRP" e
            WHERE e.cod_produto = p.cod_produto
            AND e.cod_filial != '03'
          ), 0) as estoque_disponivel
        FROM auditoria_integracao."Produtos_Combinado_DRP" cp
        INNER JOIN auditoria_integracao.auditoria_produtos_drp p ON cp.cod_produto = p.cod_produto
        WHERE cp.cod_grupo = $1
        ORDER BY p.descricao
      `, [cod_grupo])

      return reply.send({
        success: true,
        data: produtosResult.rows
      })
    } catch (error) {
      console.error('Erro ao buscar produtos do combinado:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar produtos do combinado'
      })
    }
  })

  // Adicionar produto ao grupo combinado
  fastify.post('/combinados/:cod_grupo/produtos', async (request, reply) => {
    try {
      const { cod_grupo } = request.params as { cod_grupo: string }
      const { cod_produto, ordem } = request.body as {
        cod_produto: string
        ordem?: number
      }

      if (!cod_produto) {
        return reply.status(400).send({
          success: false,
          error: 'Código do produto é obrigatório'
        })
      }

      // Verificar se o grupo existe
      const grupoExists = await poolAuditoria.query(`
        SELECT cod_grupo FROM auditoria_integracao."Grupo_Combinado_DRP"
        WHERE cod_grupo = $1
      `, [cod_grupo])

      if (grupoExists.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Grupo combinado não encontrado'
        })
      }

      // Verificar se o produto existe
      const produtoExists = await poolAuditoria.query(`
        SELECT cod_produto FROM auditoria_integracao.auditoria_produtos_drp
        WHERE cod_produto = $1
      `, [cod_produto])

      if (produtoExists.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Produto não encontrado'
        })
      }

      const result = await poolAuditoria.query(`
        INSERT INTO auditoria_integracao."Produtos_Combinado_DRP"
          (cod_grupo, cod_produto, ordem, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING *
      `, [cod_grupo, cod_produto, ordem || null])

      return reply.status(201).send({
        success: true,
        data: result.rows[0]
      })
    } catch (error: any) {
      console.error('Erro ao adicionar produto ao combinado:', error)
      
      if (error.code === '23505') {
        return reply.status(409).send({
          success: false,
          error: 'Produto já está neste grupo combinado'
        })
      }

      return reply.status(500).send({
        success: false,
        error: 'Erro ao adicionar produto ao combinado'
      })
    }
  })

  // Remover produto do grupo combinado
  fastify.delete('/combinados/:cod_grupo/produtos/:cod_produto', async (request, reply) => {
    try {
      const { cod_grupo, cod_produto } = request.params as { 
        cod_grupo: string
        cod_produto: string 
      }

      const result = await poolAuditoria.query(`
        DELETE FROM auditoria_integracao."Produtos_Combinado_DRP"
        WHERE cod_grupo = $1 AND cod_produto = $2
        RETURNING *
      `, [cod_grupo, cod_produto])

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Produto não encontrado neste grupo'
        })
      }

      return reply.send({
        success: true,
        message: 'Produto removido do grupo com sucesso'
      })
    } catch (error) {
      console.error('Erro ao remover produto do combinado:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao remover produto do combinado'
      })
    }
  })

  // Buscar produtos disponíveis para adicionar (que não estão no grupo)
  fastify.get('/combinados/:cod_grupo/produtos-disponiveis', async (request, reply) => {
    try {
      const { cod_grupo } = request.params as { cod_grupo: string }
      const { busca } = request.query as { busca?: string }

      let query = `
        SELECT 
          p.cod_produto,
          p.descricao,
          COALESCE(p.referencia_fabricante, '-') as referencia_fabricante,
          COALESCE((
            SELECT SUM(e.estoque - COALESCE(e.quantidade_bloqueada, 0))
            FROM auditoria_integracao."Estoque_DRP" e
            WHERE e.cod_produto = p.cod_produto
            AND e.cod_filial != '03'
          ), 0) as estoque_disponivel,
          COALESCE(
            ARRAY_AGG(DISTINCT pc.cod_grupo) FILTER (WHERE pc.cod_grupo IS NOT NULL),
            ARRAY[]::text[]
          ) as grupos_existentes
        FROM auditoria_integracao.auditoria_produtos_drp p
        LEFT JOIN auditoria_integracao."Produtos_Combinado_DRP" pc ON pc.cod_produto = p.cod_produto
        WHERE p.cod_produto NOT IN (
          SELECT cod_produto 
          FROM auditoria_integracao."Produtos_Combinado_DRP"
          WHERE cod_grupo = $1
        )
      `

      const params: any[] = [cod_grupo]

      if (busca && busca.trim()) {
        query += ` AND (
          p.cod_produto ILIKE $2 
          OR p.descricao ILIKE $2
          OR p.referencia_fabricante ILIKE $2
        )`
        params.push(`%${busca.trim()}%`)
      }

      query += `
        GROUP BY p.cod_produto, p.descricao, p.referencia_fabricante
        ORDER BY p.descricao
        LIMIT 50`

      const result = await poolAuditoria.query(query, params)

      return reply.send({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('Erro ao buscar produtos disponíveis:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar produtos disponíveis'
      })
    }
  })

  // Buscar produtos por código ou referência e mostrar seus grupos
  fastify.get('/combinados/buscar-produto', async (request, reply) => {
    try {
      const { busca } = request.query as { busca?: string }

      if (!busca || busca.trim().length < 2) {
        return reply.send({
          success: true,
          data: []
        })
      }

      const query = `
        SELECT 
          p.cod_produto,
          p.descricao,
          COALESCE(p.referencia_fabricante, '-') as referencia_fabricante,
          COALESCE(
            ARRAY_AGG(
              DISTINCT jsonb_build_object(
                'cod_grupo', g.cod_grupo,
                'descricao', g.descricao,
                'ativo', g.ativo
              )
            ) FILTER (WHERE g.cod_grupo IS NOT NULL),
            ARRAY[]::jsonb[]
          ) as grupos
        FROM auditoria_integracao.auditoria_produtos_drp p
        LEFT JOIN auditoria_integracao."Produtos_Combinado_DRP" pc ON pc.cod_produto = p.cod_produto
        LEFT JOIN auditoria_integracao."Grupo_Combinado_DRP" g ON g.cod_grupo = pc.cod_grupo
        WHERE 
          p.cod_produto ILIKE $1
          OR p.referencia_fabricante ILIKE $1
          OR p.descricao ILIKE $1
        GROUP BY p.cod_produto, p.descricao, p.referencia_fabricante
        ORDER BY p.cod_produto
        LIMIT 20
      `

      const result = await poolAuditoria.query(query, [`%${busca}%`])

      return reply.send({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('Erro ao buscar produto:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar produto'
      })
    }
  })

  // GET /combinados/:cod_grupo/analise-vendas - Análise de vendas dos produtos combinados por filial
  fastify.get('/combinados/:cod_grupo/analise-vendas', async (request, reply) => {
    try {
      const { cod_grupo } = request.params as { cod_grupo: string }
      const { periodo = '30' } = request.query as { periodo?: string }

      const query = `
        WITH produtos_grupo AS (
          SELECT 
            pc.cod_produto,
            p.descricao,
            pc.ordem
          FROM auditoria_integracao."Produtos_Combinado_DRP" pc
          INNER JOIN auditoria_integracao.auditoria_produtos_drp p 
            ON pc.cod_produto = p.cod_produto
          WHERE pc.cod_grupo = $1
          ORDER BY pc.ordem
        ),
        vendas_produtos AS (
          SELECT 
            m.cod_produto,
            m.cod_filial,
            SUM(m.quantidade) as total_vendas,
            SUM(m.quantidade * m.valor_venda) as valor_total
          FROM auditoria_integracao."Movimentacao_DRP" m
          INNER JOIN produtos_grupo pg ON m.cod_produto = pg.cod_produto
          WHERE 
            m.tipo_movimento = '55'
            AND m.data_movimento >= CURRENT_DATE - INTERVAL '${periodo} days'
          GROUP BY m.cod_produto, m.cod_filial
        )
        SELECT 
          pg.cod_produto,
          pg.descricao,
          pg.ordem,
          COALESCE(
            json_agg(
              json_build_object(
                'cod_filial', vp.cod_filial,
                'total_vendas', vp.total_vendas,
                'valor_total', vp.valor_total
              ) ORDER BY vp.cod_filial
            ) FILTER (WHERE vp.cod_filial IS NOT NULL),
            '[]'::json
          ) as vendas_por_filial
        FROM produtos_grupo pg
        LEFT JOIN vendas_produtos vp ON pg.cod_produto = vp.cod_produto
        GROUP BY pg.cod_produto, pg.descricao, pg.ordem
        ORDER BY pg.ordem
      `

      const result = await poolAuditoria.query(query, [cod_grupo])

      return reply.send({
        success: true,
        data: result.rows,
        periodo: parseInt(periodo)
      })
    } catch (error) {
      console.error('Erro ao buscar análise de vendas:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar análise de vendas'
      })
    }
  })
}
