import { Pool } from 'pg'

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function verificarTabelaProdutos() {
  try {
    console.log('🔍 Verificando tabelas de produtos no banco de auditoria...\n')

    const tabelas = await poolAuditoria.query(`
      SELECT 
        table_schema,
        table_name,
        table_type
      FROM information_schema.tables
      WHERE (table_name ILIKE '%produto%' OR table_name ILIKE '%dim%')
      ORDER BY table_schema, table_name
    `)

    console.log(`📋 Tabelas encontradas: ${tabelas.rows.length}\n`)
    
    for (const t of tabelas.rows) {
      console.log(`${t.table_schema}.${t.table_name} (${t.table_type})`)
    }

    console.log('\n✅ Verificação concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
  }
}

verificarTabelaProdutos()
