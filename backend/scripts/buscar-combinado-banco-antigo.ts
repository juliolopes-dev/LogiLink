import { Pool } from 'pg'

const poolAntigo = new Pool({
  connectionString: 'postgres://postgres:12be35dd1e93eead5a07@147.93.144.135:1254/dados-bezerra?sslmode=disable'
})

async function buscarCombinadoBancoAntigo() {
  try {
    console.log('🔍 Buscando tabelas de "combinado" no banco ANTIGO...\n')

    // Buscar tabelas e views com "combinado"
    const tabelas = await poolAntigo.query(`
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name ILIKE '%combinado%')
      ORDER BY table_type, table_name
    `)

    console.log(`📋 Encontradas ${tabelas.rows.length} tabelas/views com "combinado":\n`)
    
    for (const item of tabelas.rows) {
      console.log(`${item.table_type === 'BASE TABLE' ? '📊' : '👁️ '} ${item.table_name} (${item.table_type})`)
    }

    if (tabelas.rows.length === 0) {
      console.log('❌ Nenhuma tabela encontrada com "combinado"')
      console.log('\n🔍 Buscando todas as tabelas para referência...\n')
      
      const todasTabelas = await poolAntigo.query(`
        SELECT table_name, table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_type, table_name
      `)
      
      console.log('TABELAS:')
      todasTabelas.rows.filter(t => t.table_type === 'BASE TABLE').forEach(t => {
        console.log(`  - ${t.table_name}`)
      })
      
      console.log('\nVIEWS:')
      todasTabelas.rows.filter(t => t.table_type === 'VIEW').forEach(t => {
        console.log(`  - ${t.table_name}`)
      })
      
      await poolAntigo.end()
      return
    }

    console.log('\n' + '='.repeat(80))

    // Para cada tabela, buscar estrutura completa
    for (const item of tabelas.rows) {
      console.log(`\n\n📋 ESTRUTURA: ${item.table_name} (${item.table_type})`)
      console.log('='.repeat(80))

      if (item.table_type === 'BASE TABLE') {
        // Buscar colunas da tabela
        const colunas = await poolAntigo.query(`
          SELECT 
            column_name,
            data_type,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            is_nullable,
            column_default,
            udt_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = $1
          ORDER BY ordinal_position
        `, [item.table_name])

        console.log('\n📊 Colunas:')
        for (const col of colunas.rows) {
          let tipo = col.data_type
          if (col.character_maximum_length) {
            tipo = `${col.data_type}(${col.character_maximum_length})`
          } else if (col.numeric_precision) {
            tipo = col.numeric_scale 
              ? `${col.data_type}(${col.numeric_precision},${col.numeric_scale})`
              : `${col.data_type}(${col.numeric_precision})`
          }
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : ''
          console.log(`  ${col.column_name.padEnd(35)} ${tipo.padEnd(25)} ${nullable}${defaultVal}`)
        }

        // Buscar PRIMARY KEY
        const pk = await poolAntigo.query(`
          SELECT kcu.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          WHERE tc.table_schema = 'public'
            AND tc.table_name = $1
            AND tc.constraint_type = 'PRIMARY KEY'
          ORDER BY kcu.ordinal_position
        `, [item.table_name])

        if (pk.rows.length > 0) {
          console.log('\n🔑 PRIMARY KEY:')
          console.log(`  (${pk.rows.map(r => r.column_name).join(', ')})`)
        }

        // Buscar FOREIGN KEYS
        const fks = await poolAntigo.query(`
          SELECT
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND tc.table_name = $1
        `, [item.table_name])

        if (fks.rows.length > 0) {
          console.log('\n🔗 FOREIGN KEYS:')
          for (const fk of fks.rows) {
            console.log(`  ${fk.column_name} -> ${fk.foreign_table_name}(${fk.foreign_column_name})`)
          }
        }

        // Buscar índices
        const indices = await poolAntigo.query(`
          SELECT
            indexname,
            indexdef
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = $1
            AND indexname NOT LIKE '%_pkey'
          ORDER BY indexname
        `, [item.table_name])

        if (indices.rows.length > 0) {
          console.log('\n📑 ÍNDICES:')
          for (const idx of indices.rows) {
            console.log(`  ${idx.indexname}:`)
            console.log(`    ${idx.indexdef}`)
          }
        }

        // Buscar dados de exemplo
        const dados = await poolAntigo.query(`
          SELECT * FROM public."${item.table_name}"
          LIMIT 3
        `)

        console.log(`\n📊 Dados de Exemplo (${dados.rows.length} registros):`)
        if (dados.rows.length > 0) {
          console.log(JSON.stringify(dados.rows[0], null, 2))
        }

      } else if (item.table_type === 'VIEW') {
        // Buscar definição da VIEW
        const viewDef = await poolAntigo.query(`
          SELECT definition
          FROM pg_views
          WHERE schemaname = 'public'
            AND viewname = $1
        `, [item.table_name])

        if (viewDef.rows.length > 0) {
          console.log('\n👁️  DEFINIÇÃO DA VIEW:')
          console.log(viewDef.rows[0].definition)
        }

        // Buscar colunas da VIEW
        const colunas = await poolAntigo.query(`
          SELECT 
            column_name,
            data_type
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = $1
          ORDER BY ordinal_position
        `, [item.table_name])

        console.log('\n📊 Colunas da VIEW:')
        for (const col of colunas.rows) {
          console.log(`  ${col.column_name.padEnd(35)} ${col.data_type}`)
        }

        // Buscar dados de exemplo
        const dados = await poolAntigo.query(`
          SELECT * FROM public."${item.table_name}"
          LIMIT 2
        `)

        console.log(`\n📊 Dados de Exemplo (${dados.rows.length} registros):`)
        if (dados.rows.length > 0) {
          console.log(JSON.stringify(dados.rows[0], null, 2))
        }
      }
    }

    console.log('\n\n✅ Análise concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAntigo.end()
  }
}

buscarCombinadoBancoAntigo()
