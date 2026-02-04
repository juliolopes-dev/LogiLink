/**
 * Utilitário para calcular frequência de saída de produtos
 * 
 * Frequência de saída indica com que frequência um produto teve movimentação (vendas)
 * em um determinado período, ajudando a classificar produtos por giro.
 */

import poolAuditoria from '../../lib/database-auditoria'

export type FrequenciaSaida = 'Alta' | 'Média' | 'Baixa' | 'Sem Saída' | 'Sem Dados'

export interface ResultadoFrequenciaSaida {
  frequencia: FrequenciaSaida
  dias_com_saida: number
  periodo_dias: number
  percentual_dias: number
}

/**
 * Calcula a frequência de saída de um produto em uma filial
 * 
 * @param cod_produto - Código do produto
 * @param cod_filial - Código da filial
 * @param periodo_dias - Período de análise em dias (padrão: 90)
 * @returns Objeto com frequência e estatísticas
 * 
 * @example
 * const resultado = await calcularFrequenciaSaida('042688', '00', 90)
 * console.log(resultado.frequencia) // 'Alta', 'Média', 'Baixa', etc
 * console.log(resultado.percentual_dias) // 75.5
 */
export async function calcularFrequenciaSaida(
  cod_produto: string,
  cod_filial: string,
  periodo_dias: number = 90
): Promise<ResultadoFrequenciaSaida> {
  try {
    // Contar quantos dias DISTINTOS teve saída (movimentação) no período
    const result = await poolAuditoria.query(`
      SELECT COUNT(DISTINCT data_movimento::date) as dias_com_saida
      FROM auditoria_integracao."Movimentacao_DRP"
      WHERE cod_produto = $1
        AND cod_filial = $2
        AND tipo_movimento = '55'
        AND data_movimento >= CURRENT_DATE - INTERVAL '${periodo_dias} days'
    `, [cod_produto, cod_filial])

    const dias_com_saida = parseInt(result.rows[0]?.dias_com_saida || '0')
    const percentual_dias = (dias_com_saida / periodo_dias) * 100

    // Classificar frequência baseado no percentual de dias com saída
    let frequencia: FrequenciaSaida = 'Sem Dados'

    if (dias_com_saida === 0) {
      frequencia = 'Sem Saída'
    } else if (percentual_dias >= 70) {
      frequencia = 'Alta' // Saída em 70%+ dos dias (produto gira quase todo dia)
    } else if (percentual_dias >= 40) {
      frequencia = 'Média' // Saída em 40-69% dos dias (produto gira alguns dias)
    } else {
      frequencia = 'Baixa' // Saída em menos de 40% dos dias (produto gira raramente)
    }

    return {
      frequencia,
      dias_com_saida,
      periodo_dias,
      percentual_dias: Math.round(percentual_dias * 10) / 10 // 1 casa decimal
    }

  } catch (error) {
    console.error('Erro ao calcular frequência de saída:', error)
    return {
      frequencia: 'Sem Dados',
      dias_com_saida: 0,
      periodo_dias,
      percentual_dias: 0
    }
  }
}

/**
 * Calcula frequência de saída para múltiplos produtos em múltiplas filiais
 * Útil para processar em lote (ex: exportação de relatórios)
 * 
 * @param produtos - Array de objetos com cod_produto e cod_filial
 * @param periodo_dias - Período de análise em dias (padrão: 90)
 * @returns Map com chave "cod_produto:cod_filial" e valor ResultadoFrequenciaSaida
 * 
 * @example
 * const resultados = await calcularFrequenciaSaidaLote([
 *   { cod_produto: '042688', cod_filial: '00' },
 *   { cod_produto: '042688', cod_filial: '01' }
 * ], 90)
 * const freq = resultados.get('042688:00')
 */
export async function calcularFrequenciaSaidaLote(
  produtos: Array<{ cod_produto: string; cod_filial: string }>,
  periodo_dias: number = 90
): Promise<Map<string, ResultadoFrequenciaSaida>> {
  const resultados = new Map<string, ResultadoFrequenciaSaida>()

  // Processar em paralelo para melhor performance
  const promises = produtos.map(async ({ cod_produto, cod_filial }) => {
    const resultado = await calcularFrequenciaSaida(cod_produto, cod_filial, periodo_dias)
    const chave = `${cod_produto}:${cod_filial}`
    resultados.set(chave, resultado)
  })

  await Promise.all(promises)

  return resultados
}

/**
 * Determina dias de cobertura recomendados baseado na frequência
 * Útil para cálculo de estoque mínimo
 * 
 * @param frequencia - Frequência de saída do produto
 * @returns Número de dias de cobertura recomendados
 * 
 * @example
 * const dias = getDiasCoberturaPorFrequencia('Alta') // 7
 * const estoque_minimo = media_diaria * dias
 */
export function getDiasCoberturaPorFrequencia(frequencia: FrequenciaSaida): number {
  switch (frequencia) {
    case 'Alta':
      return 7 // 1 semana - produto gira rápido, pode trabalhar com estoque menor
    case 'Média':
      return 14 // 2 semanas - giro moderado, estoque médio
    case 'Baixa':
      return 21 // 3 semanas - giro lento, precisa mais segurança
    case 'Sem Saída':
    case 'Sem Dados':
      return 30 // 1 mês - sem histórico, manter estoque de segurança maior
  }
}

/**
 * Retorna emoji/ícone para representar a frequência
 * Útil para interfaces visuais
 */
export function getIconeFrequencia(frequencia: FrequenciaSaida): string {
  switch (frequencia) {
    case 'Alta': return '🟢'
    case 'Média': return '🟡'
    case 'Baixa': return '🔴'
    case 'Sem Saída': return '⚪'
    case 'Sem Dados': return '⚫'
  }
}

/**
 * Retorna descrição detalhada da frequência
 */
export function getDescricaoFrequencia(frequencia: FrequenciaSaida): string {
  switch (frequencia) {
    case 'Alta':
      return 'Produto com alta frequência de saída (≥70% dos dias). Giro rápido, pode trabalhar com estoque menor.'
    case 'Média':
      return 'Produto com frequência média de saída (40-69% dos dias). Giro moderado, manter estoque médio.'
    case 'Baixa':
      return 'Produto com baixa frequência de saída (<40% dos dias). Giro lento, avaliar necessidade de manter em estoque.'
    case 'Sem Saída':
      return 'Produto sem saída no período analisado. Avaliar se vale manter em estoque.'
    case 'Sem Dados':
      return 'Dados insuficientes para calcular frequência de saída.'
  }
}
