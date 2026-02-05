import { Pool } from 'pg'
import poolAuditoria from '../../lib/database-auditoria'

/**
 * Cache de múltiplos de venda para evitar queries repetidas
 */
const cacheMultiplos = new Map<string, number>()

/**
 * Busca o múltiplo de venda configurado para um produto
 * 
 * @param codProduto - Código do produto
 * @param pool - Pool de conexão (padrão: poolAuditoria)
 * @param useCache - Se deve usar cache (padrão: true)
 * @returns Múltiplo de venda (padrão: 1)
 */
export async function buscarMultiploVenda(
  codProduto: string, 
  pool: Pool = poolAuditoria,
  useCache = true
): Promise<number> {
  // Verificar cache
  if (useCache && cacheMultiplos.has(codProduto)) {
    return cacheMultiplos.get(codProduto)!
  }

  // Buscar no banco
  const resultado = await pool.query(`
    SELECT multiplo_venda 
    FROM auditoria_integracao."Produto_Config_DRP"
    WHERE cod_produto = $1 AND ativo = TRUE
  `, [codProduto])

  const multiplo = resultado.rows[0]?.multiplo_venda || 1

  // Salvar no cache
  if (useCache) {
    cacheMultiplos.set(codProduto, multiplo)
  }

  return multiplo
}

/**
 * Busca múltiplos de venda para vários produtos de uma vez
 * 
 * @param codProdutos - Array de códigos de produtos
 * @param pool - Pool de conexão (padrão: poolAuditoria)
 * @returns Map com código do produto e seu múltiplo
 */
export async function buscarMultiplosVenda(
  codProdutos: string[],
  pool: Pool = poolAuditoria
): Promise<Map<string, number>> {
  const resultado = await pool.query(`
    SELECT cod_produto, multiplo_venda
    FROM auditoria_integracao."Produto_Config_DRP"
    WHERE cod_produto = ANY($1) AND ativo = TRUE
  `, [codProdutos])

  const mapMultiplos = new Map<string, number>()

  // Adicionar produtos encontrados
  for (const row of resultado.rows) {
    mapMultiplos.set(row.cod_produto, row.multiplo_venda)
    cacheMultiplos.set(row.cod_produto, row.multiplo_venda)
  }

  // Adicionar produtos não encontrados com múltiplo padrão
  for (const codProduto of codProdutos) {
    if (!mapMultiplos.has(codProduto)) {
      mapMultiplos.set(codProduto, 1)
      cacheMultiplos.set(codProduto, 1)
    }
  }

  return mapMultiplos
}

/**
 * Limpa o cache de múltiplos
 * Útil após atualizar configurações
 */
export function limparCacheMultiplos(): void {
  cacheMultiplos.clear()
}

/**
 * Remove um produto específico do cache
 */
export function removerDoCache(codProduto: string): void {
  cacheMultiplos.delete(codProduto)
}
