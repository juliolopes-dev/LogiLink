/**
 * Rotas para Sugestão e Configuração de Estoque Mínimo
 * 
 * Endpoints:
 * - GET /api/estoque-minimo/sugestao/:cod_produto - Calcula sugestão por filial
 * - POST /api/estoque-minimo/salvar - Salva estoque mínimo
 */

import { FastifyInstance } from 'fastify'
import poolAuditoria from '../lib/database-auditoria'

// Filiais para análise (exceto CD)
const FILIAIS = ['00', '01', '02', '05', '06']
const FILIAIS_MAP: Record<string, string> = {
  '00': 'Petrolina',
  '01': 'Juazeiro',
  '02': 'Salgueiro',
  '05': 'Bonfim',
  '06': 'Picos'
}

interface VendaDiaria {
  data: string
  quantidade: number
}

interface SugestaoFilial {
  cod_filial: string
  nome_filial: string
  vendas_periodo: number
  media_diaria: number
  desvio_padrao: number
  coeficiente_variacao: number
  confiabilidade: 'alta' | 'media' | 'baixa'
  estoque_minimo_atual: number
  estoque_minimo_sugerido: number
  dias_cobertura_sugerido: number
}

/**
 * Calcula desvio padrão de um array de números
 */
function calcularDesvioPadrao(valores: number[]): number {
  if (valores.length === 0) return 0
  const media = valores.reduce((a, b) => a + b, 0) / valores.length
  const somaQuadrados = valores.reduce((soma, val) => soma + Math.pow(val - media, 2), 0)
  return Math.sqrt(somaQuadrados / valores.length)
}

/**
 * Determina confiabilidade baseada no CV
 */
function determinarConfiabilidade(cv: number): 'alta' | 'media' | 'baixa' {
  if (cv <= 30) return 'alta'
  if (cv <= 60) return 'media'
  return 'baixa'
}

/**
 * Calcula dias de cobertura sugeridos baseado na confiabilidade
 */
function calcularDiasCobertura(confiabilidade: 'alta' | 'media' | 'baixa'): number {
  switch (confiabilidade) {
    case 'alta': return 7    // Vendas previsíveis: 1 semana
    case 'media': return 14  // Variação moderada: 2 semanas
    case 'baixa': return 21  // Vendas instáveis: 3 semanas (mais segurança)
  }
}

export async function estoqueMinRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /api/estoque-minimo/sugestao/:cod_produto
   * Calcula sugestão de estoque mínimo por filial baseado em análise estatística
   */
  fastify.get<{
    Params: { cod_produto: string }
    Querystring: { periodo_dias?: string }
  }>('/estoque-minimo/sugestao/:cod_produto', async (request, reply) => {
    try {
      const { cod_produto } = request.params
      const periodo_dias = parseInt(request.query.periodo_dias || '90')

      // Buscar informações do produto
      const produtoResult = await poolAuditoria.query(`
        SELECT cod_produto, descricao, referencia_fabricante
        FROM auditoria_integracao.auditoria_produtos_drp
        WHERE cod_produto = $1
        LIMIT 1
      `, [cod_produto])

      if (produtoResult.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Produto não encontrado'
        })
      }

      const produto = produtoResult.rows[0]
      const sugestoes: SugestaoFilial[] = []

      for (const codFilial of FILIAIS) {
        // Buscar vendas diárias do período
        const vendasDiariasResult = await poolAuditoria.query(`
          SELECT 
            data_movimento::date as data,
            COALESCE(SUM(quantidade), 0) as quantidade
          FROM auditoria_integracao."Movimentacao_DRP"
          WHERE cod_produto = $1
            AND cod_filial = $2
            AND tipo_movimento = '55'
            AND data_movimento >= CURRENT_DATE - INTERVAL '${periodo_dias} days'
          GROUP BY data_movimento::date
          ORDER BY data_movimento::date
        `, [cod_produto, codFilial])

        // Criar array com todos os dias (incluindo zeros)
        const vendasPorDia: number[] = []
        const hoje = new Date()
        
        for (let i = periodo_dias; i >= 0; i--) {
          const data = new Date(hoje)
          data.setDate(data.getDate() - i)
          const dataStr = data.toISOString().split('T')[0]
          
          const vendaDia = vendasDiariasResult.rows.find(
            (v: VendaDiaria) => v.data.toString().split('T')[0] === dataStr
          )
          vendasPorDia.push(vendaDia ? parseFloat(vendaDia.quantidade.toString()) : 0)
        }

        // Calcular estatísticas
        const totalVendas = vendasPorDia.reduce((a, b) => a + b, 0)
        const mediaDiaria = totalVendas / periodo_dias
        const desvioPadrao = calcularDesvioPadrao(vendasPorDia)
        const cv = mediaDiaria > 0 ? (desvioPadrao / mediaDiaria) * 100 : 0

        // Determinar confiabilidade e sugestão
        const confiabilidade = determinarConfiabilidade(cv)
        const diasCobertura = calcularDiasCobertura(confiabilidade)
        const estoqueMinSugerido = Math.ceil(mediaDiaria * diasCobertura)

        // Buscar estoque mínimo atual
        const estoqueAtualResult = await poolAuditoria.query(`
          SELECT COALESCE(estoque_minimo, 0) as estoque_minimo
          FROM auditoria_integracao."Estoque_DRP"
          WHERE cod_produto = $1 AND cod_filial = $2
        `, [cod_produto, codFilial])

        const estoqueMinAtual = parseFloat(estoqueAtualResult.rows[0]?.estoque_minimo || '0')

        sugestoes.push({
          cod_filial: codFilial,
          nome_filial: FILIAIS_MAP[codFilial],
          vendas_periodo: totalVendas,
          media_diaria: Math.round(mediaDiaria * 100) / 100,
          desvio_padrao: Math.round(desvioPadrao * 100) / 100,
          coeficiente_variacao: Math.round(cv),
          confiabilidade,
          estoque_minimo_atual: estoqueMinAtual,
          estoque_minimo_sugerido: estoqueMinSugerido,
          dias_cobertura_sugerido: diasCobertura
        })
      }

      return {
        success: true,
        produto: {
          cod_produto: produto.cod_produto,
          descricao: produto.descricao,
          referencia_fabricante: produto.referencia_fabricante
        },
        periodo_dias,
        sugestoes
      }

    } catch (error: any) {
      console.error('❌ Erro ao calcular sugestão de estoque mínimo:', error)
      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro ao calcular sugestão'
      })
    }
  })

  /**
   * POST /api/estoque-minimo/salvar
   * Salva estoque mínimo para um produto em uma ou mais filiais
   */
  fastify.post<{
    Body: {
      cod_produto: string
      filiais: Array<{
        cod_filial: string
        estoque_minimo: number
      }>
    }
  }>('/estoque-minimo/salvar', async (request, reply) => {
    try {
      const { cod_produto, filiais } = request.body

      if (!cod_produto || !filiais || filiais.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'cod_produto e filiais são obrigatórios'
        })
      }

      const resultados: Array<{ cod_filial: string; estoque_minimo: number; atualizado: boolean }> = []

      for (const filial of filiais) {
        // Verificar se existe registro
        const existeResult = await poolAuditoria.query(`
          SELECT 1 FROM auditoria_integracao."Estoque_DRP"
          WHERE cod_produto = $1 AND cod_filial = $2
        `, [cod_produto, filial.cod_filial])

        if (existeResult.rows.length > 0) {
          // Atualizar
          await poolAuditoria.query(`
            UPDATE auditoria_integracao."Estoque_DRP"
            SET estoque_minimo = $3
            WHERE cod_produto = $1 AND cod_filial = $2
          `, [cod_produto, filial.cod_filial, filial.estoque_minimo])
        } else {
          // Inserir
          await poolAuditoria.query(`
            INSERT INTO auditoria_integracao."Estoque_DRP" 
            (cod_produto, cod_filial, estoque, estoque_minimo)
            VALUES ($1, $2, 0, $3)
          `, [cod_produto, filial.cod_filial, filial.estoque_minimo])
        }

        resultados.push({
          cod_filial: filial.cod_filial,
          estoque_minimo: filial.estoque_minimo,
          atualizado: true
        })
      }

      console.log(`✅ Estoque mínimo atualizado para produto ${cod_produto}:`, resultados)

      return {
        success: true,
        message: `Estoque mínimo atualizado para ${resultados.length} filial(is)`,
        resultados
      }

    } catch (error: any) {
      console.error('❌ Erro ao salvar estoque mínimo:', error)
      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro ao salvar estoque mínimo'
      })
    }
  })

  // ============================================================
  // NOVOS ENDPOINTS - ESTOQUE MÍNIMO DINÂMICO COM CLASSIFICAÇÃO ABC
  // ============================================================

  /**
   * GET /api/estoque-minimo/dinamico/:cod_produto/:cod_filial
   * Retorna o estoque mínimo calculado de um produto em uma filial
   */
  fastify.get<{
    Params: { cod_produto: string; cod_filial: string }
  }>('/estoque-minimo/dinamico/:cod_produto/:cod_filial', async (request, reply) => {
    try {
      const { cod_produto, cod_filial } = request.params

      const result = await poolAuditoria.query(`
        SELECT *
        FROM auditoria_integracao.estoque_minimo
        WHERE cod_produto = $1 AND cod_filial = $2
      `, [cod_produto, cod_filial])

      if (result.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Estoque mínimo não encontrado para este produto/filial'
        })
      }

      return {
        success: true,
        data: result.rows[0]
      }

    } catch (error: any) {
      console.error('❌ Erro ao buscar estoque mínimo dinâmico:', error)
      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro ao buscar estoque mínimo'
      })
    }
  })

  /**
   * GET /api/estoque-minimo/dinamico/filial/:cod_filial
   * Lista todos os estoques mínimos de uma filial
   */
  fastify.get<{
    Params: { cod_filial: string }
    Querystring: { classe_abc?: string; page?: string; limit?: string }
  }>('/estoque-minimo/dinamico/filial/:cod_filial', async (request, reply) => {
    try {
      const { cod_filial } = request.params
      const { classe_abc, page = '1', limit = '50' } = request.query

      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)
      const offset = (pageNum - 1) * limitNum

      let query = `
        SELECT em.*, 
          e.estoque as estoque_atual,
          CASE WHEN e.estoque < em.estoque_minimo_ativo THEN true ELSE false END as abaixo_minimo
        FROM auditoria_integracao.estoque_minimo em
        LEFT JOIN auditoria_integracao."Estoque_DRP" e 
          ON em.cod_produto = e.cod_produto AND em.cod_filial = e.cod_filial
        WHERE em.cod_filial = $1
      `
      const params: any[] = [cod_filial]
      let paramIndex = 2

      if (classe_abc) {
        query += ` AND em.classe_abc = $${paramIndex}`
        params.push(classe_abc)
        paramIndex++
      }

      query += ` ORDER BY em.classe_abc, em.estoque_minimo_ativo DESC`
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
      params.push(limitNum, offset)

      const result = await poolAuditoria.query(query, params)

      // Contar total
      let countQuery = `SELECT COUNT(*) as total FROM auditoria_integracao.estoque_minimo WHERE cod_filial = $1`
      const countParams: any[] = [cod_filial]
      if (classe_abc) {
        countQuery += ` AND classe_abc = $2`
        countParams.push(classe_abc)
      }
      const countResult = await poolAuditoria.query(countQuery, countParams)
      const total = parseInt(countResult.rows[0].total)

      return {
        success: true,
        data: result.rows,
        paginacao: {
          pagina_atual: pageNum,
          por_pagina: limitNum,
          total_registros: total,
          total_paginas: Math.ceil(total / limitNum)
        }
      }

    } catch (error: any) {
      console.error('❌ Erro ao listar estoque mínimo por filial:', error)
      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro ao listar estoque mínimo'
      })
    }
  })

  /**
   * POST /api/estoque-minimo/dinamico/recalcular
   * Recalcula estoque mínimo de um produto (todas as filiais ou uma específica)
   */
  fastify.post<{
    Body: { cod_produto: string; cod_filial?: string }
  }>('/estoque-minimo/dinamico/recalcular', async (request, reply) => {
    try {
      const { cod_produto, cod_filial } = request.body

      if (!cod_produto) {
        return reply.status(400).send({
          success: false,
          error: 'cod_produto é obrigatório'
        })
      }

      // Importar service dinamicamente para evitar problemas de circular dependency
      const { calcularEstoqueMinimoFilial, salvarEstoqueMinimo, calcularEstoqueMinimoProduto } = 
        await import('../services/estoque-minimo/estoque-minimo.service')

      let resultados: any[] = []

      if (cod_filial) {
        // Recalcular apenas uma filial
        const resultado = await calcularEstoqueMinimoFilial(cod_produto, cod_filial)
        await salvarEstoqueMinimo(resultado)
        resultados.push(resultado)
      } else {
        // Recalcular todas as filiais
        resultados = await calcularEstoqueMinimoProduto(cod_produto)
      }

      console.log(`✅ Estoque mínimo recalculado para produto ${cod_produto}:`, 
        resultados.map(r => `${r.cod_filial}: ${r.estoque_minimo_calculado} (${r.classe_abc})`))

      return {
        success: true,
        message: `Estoque mínimo recalculado para ${resultados.length} filial(is)`,
        data: resultados
      }

    } catch (error: any) {
      console.error('❌ Erro ao recalcular estoque mínimo:', error)
      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro ao recalcular estoque mínimo'
      })
    }
  })

  /**
   * PUT /api/estoque-minimo/dinamico/ajustar
   * Ajusta manualmente o estoque mínimo
   */
  fastify.put<{
    Body: { 
      cod_produto: string
      cod_filial: string
      estoque_minimo_manual: number
      observacao?: string
    }
  }>('/estoque-minimo/dinamico/ajustar', async (request, reply) => {
    try {
      const { cod_produto, cod_filial, estoque_minimo_manual, observacao } = request.body

      if (!cod_produto || !cod_filial || estoque_minimo_manual === undefined) {
        return reply.status(400).send({
          success: false,
          error: 'cod_produto, cod_filial e estoque_minimo_manual são obrigatórios'
        })
      }

      const { ajustarEstoqueMinimoManual } = 
        await import('../services/estoque-minimo/estoque-minimo.service')

      await ajustarEstoqueMinimoManual(
        cod_produto,
        cod_filial,
        estoque_minimo_manual,
        'usuario', // TODO: pegar do token de autenticação
        observacao
      )

      console.log(`✅ Estoque mínimo ajustado manualmente: ${cod_produto}/${cod_filial} = ${estoque_minimo_manual}`)

      return {
        success: true,
        message: 'Estoque mínimo ajustado com sucesso',
        data: {
          cod_produto,
          cod_filial,
          estoque_minimo_manual
        }
      }

    } catch (error: any) {
      console.error('❌ Erro ao ajustar estoque mínimo:', error)
      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro ao ajustar estoque mínimo'
      })
    }
  })

  /**
   * GET /api/estoque-minimo/dinamico/historico/:cod_produto/:cod_filial
   * Retorna histórico de alterações do estoque mínimo
   */
  fastify.get<{
    Params: { cod_produto: string; cod_filial: string }
    Querystring: { limite?: string }
  }>('/estoque-minimo/dinamico/historico/:cod_produto/:cod_filial', async (request, reply) => {
    try {
      const { cod_produto, cod_filial } = request.params
      const limite = parseInt(request.query.limite || '10')

      const result = await poolAuditoria.query(`
        SELECT *
        FROM auditoria_integracao.estoque_minimo_historico
        WHERE cod_produto = $1 AND cod_filial = $2
        ORDER BY data_calculo DESC
        LIMIT $3
      `, [cod_produto, cod_filial, limite])

      return {
        success: true,
        data: result.rows
      }

    } catch (error: any) {
      console.error('❌ Erro ao buscar histórico de estoque mínimo:', error)
      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro ao buscar histórico'
      })
    }
  })

  /**
   * GET /api/estoque-minimo/dinamico/abaixo-minimo
   * Lista produtos com estoque abaixo do mínimo
   */
  fastify.get<{
    Querystring: { cod_filial?: string; classe_abc?: string }
  }>('/estoque-minimo/dinamico/abaixo-minimo', async (request, reply) => {
    try {
      const { cod_filial, classe_abc } = request.query

      let query = `
        SELECT 
          em.*,
          e.estoque as estoque_atual,
          (em.estoque_minimo_ativo - e.estoque) as deficit,
          p.descricao
        FROM auditoria_integracao.estoque_minimo em
        LEFT JOIN auditoria_integracao."Estoque_DRP" e 
          ON em.cod_produto = e.cod_produto AND em.cod_filial = e.cod_filial
        LEFT JOIN auditoria_integracao.auditoria_produtos_drp p
          ON em.cod_produto = p.cod_produto
        WHERE e.estoque < em.estoque_minimo_ativo
      `
      const params: any[] = []
      let paramIndex = 1

      if (cod_filial) {
        query += ` AND em.cod_filial = $${paramIndex}`
        params.push(cod_filial)
        paramIndex++
      }

      if (classe_abc) {
        query += ` AND em.classe_abc = $${paramIndex}`
        params.push(classe_abc)
        paramIndex++
      }

      query += ` ORDER BY em.classe_abc, (em.estoque_minimo_ativo - e.estoque) DESC`

      const result = await poolAuditoria.query(query, params)

      // Resumo por classe
      const resumo = {
        classe_a: result.rows.filter((r: any) => r.classe_abc === 'A').length,
        classe_b: result.rows.filter((r: any) => r.classe_abc === 'B').length,
        classe_c: result.rows.filter((r: any) => r.classe_abc === 'C').length,
        total: result.rows.length
      }

      return {
        success: true,
        resumo,
        data: result.rows
      }

    } catch (error: any) {
      console.error('❌ Erro ao listar produtos abaixo do mínimo:', error)
      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro ao listar produtos'
      })
    }
  })

  /**
   * GET /api/estoque-minimo/dinamico/resumo/:cod_filial
   * Resumo de estoque mínimo por filial
   */
  fastify.get<{
    Params: { cod_filial: string }
  }>('/estoque-minimo/dinamico/resumo/:cod_filial', async (request, reply) => {
    try {
      const { cod_filial } = request.params

      const result = await poolAuditoria.query(`
        SELECT 
          COUNT(*) as total_produtos,
          COUNT(*) FILTER (WHERE classe_abc = 'A') as produtos_classe_a,
          COUNT(*) FILTER (WHERE classe_abc = 'B') as produtos_classe_b,
          COUNT(*) FILTER (WHERE classe_abc = 'C') as produtos_classe_c,
          SUM(estoque_minimo_ativo) as soma_estoque_minimo,
          MAX(data_calculo) as ultimo_calculo
        FROM auditoria_integracao.estoque_minimo
        WHERE cod_filial = $1
      `, [cod_filial])

      // Contar produtos abaixo do mínimo
      const abaixoResult = await poolAuditoria.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE em.classe_abc = 'A') as classe_a,
          COUNT(*) FILTER (WHERE em.classe_abc = 'B') as classe_b,
          COUNT(*) FILTER (WHERE em.classe_abc = 'C') as classe_c
        FROM auditoria_integracao.estoque_minimo em
        LEFT JOIN auditoria_integracao."Estoque_DRP" e 
          ON em.cod_produto = e.cod_produto AND em.cod_filial = e.cod_filial
        WHERE em.cod_filial = $1
          AND e.estoque < em.estoque_minimo_ativo
      `, [cod_filial])

      return {
        success: true,
        data: {
          filial: cod_filial,
          nome_filial: FILIAIS_MAP[cod_filial],
          ...result.rows[0],
          abaixo_minimo: abaixoResult.rows[0]
        }
      }

    } catch (error: any) {
      console.error('❌ Erro ao buscar resumo de estoque mínimo:', error)
      return reply.status(500).send({
        success: false,
        error: error.message || 'Erro ao buscar resumo'
      })
    }
  })
}
