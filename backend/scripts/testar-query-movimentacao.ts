import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function testarQuery() {
  try {
    console.log('🧪 Testando query de movimentação\n')

    // Testar se a tabela existe
    console.log('1. Verificando se tabela existe...')
    const existe = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'auditoria_integracao' 
        AND table_name = 'Movimentacao_DRP'
      )
    `)
    console.log(`   Tabela existe: ${existe.rows[0].exists}\n`)

    // Testar query simples
    console.log('2. Testando query simples...')
    const simples = await pool.query(`
      SELECT COUNT(*) FROM auditoria_integracao."Movimentacao_DRP"
    `)
    console.log(`   Total de registros: ${simples.rows[0].count}\n`)

    // Testar query com filtros (igual à que está falhando)
    console.log('3. Testando query com filtros...')
    const comFiltros = await pool.query(`
      SELECT 
        cod_filial,
        COALESCE(SUM(quantidade), 0) as total_vendas
      FROM auditoria_integracao."Movimentacao_DRP"
      WHERE cod_produto = $1
        AND tipo_movimento = '55'
        AND data_movimento >= CURRENT_DATE - INTERVAL '1 day' * $2
        AND cod_filial != '03'
      GROUP BY cod_filial
      ORDER BY cod_filial
    `, ['008612', 30])
    
    console.log(`   Registros encontrados: ${comFiltros.rows.length}`)
    if (comFiltros.rows.length > 0) {
      console.log('   Exemplo:', comFiltros.rows[0])
    }

    console.log('\n✅ Query funcionando!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

testarQuery()
