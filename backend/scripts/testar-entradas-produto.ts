import { Pool } from 'pg'

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function testarEntradas() {
  try {
    console.log('🔍 Testando query de entradas do produto 058022...\n')

    // Query exata que está no código
    const resultado = await poolAuditoria.query(`
      SELECT 
        EXTRACT(MONTH FROM data_movimento) as mes,
        EXTRACT(YEAR FROM data_movimento) as ano,
        COALESCE(SUM(quantidade), 0) as total
      FROM auditoria_integracao."Movimentacao_DRP"
      WHERE cod_produto = $1
        AND tipo_movimento = '01'
        AND data_movimento >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY EXTRACT(YEAR FROM data_movimento), EXTRACT(MONTH FROM data_movimento)
      ORDER BY ano DESC, mes DESC
    `, ['058022'])

    console.log('📊 Resultado da query (tipo_movimento = 01 - Entrada NF):')
    console.log(JSON.stringify(resultado.rows, null, 2))
    console.log(`\nTotal de meses com entrada: ${resultado.rows.length}`)

    // Agora testar com tipo_agente = 'F' (código antigo)
    console.log('\n\n🔍 Testando query ANTIGA (tipo_agente = F)...\n')
    
    const resultadoAntigo = await poolAuditoria.query(`
      SELECT 
        EXTRACT(MONTH FROM data_movimento) as mes,
        EXTRACT(YEAR FROM data_movimento) as ano,
        COALESCE(SUM(quantidade), 0) as total
      FROM auditoria_integracao."Movimentacao_DRP"
      WHERE cod_produto = $1
        AND tipo_agente = 'F'
        AND data_movimento >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY EXTRACT(YEAR FROM data_movimento), EXTRACT(MONTH FROM data_movimento)
      ORDER BY ano DESC, mes DESC
    `, ['058022'])

    console.log('📊 Resultado da query ANTIGA (tipo_agente = F):')
    console.log(JSON.stringify(resultadoAntigo.rows, null, 2))
    console.log(`\nTotal de meses com entrada: ${resultadoAntigo.rows.length}`)

    // Verificar dezembro especificamente
    console.log('\n\n🔍 Verificando dezembro/2024 especificamente...\n')
    
    const dezembroNF = await poolAuditoria.query(`
      SELECT 
        tipo_movimento,
        descricao_tipo_movimento,
        COUNT(*) as qtd_movimentacoes,
        SUM(quantidade) as total_quantidade
      FROM auditoria_integracao."Movimentacao_DRP"
      WHERE cod_produto = '058022'
        AND EXTRACT(MONTH FROM data_movimento) = 12
        AND EXTRACT(YEAR FROM data_movimento) = 2024
      GROUP BY tipo_movimento, descricao_tipo_movimento
      ORDER BY tipo_movimento
    `)

    console.log('📊 Movimentações em dezembro/2024:')
    console.log(JSON.stringify(dezembroNF.rows, null, 2))

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
  }
}

testarEntradas()
