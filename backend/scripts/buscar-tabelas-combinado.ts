import { Pool } from 'pg'

const poolJuaz = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function buscarTabelasCombinad() {
  try {
    console.log('🔍 Buscando tabelas e VIEWs de "combinado" no banco antigo...\n')

    // Buscar tabelas e views
    const tabelas = await poolJuaz.query(`
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name ILIKE '%combinado%')
      ORDER BY table_type, table_name
    `)

    console.log(`📋 Encontradas ${tabelas.rows.length} tabelas/views:\n`)
    
    for (const item of tabelas.rows) {
      console.log(`${item.table_type === 'BASE TABLE' ? '📊' : '👁️ '} ${item.table_name} (${item.table_type})`)
    }

    console.log('\n' + '='.repeat(80))

    // Para cada tabela, buscar estrutura
    for (const item of tabelas.rows) {
      console.log(`\n\n📋 Estrutura de: ${item.table_name} (${item.table_type})`)
      console.log('='.repeat(80))

      if (item.table_type === 'BASE TABLE') {
        // Buscar colunas da tabela
        const colunas = await poolJuaz.query(`
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = $1
          ORDER BY ordinal_position
        `, [item.table_name])

        console.log('\nColunas:')
        for (const col of colunas.rows) {
          const tipo = col.character_maximum_length 
            ? `${col.data_type}(${col.character_maximum_length})`
            : col.data_type
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ''
          console.log(`  - ${col.column_name.padEnd(30)} ${tipo.padEnd(20)} ${nullable}${defaultVal}`)
        }

        // Buscar constraints
        const constraints = await poolJuaz.query(`
          SELECT
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name
          FROM information_schema.table_constraints tc
          LEFT JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.table_schema = 'public'
            AND tc.table_name = $1
          ORDER BY tc.constraint_type, tc.constraint_name
        `, [item.table_name])

        if (constraints.rows.length > 0) {
          console.log('\nConstraints:')
          for (const cons of constraints.rows) {
            console.log(`  - ${cons.constraint_type}: ${cons.constraint_name} (${cons.column_name || 'N/A'})`)
          }
        }

        // Buscar índices
        const indices = await poolJuaz.query(`
          SELECT
            indexname,
            indexdef
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = $1
          ORDER BY indexname
        `, [item.table_name])

        if (indices.rows.length > 0) {
          console.log('\nÍndices:')
          for (const idx of indices.rows) {
            console.log(`  - ${idx.indexname}`)
            console.log(`    ${idx.indexdef}`)
          }
        }

      } else if (item.table_type === 'VIEW') {
        // Buscar definição da VIEW
        const viewDef = await poolJuaz.query(`
          SELECT definition
          FROM pg_views
          WHERE schemaname = 'public'
            AND viewname = $1
        `, [item.table_name])

        if (viewDef.rows.length > 0) {
          console.log('\nDefinição da VIEW:')
          console.log(viewDef.rows[0].definition)
        }

        // Buscar colunas da VIEW
        const colunas = await poolJuaz.query(`
          SELECT 
            column_name,
            data_type
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = $1
          ORDER BY ordinal_position
        `, [item.table_name])

        console.log('\nColunas da VIEW:')
        for (const col of colunas.rows) {
          console.log(`  - ${col.column_name.padEnd(30)} ${col.data_type}`)
        }
      }
    }

    // Buscar alguns dados de exemplo
    console.log('\n\n' + '='.repeat(80))
    console.log('📊 Dados de Exemplo\n')
    
    for (const item of tabelas.rows) {
      if (item.table_type === 'BASE TABLE') {
        const dados = await poolJuaz.query(`
          SELECT * FROM public."${item.table_name}"
          LIMIT 3
        `)

        console.log(`\n${item.table_name}: ${dados.rows.length} registros (amostra)`)
        if (dados.rows.length > 0) {
          console.log(JSON.stringify(dados.rows[0], null, 2))
        }
      }
    }

    console.log('\n\n✅ Análise concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolJuaz.end()
  }
}

buscarTabelasCombinad()
