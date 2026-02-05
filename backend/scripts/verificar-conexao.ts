/**
 * Script para verificar conexão do banco de dados
 */

import poolAuditoria from '../src/lib/database-auditoria'

async function verificarConexao() {
  try {
    console.log('🔍 Verificando conexão do banco de dados...\n')

    // Verificar banco atual
    const dbResult = await poolAuditoria.query(`SELECT current_database(), current_schema()`)
    console.log('📊 Banco de dados atual:', dbResult.rows[0])

    // Verificar se a tabela Fornecedor existe
    const tabelaResult = await poolAuditoria.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'Fornecedor'
    `)
    
    console.log('\n📋 Tabela Fornecedor encontrada:')
    console.table(tabelaResult.rows)

    if (tabelaResult.rows.length > 0) {
      const schema = tabelaResult.rows[0].table_schema
      const table = tabelaResult.rows[0].table_name
      
      // Testar query com a tabela
      console.log(`\n🧪 Testando query na tabela ${schema}.${table}:`)
      const testResult = await poolAuditoria.query(`
        SELECT codfornec, nome 
        FROM "${table}"
        WHERE codfornec = '000048'
        LIMIT 1
      `)
      
      console.log('Resultado:')
      console.table(testResult.rows)
    } else {
      console.log('⚠️  Tabela Fornecedor NÃO encontrada neste banco!')
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
  }
}

verificarConexao()
