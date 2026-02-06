/**
 * DTOs comuns usados por todos os DRPs
 */

/**
 * Análise de uma filial no DRP
 */
export interface FilialAnalise {
  cod_filial: string
  nome: string
  estoque_atual: number
  estoque_minimo?: number
  saida_periodo: number
  meta: number
  necessidade: number
  alocacao_sugerida: number
  media_vendas?: number
  desvio_padrao?: number
  coeficiente_variacao?: number
  tem_pico?: boolean
  classe_abc?: 'A' | 'B' | 'C'
  usou_combinado?: boolean
  usou_estoque_minimo?: boolean
  tem_combinado_estoque?: boolean
  estoque_combinado?: number
  necessidade_reduzida_por_combinado?: number
  combinados_em_estoque?: Array<{
    cod_produto: string
    descricao: string
    referencia_fabricante: string
    estoque: number
  }>
}

/**
 * Análise de um produto no DRP
 */
export interface ProdutoAnalise {
  cod_produto: string
  descricao: string
  grupo: string
  cod_grupo_combinado: string | null
  estoque_cd: number
  necessidade_total: number
  deficit: number
  status: 'ok' | 'rateio' | 'deficit'
  proporcao_atendimento: number
  grupo_combinado?: string | null
  produtos_combinados?: number
  combinados_disponiveis?: Array<{
    cod_produto: string
    descricao: string
    estoque_cd: number
  }>
  todos_combinados?: Array<{
    cod_produto: string
    descricao: string
    referencia_fabricante: string
    estoque_petrolina: number
    estoque_juazeiro: number
    estoque_salgueiro: number
    estoque_bonfim: number
    estoque_picos: number
  }>
  filiais: FilialAnalise[]
}

/**
 * Filtros comuns para DRP
 */
export interface FiltrosDRP {
  grupo?: string
  fornecedor?: string
  status?: string
  busca?: string
  filiais?: string[]
}

/**
 * Paginação para DRP
 */
export interface PaginacaoDRP {
  pagina?: number      // Página atual (padrão: 1)
  por_pagina?: number  // Itens por página (padrão: 100, máx: 500)
}

/**
 * Resultado paginado do DRP
 */
export interface ResultadoPaginadoDRP {
  produtos: ProdutoAnalise[]
  paginacao: {
    pagina_atual: number
    por_pagina: number
    total_produtos: number
    total_paginas: number
    tem_proxima: boolean
    tem_anterior: boolean
  }
}

/**
 * Response padrão de sucesso
 */
export interface ResponseSucesso<T> {
  success: true
  data: T
}

/**
 * Response padrão de erro
 */
export interface ResponseErro {
  success: false
  error: string
}

/**
 * Response genérico
 */
export type Response<T> = ResponseSucesso<T> | ResponseErro
