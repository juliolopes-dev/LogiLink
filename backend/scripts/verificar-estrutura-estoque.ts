import { Pool } from 'pg'

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function verificarEstrutura() {
  try {
    console.log('🔍 Verificando estrutura das tabelas de estoque...\n')

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
        AND table_name = 'auditoria_estoque_petrolina'
      ORDER BY ordinal_position
    `)

    console.log('📋 Estrutura da tabela auditoria_estoque_petrolina:\n')
    estrutura.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : ''
      console.log(`  ${col.column_name.padEnd(30)} ${col.data_type}${length.padEnd(10)} ${nullable}`)
    })

    // Exemplo de dados
    console.log('\n\n📊 Exemplo de 3 registros:\n')
    
    const exemplo = await poolAuditoria.query(`
      SELECT *
      FROM auditoria_integracao.auditoria_estoque_petrolina
      ORDER BY data_extracao DESC
      LIMIT 3
    `)

    exemplo.rows.forEach((row, index) => {
      console.log(`\n--- Registro ${index + 1} ---`)
      Object.keys(row).forEach(key => {
        console.log(`  ${key}: ${row[key]}`)
      })
    })

    // Contar registros por filial
    console.log('\n\n📊 Registros por filial:\n')
    
    const filiais = ['petrolina', 'juazeiro', 'salgueiro', 'bonfim', 'picos']
    let totalGeral = 0

    for (const filial of filiais) {
      const count = await poolAuditoria.query(`
        SELECT COUNT(*) as total
        FROM auditoria_integracao.auditoria_estoque_${filial}
      `)
      const total = parseInt(count.rows[0].total)
      totalGeral += total
      console.log(`  ${filial.padEnd(15)} ${total.toString().padStart(10)} registros`)
    }

    console.log(`\n  ${'TOTAL'.padEnd(15)} ${totalGeral.toString().padStart(10)} registros`)

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
  }
}

verificarEstrutura()
