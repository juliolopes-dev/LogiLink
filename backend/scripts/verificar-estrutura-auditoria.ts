import { Pool } from 'pg'

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function verificarEstrutura() {
  try {
    console.log('🔍 Verificando estrutura das tabelas de auditoria...\n')

    // Primeiro, listar todos os schemas
    const schemas = await poolAuditoria.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `)

    console.log('📁 Schemas disponíveis:')
    schemas.rows.forEach((row: any) => console.log(`  - ${row.schema_name}`))
    console.log('')

    // Verificar se as tabelas existem em qualquer schema
    const tabelas = await poolAuditoria.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%mov%' OR table_name LIKE '%auditoria%'
      ORDER BY table_schema, table_name
    `)

    console.log('📋 Tabelas encontradas (relacionadas a movimentação/auditoria):')
    tabelas.rows.forEach((row: any) => console.log(`  - ${row.table_schema}.${row.table_name}`))
    console.log('')

    if (tabelas.rows.length === 0) {
      console.log('❌ Nenhuma tabela de auditoria encontrada!')
      
      // Listar TODAS as tabelas para debug
      const todasTabelas = await poolAuditoria.query(`
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
        LIMIT 20
      `)
      
      console.log('\n📊 Primeiras 20 tabelas no schema public:')
      todasTabelas.rows.forEach((row: any) => console.log(`  - ${row.table_name}`))
      
      await poolAuditoria.end()
      return
    }

    // Verificar estrutura da primeira tabela de movimentação
    const tabelaMov = tabelas.rows.find((r: any) => r.table_name.includes('auditoria_mov'))
    if (!tabelaMov) {
      console.log('❌ Nenhuma tabela auditoria_mov encontrada!')
      await poolAuditoria.end()
      return
    }

    const primeiraTabela = tabelaMov.table_name
    const schema = tabelaMov.table_schema
    console.log(`📊 Estrutura da tabela: ${schema}.${primeiraTabela}\n`)

    const colunas = await poolAuditoria.query(`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = $1 
      AND table_name = $2
      ORDER BY ordinal_position
    `, [schema, primeiraTabela])

    console.log('Colunas:')
    colunas.rows.forEach(col => {
      const tipo = col.character_maximum_length 
        ? `${col.data_type}(${col.character_maximum_length})`
        : col.data_type
      console.log(`  - ${col.column_name.padEnd(30)} ${tipo.padEnd(20)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`)
    })

    console.log('\n📈 Total de colunas:', colunas.rows.length)

    // Contar registros apenas nas tabelas de movimentação
    console.log('\n📊 Quantidade de registros por tabela de movimentação:')
    const tabelasMov = tabelas.rows.filter((r: any) => r.table_name.includes('auditoria_mov'))
    for (const tabela of tabelasMov) {
      const count = await poolAuditoria.query(`SELECT COUNT(*) as total FROM ${tabela.table_schema}.${tabela.table_name}`)
      console.log(`  - ${tabela.table_name.padEnd(35)} ${Number(count.rows[0].total).toLocaleString('pt-BR')} registros`)
    }

    // Verificar se todas as tabelas de movimentação têm a mesma estrutura
    console.log('\n🔄 Verificando consistência entre tabelas de movimentação...')
    let estruturaBase = colunas.rows.map((c: any) => c.column_name).sort()
    let todasIguais = true

    for (const tabela of tabelasMov.slice(1)) {
      const cols = await poolAuditoria.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1 
        AND table_name = $2
        ORDER BY column_name
      `, [tabela.table_schema, tabela.table_name])

      const estruturaAtual = cols.rows.map((c: any) => c.column_name).sort()
      
      if (JSON.stringify(estruturaBase) !== JSON.stringify(estruturaAtual)) {
        console.log(`  ⚠️  ${tabela.table_name} tem estrutura DIFERENTE!`)
        todasIguais = false
      }
    }

    if (todasIguais) {
      console.log('  ✅ Todas as tabelas de movimentação têm a mesma estrutura!')
    }

    console.log('\n✅ Verificação concluída!')

  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error)
  } finally {
    await poolAuditoria.end()
  }
}

verificarEstrutura()
