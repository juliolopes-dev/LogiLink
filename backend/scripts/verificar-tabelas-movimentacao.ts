import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function verificarTabelas() {
  try {
    console.log('🔍 Verificando tabelas de movimentação\n')

    const tabelas = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'auditoria_integracao'
        AND (table_name LIKE '%mov%' OR table_name LIKE '%Mov%')
      ORDER BY table_name
    `)

    console.log('📊 Tabelas encontradas:\n')
    for (const t of tabelas.rows) {
      const count = await pool.query(`SELECT COUNT(*) FROM auditoria_integracao."${t.table_name}"`)
      console.log(`  ${t.table_name.padEnd(35)} ${count.rows[0].count} registros`)
    }

    console.log('\n✅ Verificação concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

verificarTabelas()
