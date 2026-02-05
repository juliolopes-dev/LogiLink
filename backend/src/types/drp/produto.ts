/**
 * DTOs para DRP por Produto
 */

import { FiltrosDRP, PaginacaoDRP, ProdutoAnalise, Response, ResultadoPaginadoDRP } from './comum'

/**
 * Request para calcular DRP por Produto
 */
export interface CalcularDRPProdutoRequest {
  periodo_dias: number
  filial_origem?: string
  filtros?: FiltrosDRP
  paginacao?: PaginacaoDRP
}

/**
 * Response do cálculo de DRP por Produto
 */
export type CalcularDRPProdutoResponse = Response<ResultadoPaginadoDRP>
