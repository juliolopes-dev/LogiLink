/**
 * Utilitário para buscar estoque mínimo dinâmico com fallback
 * Reutilizado pelo DRP por NF e DRP por Produto
 */

import { Pool } from 'pg'
import poolAuditoria from '../../lib/database-auditoria'

/**
 * Busca estoque mínimo dinâmico (novo sistema) com fallback para tabela antiga
 * 1º - Busca da tabela estoque_minimo (cálculo automático ABC + tendência + sazonalidade)
 * 2º - Se não encontrar, busca da tabela Estoque_DRP (fallback)
 */
export async function buscarEstoqueMinimoAtualizado(
  codProduto: string,
  codFilial: string,
  pool: Pool = poolAuditoria
): Promise<number> {
  try {
    // 1. Tentar buscar do novo sistema (estoque mínimo dinâmico)
    const resultadoDinamico = await pool.query(`
      SELECT estoque_minimo_calculado
      FROM auditoria_integracao.estoque_minimo
      WHERE cod_produto = $1 
        AND cod_filial = $2
        AND manual = false
      ORDER BY data_calculo DESC
      LIMIT 1
    `, [codProduto, codFilial])

    if (resultadoDinamico.rows.length > 0) {
      return parseFloat(resultadoDinamico.rows[0].estoque_minimo_calculado || '0')
    }

    // 2. Se não encontrar, buscar da tabela antiga (fallback)
    const resultadoAntigo = await pool.query(`
      SELECT COALESCE(estoque_minimo, 0) as estoque_minimo
      FROM auditoria_integracao."Estoque_DRP"
      WHERE cod_produto = $1 AND cod_filial = $2
    `, [codProduto, codFilial])

    return parseFloat(resultadoAntigo.rows[0]?.estoque_minimo || '0')
  } catch (error) {
    console.error(`Erro ao buscar estoque mínimo para ${codProduto}/${codFilial}:`, error)
    return 0
  }
}
