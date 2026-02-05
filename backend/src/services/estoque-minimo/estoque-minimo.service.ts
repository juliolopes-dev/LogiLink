/**
 * Service: Estoque Mínimo Dinâmico
 * 
 * Calcula automaticamente o estoque mínimo por produto/filial
 * usando classificação ABC (Pareto) e análise de tendências.
 */

import poolAuditoria from '../../lib/database-auditoria'

// Configurações do algoritmo
const CONFIG = {
  // Janela de análise
  JANELA_VENDAS_DIAS: 180,
  JANELA_TENDENCIA_DIAS: 90,
  
  // Lead time padrão
  LEAD_TIME_PADRAO: 30,
  
  // Parâmetros por classe ABC
  CLASSE_A: {
    fator_seguranca: 2.0,
    buffer_dias: 5
  },
  CLASSE_B: {
    fator_seguranca: 1.5,
    buffer_dias: 3
  },
  CLASSE_C: {
    fator_seguranca: 1.2,
    buffer_dias: 0
  },
  
  // Limites para fatores
  FATOR_MIN: 0.5,
  FATOR_MAX: 2.0,
  
  // Alerta de variação significativa
  VARIACAO_ALERTA_PERCENTUAL: 50
}

// Tipos
interface DadosVendas {
  vendas_180_dias: number
  vendas_90_dias: number
  vendas_90_180_dias: number
  media_vendas_diarias: number
}

interface ResultadoCalculo {
  cod_produto: string
  cod_filial: string
  estoque_minimo_calculado: number
  estoque_minimo_anterior: number | null
  variacao_percentual: number | null
  classe_abc: 'A' | 'B' | 'C'
  media_vendas_diarias: number
  lead_time_dias: number
  buffer_dias: number
  fator_seguranca: number
  fator_tendencia: number
  fator_sazonal: number
  vendas_180_dias: number
  vendas_90_dias: number
  vendas_90_180_dias: number
}

interface ClassificacaoABC {
  cod_produto: string
  cod_filial: string
  faturamento: number
  percentual_acumulado: number
  classe: 'A' | 'B' | 'C'
}

// Filiais disponíveis
const FILIAIS = ['00', '01', '02', '05', '06']

/**
 * Busca vendas de um produto em uma filial
 */
async function buscarVendasFilial(
  cod_produto: string,
  cod_filial: string,
  dias: number,
  diasOffset: number = 0
): Promise<number> {
  const dataInicio = new Date()
  dataInicio.setDate(dataInicio.getDate() - dias - diasOffset)
  
  const dataFim = new Date()
  dataFim.setDate(dataFim.getDate() - diasOffset)
  
  const result = await poolAuditoria.query(`
    SELECT COALESCE(SUM(quantidade), 0) as vendas
    FROM auditoria_integracao."Movimentacao_DRP"
    WHERE cod_produto = $1
      AND cod_filial = $2
      AND tipo_movimento = '55'
      AND data_movimento >= $3
      AND data_movimento < $4
  `, [cod_produto, cod_filial, dataInicio, dataFim])
  
  return parseFloat(result.rows[0]?.vendas || '0')
}

/**
 * Busca dados de vendas completos para cálculo
 */
async function buscarDadosVendas(
  cod_produto: string,
  cod_filial: string
): Promise<DadosVendas> {
  // Vendas últimos 180 dias
  const vendas_180_dias = await buscarVendasFilial(cod_produto, cod_filial, 180)
  
  // Vendas últimos 90 dias
  const vendas_90_dias = await buscarVendasFilial(cod_produto, cod_filial, 90)
  
  // Vendas de 90 a 180 dias atrás
  const vendas_90_180_dias = await buscarVendasFilial(cod_produto, cod_filial, 90, 90)
  
  // Média diária
  const media_vendas_diarias = vendas_180_dias / CONFIG.JANELA_VENDAS_DIAS
  
  return {
    vendas_180_dias,
    vendas_90_dias,
    vendas_90_180_dias,
    media_vendas_diarias
  }
}

/**
 * Calcula fator de tendência
 * Compara vendas recentes (90 dias) com vendas antigas (90-180 dias)
 */
function calcularFatorTendencia(vendas_90_dias: number, vendas_90_180_dias: number): number {
  if (vendas_90_180_dias === 0) {
    // Se não tinha vendas antes, considerar tendência neutra ou de crescimento
    return vendas_90_dias > 0 ? 1.5 : 1.0
  }
  
  const fator = vendas_90_dias / vendas_90_180_dias
  
  // Limitar entre 0.5 e 2.0
  return Math.max(CONFIG.FATOR_MIN, Math.min(CONFIG.FATOR_MAX, fator))
}

/**
 * Calcula fator sazonal
 * Compara vendas do mês atual (ano anterior) com média anual
 */
async function calcularFatorSazonal(
  cod_produto: string,
  cod_filial: string
): Promise<number> {
  const mesAtual = new Date().getMonth() + 1 // 1-12
  const anoAnterior = new Date().getFullYear() - 1
  
  // Vendas do mesmo mês no ano anterior
  const resultMes = await poolAuditoria.query(`
    SELECT COALESCE(SUM(quantidade), 0) as vendas
    FROM auditoria_integracao."Movimentacao_DRP"
    WHERE cod_produto = $1
      AND cod_filial = $2
      AND tipo_movimento = '55'
      AND EXTRACT(MONTH FROM data_movimento) = $3
      AND EXTRACT(YEAR FROM data_movimento) = $4
  `, [cod_produto, cod_filial, mesAtual, anoAnterior])
  
  const vendasMesAnoAnterior = parseFloat(resultMes.rows[0]?.vendas || '0')
  
  // Média mensal do ano anterior
  const resultAno = await poolAuditoria.query(`
    SELECT COALESCE(SUM(quantidade), 0) / 12 as media_mensal
    FROM auditoria_integracao."Movimentacao_DRP"
    WHERE cod_produto = $1
      AND cod_filial = $2
      AND tipo_movimento = '55'
      AND EXTRACT(YEAR FROM data_movimento) = $3
  `, [cod_produto, cod_filial, anoAnterior])
  
  const mediaMensalAnoAnterior = parseFloat(resultAno.rows[0]?.media_mensal || '0')
  
  if (mediaMensalAnoAnterior === 0) {
    return 1.0 // Sem histórico, fator neutro
  }
  
  const fator = vendasMesAnoAnterior / mediaMensalAnoAnterior
  
  // Limitar entre 0.5 e 2.0
  return Math.max(CONFIG.FATOR_MIN, Math.min(CONFIG.FATOR_MAX, fator))
}

/**
 * Classifica produtos em ABC por filial
 * Retorna a classificação de um produto específico
 */
async function classificarProdutoABC(
  cod_produto: string,
  cod_filial: string
): Promise<'A' | 'B' | 'C'> {
  // Buscar faturamento de todos os produtos da filial (últimos 180 dias)
  const dataInicio = new Date()
  dataInicio.setDate(dataInicio.getDate() - 180)
  
  const result = await poolAuditoria.query(`
    WITH faturamento_produtos AS (
      SELECT 
        m.cod_produto,
        SUM(m.quantidade * m.valor_venda) as faturamento
      FROM auditoria_integracao."Movimentacao_DRP" m
      WHERE m.cod_filial = $1
        AND m.tipo_movimento = '55'
        AND m.data_movimento >= $2
      GROUP BY m.cod_produto
    ),
    ranking AS (
      SELECT 
        cod_produto,
        faturamento,
        SUM(faturamento) OVER (ORDER BY faturamento DESC) as faturamento_acumulado,
        SUM(faturamento) OVER () as faturamento_total
      FROM faturamento_produtos
    )
    SELECT 
      cod_produto,
      faturamento,
      (faturamento_acumulado / NULLIF(faturamento_total, 0)) * 100 as percentual_acumulado
    FROM ranking
    WHERE cod_produto = $3
  `, [cod_filial, dataInicio, cod_produto])
  
  if (result.rows.length === 0) {
    return 'C' // Produto sem vendas = Classe C
  }
  
  const percentualAcumulado = parseFloat(result.rows[0].percentual_acumulado || '100')
  
  if (percentualAcumulado <= 80) {
    return 'A'
  } else if (percentualAcumulado <= 95) {
    return 'B'
  } else {
    return 'C'
  }
}

/**
 * Busca estoque mínimo atual do produto/filial
 */
async function buscarEstoqueMinimoAtual(
  cod_produto: string,
  cod_filial: string
): Promise<number | null> {
  const result = await poolAuditoria.query(`
    SELECT estoque_minimo_ativo
    FROM auditoria_integracao.estoque_minimo
    WHERE cod_produto = $1 AND cod_filial = $2
  `, [cod_produto, cod_filial])
  
  if (result.rows.length === 0) {
    return null
  }
  
  return parseInt(result.rows[0].estoque_minimo_ativo)
}

/**
 * Calcula estoque mínimo de um produto em uma filial
 */
export async function calcularEstoqueMinimoFilial(
  cod_produto: string,
  cod_filial: string
): Promise<ResultadoCalculo> {
  // 1. Buscar dados de vendas
  const dadosVendas = await buscarDadosVendas(cod_produto, cod_filial)
  
  // 2. Classificar produto (ABC)
  const classe_abc = await classificarProdutoABC(cod_produto, cod_filial)
  
  // 3. Obter parâmetros da classe
  const paramsClasse = CONFIG[`CLASSE_${classe_abc}` as keyof typeof CONFIG] as {
    fator_seguranca: number
    buffer_dias: number
  }
  
  // 4. Calcular fatores
  const fator_tendencia = calcularFatorTendencia(
    dadosVendas.vendas_90_dias,
    dadosVendas.vendas_90_180_dias
  )
  
  const fator_sazonal = await calcularFatorSazonal(cod_produto, cod_filial)
  
  // 5. Calcular lead time total
  const lead_time_dias = CONFIG.LEAD_TIME_PADRAO
  const buffer_dias = paramsClasse.buffer_dias
  const lead_time_total = lead_time_dias + buffer_dias
  
  // 6. Aplicar fórmula
  let estoque_minimo_calculado = 
    dadosVendas.media_vendas_diarias 
    * lead_time_total 
    * paramsClasse.fator_seguranca 
    * fator_tendencia 
    * fator_sazonal
  
  // 7. Arredondar para cima
  estoque_minimo_calculado = Math.ceil(estoque_minimo_calculado)
  
  // 8. Garantir mínimo de 1 para produtos com vendas
  if (dadosVendas.vendas_180_dias > 0 && estoque_minimo_calculado < 1) {
    estoque_minimo_calculado = 1
  }
  
  // 9. Buscar estoque mínimo anterior
  const estoque_minimo_anterior = await buscarEstoqueMinimoAtual(cod_produto, cod_filial)
  
  // 10. Calcular variação percentual
  let variacao_percentual: number | null = null
  if (estoque_minimo_anterior !== null && estoque_minimo_anterior > 0) {
    variacao_percentual = ((estoque_minimo_calculado - estoque_minimo_anterior) / estoque_minimo_anterior) * 100
  }
  
  return {
    cod_produto,
    cod_filial,
    estoque_minimo_calculado,
    estoque_minimo_anterior,
    variacao_percentual,
    classe_abc,
    media_vendas_diarias: dadosVendas.media_vendas_diarias,
    lead_time_dias,
    buffer_dias,
    fator_seguranca: paramsClasse.fator_seguranca,
    fator_tendencia,
    fator_sazonal,
    vendas_180_dias: dadosVendas.vendas_180_dias,
    vendas_90_dias: dadosVendas.vendas_90_dias,
    vendas_90_180_dias: dadosVendas.vendas_90_180_dias
  }
}

/**
 * Salva resultado do cálculo no banco
 */
export async function salvarEstoqueMinimo(resultado: ResultadoCalculo): Promise<void> {
  // Upsert na tabela estoque_minimo
  await poolAuditoria.query(`
    INSERT INTO auditoria_integracao.estoque_minimo (
      cod_produto, cod_filial, estoque_minimo_calculado, estoque_minimo_ativo,
      media_vendas_diarias, lead_time_dias, buffer_dias, fator_seguranca,
      fator_tendencia, fator_sazonal, classe_abc,
      vendas_180_dias, vendas_90_dias, vendas_90_180_dias,
      data_calculo, metodo
    ) VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), 'automatico')
    ON CONFLICT (cod_produto, cod_filial) 
    DO UPDATE SET
      estoque_minimo_calculado = $3,
      estoque_minimo_ativo = CASE 
        WHEN auditoria_integracao.estoque_minimo.estoque_minimo_manual IS NOT NULL 
        THEN auditoria_integracao.estoque_minimo.estoque_minimo_manual 
        ELSE $3 
      END,
      media_vendas_diarias = $4,
      lead_time_dias = $5,
      buffer_dias = $6,
      fator_seguranca = $7,
      fator_tendencia = $8,
      fator_sazonal = $9,
      classe_abc = $10,
      vendas_180_dias = $11,
      vendas_90_dias = $12,
      vendas_90_180_dias = $13,
      data_calculo = NOW(),
      updated_at = NOW()
  `, [
    resultado.cod_produto,
    resultado.cod_filial,
    resultado.estoque_minimo_calculado,
    resultado.media_vendas_diarias,
    resultado.lead_time_dias,
    resultado.buffer_dias,
    resultado.fator_seguranca,
    resultado.fator_tendencia,
    resultado.fator_sazonal,
    resultado.classe_abc,
    resultado.vendas_180_dias,
    resultado.vendas_90_dias,
    resultado.vendas_90_180_dias
  ])
  
  // Salvar histórico
  await poolAuditoria.query(`
    INSERT INTO auditoria_integracao.estoque_minimo_historico (
      cod_produto, cod_filial, estoque_minimo_anterior, estoque_minimo_novo,
      variacao_percentual, media_vendas_diarias, lead_time_dias, buffer_dias,
      fator_seguranca, fator_tendencia, fator_sazonal, classe_abc,
      vendas_180_dias, vendas_90_dias, vendas_90_180_dias,
      data_calculo, metodo
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), 'automatico')
  `, [
    resultado.cod_produto,
    resultado.cod_filial,
    resultado.estoque_minimo_anterior,
    resultado.estoque_minimo_calculado,
    resultado.variacao_percentual,
    resultado.media_vendas_diarias,
    resultado.lead_time_dias,
    resultado.buffer_dias,
    resultado.fator_seguranca,
    resultado.fator_tendencia,
    resultado.fator_sazonal,
    resultado.classe_abc,
    resultado.vendas_180_dias,
    resultado.vendas_90_dias,
    resultado.vendas_90_180_dias
  ])
}

/**
 * Calcula e salva estoque mínimo de um produto em todas as filiais
 */
export async function calcularEstoqueMinimoProduto(
  cod_produto: string
): Promise<ResultadoCalculo[]> {
  const resultados: ResultadoCalculo[] = []
  
  for (const cod_filial of FILIAIS) {
    const resultado = await calcularEstoqueMinimoFilial(cod_produto, cod_filial)
    await salvarEstoqueMinimo(resultado)
    resultados.push(resultado)
  }
  
  return resultados
}

/**
 * Busca estoque mínimo de um produto/filial
 */
export async function buscarEstoqueMinimo(
  cod_produto: string,
  cod_filial: string
): Promise<any> {
  const result = await poolAuditoria.query(`
    SELECT *
    FROM auditoria_integracao.estoque_minimo
    WHERE cod_produto = $1 AND cod_filial = $2
  `, [cod_produto, cod_filial])
  
  return result.rows[0] || null
}

/**
 * Busca histórico de estoque mínimo
 */
export async function buscarHistoricoEstoqueMinimo(
  cod_produto: string,
  cod_filial: string,
  limite: number = 10
): Promise<any[]> {
  const result = await poolAuditoria.query(`
    SELECT *
    FROM auditoria_integracao.estoque_minimo_historico
    WHERE cod_produto = $1 AND cod_filial = $2
    ORDER BY data_calculo DESC
    LIMIT $3
  `, [cod_produto, cod_filial, limite])
  
  return result.rows
}

/**
 * Ajusta manualmente o estoque mínimo
 */
export async function ajustarEstoqueMinimoManual(
  cod_produto: string,
  cod_filial: string,
  estoque_minimo_manual: number,
  usuario: string,
  observacao?: string
): Promise<void> {
  // Buscar valor anterior
  const anterior = await buscarEstoqueMinimo(cod_produto, cod_filial)
  const estoque_anterior = anterior?.estoque_minimo_ativo || 0
  
  // Atualizar
  await poolAuditoria.query(`
    UPDATE auditoria_integracao.estoque_minimo
    SET 
      estoque_minimo_manual = $3,
      estoque_minimo_ativo = $3,
      metodo = 'manual',
      usuario_ajuste = $4,
      observacao = $5,
      updated_at = NOW()
    WHERE cod_produto = $1 AND cod_filial = $2
  `, [cod_produto, cod_filial, estoque_minimo_manual, usuario, observacao])
  
  // Calcular variação
  const variacao = estoque_anterior > 0 
    ? ((estoque_minimo_manual - estoque_anterior) / estoque_anterior) * 100 
    : null
  
  // Salvar histórico
  await poolAuditoria.query(`
    INSERT INTO auditoria_integracao.estoque_minimo_historico (
      cod_produto, cod_filial, estoque_minimo_anterior, estoque_minimo_novo,
      variacao_percentual, data_calculo, metodo, usuario, observacao
    ) VALUES ($1, $2, $3, $4, $5, NOW(), 'manual', $6, $7)
  `, [cod_produto, cod_filial, estoque_anterior, estoque_minimo_manual, variacao, usuario, observacao])
}

/**
 * Lista produtos com estoque abaixo do mínimo
 */
export async function listarProdutosAbaixoMinimo(
  cod_filial?: string,
  classe_abc?: 'A' | 'B' | 'C'
): Promise<any[]> {
  let query = `
    SELECT 
      em.*,
      e.estoque_atual
    FROM auditoria_integracao.estoque_minimo em
    LEFT JOIN auditoria_integracao."Estoque" e 
      ON em.cod_produto = e.cod_produto AND em.cod_filial = e.cod_filial
    WHERE e.estoque_atual < em.estoque_minimo_ativo
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
  
  query += ` ORDER BY em.classe_abc, (em.estoque_minimo_ativo - e.estoque_atual) DESC`
  
  const result = await poolAuditoria.query(query, params)
  return result.rows
}

/**
 * Resumo de estoque mínimo por filial
 */
export async function resumoEstoqueMinimoFilial(cod_filial: string): Promise<any> {
  const result = await poolAuditoria.query(`
    SELECT 
      COUNT(*) as total_produtos,
      COUNT(*) FILTER (WHERE classe_abc = 'A') as produtos_classe_a,
      COUNT(*) FILTER (WHERE classe_abc = 'B') as produtos_classe_b,
      COUNT(*) FILTER (WHERE classe_abc = 'C') as produtos_classe_c,
      SUM(estoque_minimo_ativo) as soma_estoque_minimo
    FROM auditoria_integracao.estoque_minimo
    WHERE cod_filial = $1
  `, [cod_filial])
  
  return result.rows[0]
}

export { CONFIG as CONFIG_ESTOQUE_MINIMO }
