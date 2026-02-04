/**
 * Mapa de códigos de filiais para nomes
 */
export const FILIAIS_MAP: Record<string, string> = {
  '00': 'Petrolina',
  '01': 'Juazeiro',
  '02': 'Salgueiro',
  '05': 'Bonfim',
  '06': 'Picos'
}

/**
 * Código da filial do Centro de Distribuição
 * (sem faturamento, apenas distribui)
 */
export const CD_FILIAL = '04'

/**
 * Código da filial de Garantia
 * (não entra no DRP)
 */
export const FILIAL_GARANTIA = '03'

/**
 * Ordem de prioridade das filiais para distribuição
 * Usado quando há déficit de estoque
 */
export const PRIORIDADE_FILIAIS = ['00', '01', '02', '05', '06']

/**
 * Tipos de movimento no banco de dados
 */
export const TIPO_MOVIMENTO = {
  VENDA: '55',
  ENTRADA_NF: '01'
} as const

/**
 * Limites de período para análise DRP
 */
export const LIMITES_PERIODO = {
  MIN_DIAS: 7,
  MAX_DIAS: 365,
  PADRAO_DIAS: 90
} as const

/**
 * Capacidade padrão de ceder estoque no DRP Interfilial
 * (porcentagem do estoque que uma filial pode ceder)
 */
export const CAP_PORCENTAGEM_PADRAO = 30

/**
 * Limites de classificação Curva ABC
 * (baseado em frequência de vendas)
 */
export const CURVA_ABC = {
  A_MIN: 0.75, // >= 75% dos dias com venda
  B_MIN: 0.50, // >= 50% e < 75%
  C_MIN: 0.00  // < 50%
} as const

/**
 * Status de distribuição DRP
 */
export const STATUS_DRP = {
  OK: 'ok',           // Estoque suficiente
  RATEIO: 'rateio',   // Estoque insuficiente, distribuição proporcional
  DEFICIT: 'deficit'  // Sem estoque
} as const

/**
 * Retorna lista de filiais válidas para DRP
 * (exclui CD e Garantia)
 */
export function getFiliaisValidas(): string[] {
  return Object.keys(FILIAIS_MAP)
}

/**
 * Retorna lista de filiais excluindo a filial especificada
 */
export function getFiliaisExceto(filialExcluir: string): string[] {
  return Object.keys(FILIAIS_MAP).filter(f => f !== filialExcluir)
}

/**
 * Valida se uma filial existe
 */
export function isFilialValida(codFilial: string): boolean {
  return codFilial in FILIAIS_MAP || codFilial === CD_FILIAL || codFilial === FILIAL_GARANTIA
}

/**
 * Valida período de análise
 */
export function validarPeriodo(periodoDias: number): { valido: boolean; erro?: string } {
  if (!periodoDias) {
    return { valido: false, erro: 'Período é obrigatório' }
  }
  if (periodoDias < LIMITES_PERIODO.MIN_DIAS) {
    return { valido: false, erro: `Período mínimo: ${LIMITES_PERIODO.MIN_DIAS} dias` }
  }
  if (periodoDias > LIMITES_PERIODO.MAX_DIAS) {
    return { valido: false, erro: `Período máximo: ${LIMITES_PERIODO.MAX_DIAS} dias` }
  }
  return { valido: true }
}
