import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function investigar() {
  try {
    console.log('🔍 Investigando tabela Movimentacao_DRP\n')

    // 1. Verificar em TODOS os schemas
    console.log('1. Buscando em todos os schemas...')
    const todosSchemas = await pool.query(`
      SELECT 
        table_schema,
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_name ILIKE '%movimentacao%'
      ORDER BY table_schema, table_name
    `)

    console.log(`   Encontradas ${todosSchemas.rows.length} tabelas:\n`)
    for (const t of todosSchemas.rows) {
      console.log(`   ${t.table_schema}.${t.table_name} (${t.table_type})`)
    }

    // 2. Verificar especificamente Movimentacao_DRP
    console.log('\n2. Verificando "Movimentacao_DRP" especificamente...')
    const especifico = await pool.query(`
      SELECT 
        table_schema,
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_name = 'Movimentacao_DRP'
    `)

    if (especifico.rows.length > 0) {
      console.log(`   ✅ Encontrada em: ${especifico.rows[0].table_schema}`)
    } else {
      console.log('   ❌ NÃO ENCONTRADA!')
    }

    // 3. Verificar case-sensitive
    console.log('\n3. Verificando variações de case...')
    const variacoes = ['Movimentacao_DRP', 'movimentacao_drp', 'MOVIMENTACAO_DRP', 'Movimentacao_Drp']
    
    for (const nome of variacoes) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'auditoria_integracao' 
          AND table_name = $1
        )
      `, [nome])
      console.log(`   "${nome}": ${result.rows[0].exists ? '✅ EXISTE' : '❌ não existe'}`)
    }

    // 4. Listar TODAS as tabelas do schema auditoria_integracao
    console.log('\n4. Todas as tabelas em auditoria_integracao:')
    const todasTabelas = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'auditoria_integracao'
      ORDER BY table_name
    `)

    for (const t of todasTabelas.rows) {
      console.log(`   - ${t.table_name}`)
    }

    console.log('\n✅ Investigação concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

investigar()
