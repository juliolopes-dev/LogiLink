import { Pool } from 'pg'

// Pool de conexão para o banco de auditoria
const poolAuditoria = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DATABASE_AUDITORIA_URL || 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  query_timeout: 30000,
  statement_timeout: 30000,
})

// Evento de erro
poolAuditoria.on('error', (err) => {
  console.error('Erro inesperado no pool de auditoria:', err)
})

// Função helper para buscar movimentações da VIEW
export async function buscarMovimentacoes(filtros: {
  codProduto?: string
  codFilial?: string
  dataInicio?: Date
  dataFim?: Date
  tipoMovimento?: string
  limit?: number
}) {
  const conditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (filtros.codProduto) {
    conditions.push(`cod_produto = $${paramIndex}`)
    params.push(filtros.codProduto)
    paramIndex++
  }

  if (filtros.codFilial) {
    conditions.push(`cod_filial = $${paramIndex}`)
    params.push(filtros.codFilial)
    paramIndex++
  }

  if (filtros.dataInicio) {
    conditions.push(`data_movimento >= $${paramIndex}`)
    params.push(filtros.dataInicio)
    paramIndex++
  }

  if (filtros.dataFim) {
    conditions.push(`data_movimento <= $${paramIndex}`)
    params.push(filtros.dataFim)
    paramIndex++
  }

  if (filtros.tipoMovimento) {
    conditions.push(`tipo_movimento = $${paramIndex}`)
    params.push(filtros.tipoMovimento)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limitClause = filtros.limit ? `LIMIT ${filtros.limit}` : ''

  const query = `
    SELECT 
      id,
      cod_filial,
      cod_produto,
      data_movimento,
      tipo_movimento,
      quantidade,
      valor_custo,
      valor_medio,
      valor_venda,
      valor_entrada,
      numero_documento,
      tipo_agente,
      cod_agente,
      sequencia,
      hash_registro,
      data_extracao
    FROM auditoria_integracao."Movimentacao_DRP"
    ${whereClause}
    ORDER BY data_movimento DESC
    ${limitClause}
  `

  const result = await poolAuditoria.query(query, params)
  return result.rows
}

// Função para buscar vendas de um produto por período
export async function buscarVendasProduto(
  codProduto: string,
  periodoDias: number,
  codFilial?: string
) {
  const params: any[] = [codProduto, periodoDias]
  let filialCondition = ''

  if (codFilial) {
    filialCondition = 'AND cod_filial = $3'
    params.push(codFilial)
  }

  const query = `
    SELECT 
      cod_filial,
      data_movimento,
      quantidade,
      valor_venda
    FROM auditoria_integracao."Movimentacao_DRP"
    WHERE cod_produto = $1
      AND tipo_movimento = 'V'
      AND data_movimento >= CURRENT_DATE - INTERVAL '1 day' * $2
      ${filialCondition}
    ORDER BY data_movimento DESC
  `

  const result = await poolAuditoria.query(query, params)
  return result.rows
}

// Função para calcular média de vendas por filial
export async function calcularMediaVendasPorFilial(
  codProduto: string,
  periodoDias: number
) {
  const query = `
    SELECT 
      cod_filial,
      COUNT(*) as total_movimentacoes,
      SUM(quantidade) as total_vendido,
      AVG(quantidade) as media_vendas,
      STDDEV(quantidade) as desvio_padrao
    FROM auditoria_integracao."Movimentacao_DRP"
    WHERE cod_produto = $1
      AND tipo_movimento = 'V'
      AND data_movimento >= CURRENT_DATE - INTERVAL '1 day' * $2
    GROUP BY cod_filial
    ORDER BY cod_filial
  `

  const result = await poolAuditoria.query(query, [codProduto, periodoDias])
  return result.rows
}

// Função para buscar histórico de movimentações agregado por mês
export async function buscarHistoricoMensal(
  codProduto: string,
  meses: number = 6
) {
  const query = `
    SELECT 
      cod_filial,
      DATE_TRUNC('month', data_movimento) as mes,
      tipo_movimento,
      SUM(quantidade) as quantidade_total,
      COUNT(*) as total_movimentacoes
    FROM auditoria_integracao."Movimentacao_DRP"
    WHERE cod_produto = $1
      AND data_movimento >= CURRENT_DATE - INTERVAL '1 month' * $2
    GROUP BY cod_filial, DATE_TRUNC('month', data_movimento), tipo_movimento
    ORDER BY mes DESC, cod_filial, tipo_movimento
  `

  const result = await poolAuditoria.query(query, [codProduto, meses])
  return result.rows
}

// ============================================
// FUNÇÕES PARA NF ENTRADA
// ============================================

export async function buscarNFEntrada(filtros: {
  codProduto?: string
  codFornecedor?: string
  numeroNota?: string
  codFilial?: string
  dataInicio?: Date
  dataFim?: Date
  limit?: number
  offset?: number
}) {
  const conditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (filtros.codProduto) {
    conditions.push(`cod_produto = $${paramIndex}`)
    params.push(filtros.codProduto)
    paramIndex++
  }

  if (filtros.codFornecedor) {
    conditions.push(`cod_fornecedor = $${paramIndex}`)
    params.push(filtros.codFornecedor)
    paramIndex++
  }

  if (filtros.numeroNota) {
    conditions.push(`numero_nota = $${paramIndex}`)
    params.push(filtros.numeroNota)
    paramIndex++
  }

  if (filtros.codFilial) {
    conditions.push(`cod_filial = $${paramIndex}`)
    params.push(filtros.codFilial)
    paramIndex++
  }

  if (filtros.dataInicio) {
    conditions.push(`data_emissao >= $${paramIndex}`)
    params.push(filtros.dataInicio)
    paramIndex++
  }

  if (filtros.dataFim) {
    conditions.push(`data_emissao <= $${paramIndex}`)
    params.push(filtros.dataFim)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limitClause = filtros.limit ? `LIMIT $${paramIndex}` : ''
  const offsetClause = filtros.offset ? `OFFSET $${paramIndex + (filtros.limit ? 1 : 0)}` : ''

  if (filtros.limit) {
    params.push(filtros.limit)
    paramIndex++
  }

  if (filtros.offset) {
    params.push(filtros.offset)
  }

  const query = `
    SELECT 
      id,
      cod_filial,
      numero_nota,
      cod_fornecedor,
      cod_produto,
      quantidade,
      preco_custo,
      data_emissao,
      data_entrada,
      hash_registro,
      data_extracao
    FROM auditoria_integracao."NF_Entrada_DRP"
    ${whereClause}
    ORDER BY data_emissao DESC, numero_nota DESC
    ${limitClause}
    ${offsetClause}
  `

  const result = await poolAuditoria.query(query, params)
  return result.rows
}

export async function buscarNFPorNumero(numeroNota: string, codFilial?: string) {
  const conditions = ['numero_nota = $1']
  const params: any[] = [numeroNota]

  if (codFilial) {
    conditions.push('cod_filial = $2')
    params.push(codFilial)
  }

  const query = `
    SELECT 
      id,
      cod_filial,
      numero_nota,
      cod_fornecedor,
      cod_produto,
      quantidade,
      preco_custo,
      data_emissao,
      data_entrada,
      hash_registro,
      data_extracao
    FROM auditoria_integracao."NF_Entrada_DRP"
    WHERE ${conditions.join(' AND ')}
    ORDER BY cod_produto
  `

  const result = await poolAuditoria.query(query, params)
  return result.rows
}

export async function buscarNFPorProduto(codProduto: string, limit: number = 50) {
  const query = `
    SELECT 
      id,
      cod_filial,
      numero_nota,
      cod_fornecedor,
      cod_produto,
      quantidade,
      preco_custo,
      data_emissao,
      data_entrada,
      hash_registro,
      data_extracao
    FROM auditoria_integracao."NF_Entrada_DRP"
    WHERE cod_produto = $1
    ORDER BY data_emissao DESC
    LIMIT $2
  `

  const result = await poolAuditoria.query(query, [codProduto, limit])
  return result.rows
}

export async function buscarNFPorFornecedor(codFornecedor: string, limit: number = 100) {
  const query = `
    SELECT 
      id,
      cod_filial,
      numero_nota,
      cod_fornecedor,
      cod_produto,
      quantidade,
      preco_custo,
      data_emissao,
      data_entrada,
      hash_registro,
      data_extracao
    FROM auditoria_integracao."NF_Entrada_DRP"
    WHERE cod_fornecedor = $1
    ORDER BY data_emissao DESC
    LIMIT $2
  `

  const result = await poolAuditoria.query(query, [codFornecedor, limit])
  return result.rows
}

// ============================================
// FUNÇÕES PARA ESTOQUE HISTÓRICO
// ============================================

export async function buscarEstoqueHistorico(filtros: {
  codProduto?: string
  codFilial?: string
  dataInicio?: Date
  dataFim?: Date
  limit?: number
  offset?: number
}) {
  const conditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (filtros.codProduto) {
    conditions.push(`cod_produto = $${paramIndex}`)
    params.push(filtros.codProduto)
    paramIndex++
  }

  if (filtros.codFilial) {
    conditions.push(`cod_filial = $${paramIndex}`)
    params.push(filtros.codFilial)
    paramIndex++
  }

  if (filtros.dataInicio) {
    conditions.push(`data_extracao >= $${paramIndex}`)
    params.push(filtros.dataInicio)
    paramIndex++
  }

  if (filtros.dataFim) {
    conditions.push(`data_extracao <= $${paramIndex}`)
    params.push(filtros.dataFim)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limitClause = filtros.limit ? `LIMIT $${paramIndex}` : ''
  const offsetClause = filtros.offset ? `OFFSET $${paramIndex + (filtros.limit ? 1 : 0)}` : ''

  if (filtros.limit) {
    params.push(filtros.limit)
    paramIndex++
  }

  if (filtros.offset) {
    params.push(filtros.offset)
  }

  const query = `
    SELECT 
      id,
      cod_filial,
      cod_produto,
      estoque,
      quantidade_bloqueada,
      preco_custo,
      preco_medio,
      data_calculo_custo,
      estoque_minimo,
      hash_registro,
      data_extracao
    FROM auditoria_integracao."Estoque_DRP"
    ${whereClause}
    ORDER BY data_extracao DESC
    ${limitClause}
    ${offsetClause}
  `

  const result = await poolAuditoria.query(query, params)
  return result.rows
}

export async function buscarEstoquePorProduto(codProduto: string, limit: number = 30) {
  const query = `
    SELECT 
      id,
      cod_filial,
      cod_produto,
      estoque,
      quantidade_bloqueada,
      preco_custo,
      preco_medio,
      data_calculo_custo,
      estoque_minimo,
      hash_registro,
      data_extracao
    FROM auditoria_integracao."Estoque_DRP"
    WHERE cod_produto = $1
    ORDER BY data_extracao DESC, cod_filial
    LIMIT $2
  `

  const result = await poolAuditoria.query(query, [codProduto, limit])
  return result.rows
}

export async function buscarEstoquePorFilial(codFilial: string, limit: number = 100) {
  const query = `
    SELECT 
      id,
      cod_filial,
      cod_produto,
      estoque,
      quantidade_bloqueada,
      preco_custo,
      preco_medio,
      data_calculo_custo,
      estoque_minimo,
      hash_registro,
      data_extracao
    FROM auditoria_integracao."Estoque_DRP"
    WHERE cod_filial = $1
    ORDER BY data_extracao DESC
    LIMIT $2
  `

  const result = await poolAuditoria.query(query, [codFilial, limit])
  return result.rows
}

export async function buscarUltimoEstoque(codProduto: string, codFilial?: string) {
  const conditions = ['cod_produto = $1']
  const params: any[] = [codProduto]

  if (codFilial) {
    conditions.push('cod_filial = $2')
    params.push(codFilial)
  }

  const query = `
    SELECT 
      id,
      cod_filial,
      cod_produto,
      estoque,
      quantidade_bloqueada,
      preco_custo,
      preco_medio,
      data_calculo_custo,
      estoque_minimo,
      hash_registro,
      data_extracao
    FROM auditoria_integracao."Estoque_DRP"
    WHERE ${conditions.join(' AND ')}
    ORDER BY data_extracao DESC
    LIMIT ${codFilial ? '1' : '10'}
  `

  const result = await poolAuditoria.query(query, params)
  return result.rows
}

// Função para fechar o pool (usar ao desligar o servidor)
export async function closePoolAuditoria() {
  await poolAuditoria.end()
}

export default poolAuditoria
