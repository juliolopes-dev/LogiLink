/**
 * Utilitário para buscar classificação ABC dos produtos por filial
 * Usado no rateio do DRP para priorizar produtos classe A
 */

import { Pool } from 'pg'
import poolAuditoria from '../../lib/database-auditoria'

/**
 * Cache de classificação ABC: { filial -> { produto -> classe } }
 */
export type CacheClasseABC = Record<string, Map<string, 'A' | 'B' | 'C'>>

/**
 * Pesos para distribuição no rateio por classe ABC
 * Classe A recebe proporcionalmente mais, classe C recebe menos
 */
export const PESO_ABC: Record<'A' | 'B' | 'C', number> = {
  A: 1.3,  // +30% de peso
  B: 1.0,  // peso neutro
  C: 0.7   // -30% de peso
}

/**
 * Carrega classificação ABC de TODOS os produtos para as filiais informadas
 * Faz 1 query por filial (eficiente) usando a tabela estoque_minimo
 * Produtos sem classificação recebem 'B' (neutro)
 */
export async function carregarClassificacaoABC(
  filiais: string[],
  pool: Pool = poolAuditoria
): Promise<CacheClasseABC> {
  const cache: CacheClasseABC = {}

  for (const filial of filiais) {
    const result = await pool.query(`
      SELECT cod_produto, classe_abc
      FROM auditoria_integracao.estoque_minimo
      WHERE cod_filial = $1
        AND metodo = 'automatico'
        AND classe_abc IS NOT NULL
    `, [filial])

    cache[filial] = new Map()
    for (const row of result.rows) {
      cache[filial].set(row.cod_produto, row.classe_abc as 'A' | 'B' | 'C')
    }
  }

  return cache
}

/**
 * Busca classe ABC de um produto em uma filial específica
 * Retorna 'B' como fallback (peso neutro) se não encontrar
 */
export function getClasseABC(
  cache: CacheClasseABC,
  codProduto: string,
  codFilial: string
): 'A' | 'B' | 'C' {
  return cache[codFilial]?.get(codProduto) || 'B'
}
