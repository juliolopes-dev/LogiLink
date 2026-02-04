import { Pool } from 'pg'

/**
 * Estrutura de mapas de combinados para busca rápida
 */
export interface MapasCombinados {
  produtoParaGrupo: Map<string, string>
  grupoParaProdutos: Map<string, string[]>
}

/**
 * Carrega todos os produtos combinados em memória
 * 
 * @param pool - Pool de conexão com o banco de dados
 * @returns Mapas para busca rápida de grupos e produtos
 */
export async function carregarCombinados(pool: Pool): Promise<MapasCombinados> {
  const resultado = await pool.query(`
    SELECT cod_grupo, cod_produto 
    FROM auditoria_integracao."Produtos_Combinado_DRP"
  `)
  
  const todosCombinados = resultado.rows as Array<{ cod_grupo: string; cod_produto: string }>
  
  const produtoParaGrupo = new Map<string, string>()
  const grupoParaProdutos = new Map<string, string[]>()
  
  for (const c of todosCombinados) {
    produtoParaGrupo.set(c.cod_produto, c.cod_grupo)
    if (!grupoParaProdutos.has(c.cod_grupo)) {
      grupoParaProdutos.set(c.cod_grupo, [])
    }
    grupoParaProdutos.get(c.cod_grupo)!.push(c.cod_produto)
  }
  
  return { produtoParaGrupo, grupoParaProdutos }
}

/**
 * Busca vendas combinadas de um produto (soma de todos produtos do grupo)
 * 
 * @param codProduto - Código do produto
 * @param filial - Código da filial
 * @param periodoDias - Período em dias para análise
 * @param mapas - Mapas de combinados carregados
 * @param pool - Pool de conexão com o banco
 * @returns Vendas do grupo combinado ou 0
 */
export async function buscarVendasCombinadas(
  codProduto: string,
  filial: string,
  periodoDias: number,
  mapas: MapasCombinados,
  pool: Pool
): Promise<number> {
  const grupoCombinado = mapas.produtoParaGrupo.get(codProduto)
  if (!grupoCombinado) return 0
  
  const produtosCombinados = mapas.grupoParaProdutos.get(grupoCombinado) || []
  if (produtosCombinados.length === 0) return 0
  
  const resultado = await pool.query(`
    SELECT COALESCE(SUM(quantidade), 0) as vendas
    FROM (
      SELECT DISTINCT numero_documento, cod_produto, data_movimento::date, sequencia, quantidade
      FROM auditoria_integracao."Movimentacao_DRP"
      WHERE cod_produto = ANY($1)
        AND cod_filial = $2
        AND tipo_movimento = '55'
        AND data_movimento >= CURRENT_DATE - INTERVAL '${periodoDias} days'
      ORDER BY numero_documento, cod_produto, data_movimento::date, sequencia
    ) vendas_unicas
  `, [produtosCombinados, filial])
  
  return parseFloat(resultado.rows[0]?.vendas || '0')
}

/**
 * Busca estoque combinado de um produto (soma de todos produtos do grupo)
 * 
 * @param codProduto - Código do produto
 * @param filial - Código da filial
 * @param mapas - Mapas de combinados carregados
 * @param pool - Pool de conexão com o banco
 * @returns Estoque do grupo combinado ou 0
 */
export async function buscarEstoqueCombinado(
  codProduto: string,
  filial: string,
  mapas: MapasCombinados,
  pool: Pool
): Promise<number> {
  const grupoCombinado = mapas.produtoParaGrupo.get(codProduto)
  if (!grupoCombinado) return 0
  
  const produtosCombinados = mapas.grupoParaProdutos.get(grupoCombinado) || []
  if (produtosCombinados.length === 0) return 0
  
  const resultado = await pool.query(`
    SELECT COALESCE(SUM(estoque), 0) as estoque_disponivel
    FROM auditoria_integracao."Estoque_DRP"
    WHERE cod_produto = ANY($1)
      AND cod_filial = $2
  `, [produtosCombinados, filial])
  
  return parseFloat(resultado.rows[0]?.estoque_disponivel || '0')
}

/**
 * Busca vendas e estoque combinados de uma vez
 * 
 * @param codProduto - Código do produto
 * @param filial - Código da filial
 * @param periodoDias - Período em dias para análise
 * @param mapas - Mapas de combinados carregados
 * @param pool - Pool de conexão com o banco
 * @returns Objeto com vendas e estoque combinados
 */
export async function buscarDadosCombinados(
  codProduto: string,
  filial: string,
  periodoDias: number,
  mapas: MapasCombinados,
  pool: Pool
): Promise<{ vendas: number; estoque: number; grupoCombinado: string | null; quantidadeProdutos: number }> {
  const grupoCombinado = mapas.produtoParaGrupo.get(codProduto)
  if (!grupoCombinado) {
    return { vendas: 0, estoque: 0, grupoCombinado: null, quantidadeProdutos: 0 }
  }
  
  const produtosCombinados = mapas.grupoParaProdutos.get(grupoCombinado) || []
  if (produtosCombinados.length === 0) {
    return { vendas: 0, estoque: 0, grupoCombinado: null, quantidadeProdutos: 0 }
  }
  
  const [vendasResult, estoqueResult] = await Promise.all([
    pool.query(`
      SELECT COALESCE(SUM(quantidade), 0) as vendas
      FROM (
        SELECT DISTINCT numero_documento, cod_produto, data_movimento::date, sequencia, quantidade
        FROM auditoria_integracao."Movimentacao_DRP"
        WHERE cod_produto = ANY($1)
          AND cod_filial = $2
          AND tipo_movimento = '55'
          AND data_movimento >= CURRENT_DATE - INTERVAL '${periodoDias} days'
        ORDER BY numero_documento, cod_produto, data_movimento::date, sequencia
      ) vendas_unicas
    `, [produtosCombinados, filial]),
    pool.query(`
      SELECT COALESCE(SUM(estoque), 0) as estoque_disponivel
      FROM auditoria_integracao."Estoque_DRP"
      WHERE cod_produto = ANY($1)
        AND cod_filial = $2
    `, [produtosCombinados, filial])
  ])
  
  return {
    vendas: parseFloat(vendasResult.rows[0]?.vendas || '0'),
    estoque: parseFloat(estoqueResult.rows[0]?.estoque_disponivel || '0'),
    grupoCombinado,
    quantidadeProdutos: produtosCombinados.length
  }
}
