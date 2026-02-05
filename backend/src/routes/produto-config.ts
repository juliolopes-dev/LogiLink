import { FastifyInstance } from 'fastify'
import poolAuditoria from '../lib/database-auditoria'

export default async function produtoConfigRoutes(fastify: FastifyInstance) {
  
  // Listar configurações de produtos com filtros
  fastify.get('/produto-config', async (request, reply) => {
    try {
      const { q, ativo } = request.query as { q?: string; ativo?: string }
      
      let whereClause = 'WHERE 1=1'
      const params: any[] = []
      
      if (q && q.length >= 2) {
        params.push(`%${q}%`)
        whereClause += ` AND (c.cod_produto ILIKE $${params.length} OR p.descricao ILIKE $${params.length})`
      }
      
      if (ativo !== undefined) {
        params.push(ativo === 'true')
        whereClause += ` AND c.ativo = $${params.length}`
      }

      const result = await poolAuditoria.query(`
        SELECT 
          c.cod_produto,
          p.descricao,
          p.referencia_fabricante,
          COALESCE(g.descricao, 'Sem Grupo') as grupo,
          c.multiplo_venda,
          c.observacao,
          c.ativo,
          c.created_at,
          c.updated_at
        FROM auditoria_integracao."Produto_Config_DRP" c
        INNER JOIN auditoria_integracao.auditoria_produtos_drp p ON c.cod_produto = p.cod_produto
        LEFT JOIN auditoria_integracao."Grupo" g ON p.cod_grupo = g.codgrupo
        ${whereClause}
        ORDER BY c.updated_at DESC
        LIMIT 100
      `, params)

      return {
        success: true,
        data: result.rows
      }
    } catch (error) {
      console.error('Erro ao listar configurações:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao listar configurações'
      })
    }
  })

  // Buscar configuração de um produto específico
  fastify.get('/produto-config/:cod_produto', async (request, reply) => {
    try {
      const { cod_produto } = request.params as { cod_produto: string }

      const result = await poolAuditoria.query(`
        SELECT 
          c.cod_produto,
          p.descricao,
          p.referencia_fabricante,
          COALESCE(g.descricao, 'Sem Grupo') as grupo,
          c.multiplo_venda,
          c.observacao,
          c.ativo,
          c.created_at,
          c.updated_at
        FROM auditoria_integracao."Produto_Config_DRP" c
        INNER JOIN auditoria_integracao.auditoria_produtos_drp p ON c.cod_produto = p.cod_produto
        LEFT JOIN auditoria_integracao."Grupo" g ON p.cod_grupo = g.codgrupo
        WHERE c.cod_produto = $1
      `, [cod_produto])

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Configuração não encontrada'
        })
      }

      return {
        success: true,
        data: result.rows[0]
      }
    } catch (error) {
      console.error('Erro ao buscar configuração:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar configuração'
      })
    }
  })

  // Criar ou atualizar configuração de produto
  fastify.post('/produto-config', async (request, reply) => {
    try {
      const { cod_produto, multiplo_venda, observacao, ativo } = request.body as {
        cod_produto: string
        multiplo_venda: number
        observacao?: string
        ativo?: boolean
      }

      // Validações
      if (!cod_produto) {
        return reply.status(400).send({
          success: false,
          error: 'Código do produto é obrigatório'
        })
      }

      if (!multiplo_venda || multiplo_venda < 1) {
        return reply.status(400).send({
          success: false,
          error: 'Múltiplo de venda deve ser maior ou igual a 1'
        })
      }

      // Verificar se produto existe
      const produtoExiste = await poolAuditoria.query(`
        SELECT cod_produto FROM auditoria_integracao.auditoria_produtos_drp
        WHERE cod_produto = $1
      `, [cod_produto])

      if (produtoExiste.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Produto não encontrado'
        })
      }

      // Inserir ou atualizar
      await poolAuditoria.query(`
        INSERT INTO auditoria_integracao."Produto_Config_DRP" 
          (cod_produto, multiplo_venda, observacao, ativo)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (cod_produto) 
        DO UPDATE SET
          multiplo_venda = EXCLUDED.multiplo_venda,
          observacao = EXCLUDED.observacao,
          ativo = EXCLUDED.ativo,
          updated_at = NOW()
      `, [cod_produto, multiplo_venda, observacao || null, ativo !== false])

      return {
        success: true,
        message: 'Configuração salva com sucesso'
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao salvar configuração'
      })
    }
  })

  // Atualizar apenas o múltiplo de venda (edição rápida)
  fastify.patch('/produto-config/:cod_produto/multiplo', async (request, reply) => {
    try {
      const { cod_produto } = request.params as { cod_produto: string }
      const { multiplo_venda } = request.body as { multiplo_venda: number }

      if (!multiplo_venda || multiplo_venda < 1) {
        return reply.status(400).send({
          success: false,
          error: 'Múltiplo de venda deve ser maior ou igual a 1'
        })
      }

      const result = await poolAuditoria.query(`
        UPDATE auditoria_integracao."Produto_Config_DRP"
        SET multiplo_venda = $1, updated_at = NOW()
        WHERE cod_produto = $2
        RETURNING *
      `, [multiplo_venda, cod_produto])

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Configuração não encontrada'
        })
      }

      return {
        success: true,
        message: 'Múltiplo atualizado com sucesso'
      }
    } catch (error) {
      console.error('Erro ao atualizar múltiplo:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar múltiplo'
      })
    }
  })

  // Criar configuração para múltiplos produtos de uma vez
  fastify.post('/produto-config/batch', async (request, reply) => {
    try {
      const { produtos, multiplo_venda, observacao, ativo } = request.body as {
        produtos: string[]
        multiplo_venda: number
        observacao?: string
        ativo?: boolean
      }

      if (!produtos || produtos.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Nenhum produto selecionado'
        })
      }

      if (!multiplo_venda || multiplo_venda < 1) {
        return reply.status(400).send({
          success: false,
          error: 'Múltiplo de venda deve ser maior ou igual a 1'
        })
      }

      // Construir valores para INSERT em lote
      const values: any[] = []
      const placeholders: string[] = []
      
      produtos.forEach((cod_produto, index) => {
        const baseIndex = index * 4
        placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`)
        values.push(cod_produto, multiplo_venda, observacao || null, ativo !== false)
      })

      // Executar INSERT em lote com ON CONFLICT
      await poolAuditoria.query(`
        INSERT INTO auditoria_integracao."Produto_Config_DRP" 
          (cod_produto, multiplo_venda, observacao, ativo)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (cod_produto) 
        DO UPDATE SET
          multiplo_venda = EXCLUDED.multiplo_venda,
          observacao = EXCLUDED.observacao,
          ativo = EXCLUDED.ativo,
          updated_at = NOW()
      `, values)

      return {
        success: true,
        message: `${produtos.length} produto(s) configurado(s) com sucesso`
      }
    } catch (error) {
      console.error('Erro ao salvar configurações em lote:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao salvar configurações'
      })
    }
  })

  // Deletar configuração
  fastify.delete('/produto-config/:cod_produto', async (request, reply) => {
    try {
      const { cod_produto } = request.params as { cod_produto: string }

      const result = await poolAuditoria.query(`
        DELETE FROM auditoria_integracao."Produto_Config_DRP"
        WHERE cod_produto = $1
        RETURNING *
      `, [cod_produto])

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Configuração não encontrada'
        })
      }

      return {
        success: true,
        message: 'Configuração removida com sucesso'
      }
    } catch (error) {
      console.error('Erro ao deletar configuração:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao deletar configuração'
      })
    }
  })
}
