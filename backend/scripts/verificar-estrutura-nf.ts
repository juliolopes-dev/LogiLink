import { Pool } from 'pg'

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function verificarEstrutura() {
  try {
    console.log('🔍 Verificando estrutura da tabela auditoria_nf_entrada_bonfim...\n')

    // Buscar estrutura da tabela
    const estrutura = await poolAuditoria.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'auditoria_integracao'
        AND table_name = 'auditoria_nf_entrada_bonfim'
      ORDER BY ordinal_position
    `)

    console.log('📋 Estrutura da tabela:\n')
    estrutura.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : ''
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ''
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type}${length.padEnd(10)} ${nullable}${defaultVal}`)
    })

    // Verificar se existem outras tabelas de NF
    console.log('\n\n🔍 Verificando outras tabelas de NF entrada...\n')
    
    const tabelas = await poolAuditoria.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'auditoria_integracao'
        AND table_name LIKE 'auditoria_nf_entrada%'
      ORDER BY table_name
    `)

    console.log('📊 Tabelas encontradas:')
    tabelas.rows.forEach(t => {
      console.log(`  - ${t.table_name}`)
    })

    // Contar registros
    console.log('\n\n📊 Contagem de registros por tabela:\n')
    
    for (const tabela of tabelas.rows) {
      const count = await poolAuditoria.query(`
        SELECT COUNT(*) as total
        FROM auditoria_integracao."${tabela.table_name}"
      `)
      console.log(`  ${tabela.table_name.padEnd(40)} ${count.rows[0].total.padStart(10)} registros`)
    }

    // Exemplo de dados
    console.log('\n\n📋 Exemplo de 3 registros da tabela auditoria_nf_entrada_bonfim:\n')
    
    const exemplo = await poolAuditoria.query(`
      SELECT *
      FROM auditoria_integracao.auditoria_nf_entrada_bonfim
      ORDER BY data_emissao DESC
      LIMIT 3
    `)

    exemplo.rows.forEach((row, index) => {
      console.log(`\n--- Registro ${index + 1} ---`)
      Object.keys(row).forEach(key => {
        console.log(`  ${key}: ${row[key]}`)
      })
    })

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
  }
}

verificarEstrutura()
