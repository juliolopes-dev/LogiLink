/**
 * Script para verificar estrutura da tabela Fornecedor
 */

import poolAuditoria from '../src/lib/database-auditoria'

async function verificarFornecedor() {
  try {
    console.log('🔍 Verificando tabela Fornecedor...\n')

    // Verificar search_path
    const searchPathResult = await poolAuditoria.query(`SHOW search_path`)
    console.log('🔍 Search path:', searchPathResult.rows[0])

    // Buscar em todos os schemas
    const schemasResult = await poolAuditoria.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name ILIKE '%fornecedor%'
    `)

    console.log('📋 Tabelas encontradas:')
    console.log(schemasResult.rows)
    console.log('')

    if (schemasResult.rows.length > 0) {
      for (const table of schemasResult.rows) {
        console.log(`\n📊 Estrutura de ${table.table_schema}.${table.table_name}:`)
        
        const columnsResult = await poolAuditoria.query(`
          SELECT column_name, data_type, character_maximum_length
          FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position
        `, [table.table_schema, table.table_name])

        console.table(columnsResult.rows)

        // Buscar exemplo de dados
        console.log(`\n📝 Exemplo de dados:`)
        const dataResult = await poolAuditoria.query(`
          SELECT * FROM ${table.table_schema}."${table.table_name}"
          LIMIT 3
        `)
        console.table(dataResult.rows)
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
  }
}

verificarFornecedor()
