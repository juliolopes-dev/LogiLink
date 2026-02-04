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
}
