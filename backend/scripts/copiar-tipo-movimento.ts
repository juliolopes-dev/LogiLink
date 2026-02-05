import { Pool } from 'pg'

const poolAntigo = new Pool({
  connectionString: 'postgres://postgres:12be35dd1e93eead5a07@147.93.144.135:1254/dados-bezerra?sslmode=disable'
})

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function copiarTipoMovimento() {
  try {
    console.log('⚡ Copiando dim_tipo_movimento → Tipo_Movimento\n')

    // 1. Buscar estrutura
    const colunas = await poolAntigo.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'dim_tipo_movimento'
      ORDER BY ordinal_position
    `)

    if (colunas.rows.length === 0) {
      console.log('❌ Tabela dim_tipo_movimento não encontrada')
      return
    }

    console.log(`📋 Estrutura: ${colunas.rows.length} colunas`)

    // 2. Criar tabela
    const colunasSQL = colunas.rows.map(col => {
      let tipo = col.data_type.toUpperCase()
      
      if (col.character_maximum_length) {
        tipo = `VARCHAR(${col.character_maximum_length})`
      } else if (col.numeric_precision) {
        tipo = col.numeric_scale 
          ? `NUMERIC(${col.numeric_precision},${col.numeric_scale})`
          : `NUMERIC(${col.numeric_precision})`
      } else if (tipo === 'CHARACTER VARYING') {
        tipo = 'TEXT'
      } else if (tipo === 'TIMESTAMP WITHOUT TIME ZONE') {
        tipo = 'TIMESTAMP'
      }

      const nullable = col.is_nullable === 'NO' ? 'NOT NULL' : ''
      const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : ''

      return `"${col.column_name}" ${tipo} ${nullable} ${defaultVal}`.trim()
    }).join(',\n  ')

    await poolAuditoria.query(`DROP TABLE IF EXISTS auditoria_integracao."Tipo_Movimento" CASCADE`)
    
    await poolAuditoria.query(`
      CREATE TABLE auditoria_integracao."Tipo_Movimento" (
        ${colunasSQL}
      )
    `)

    console.log('✅ Tabela criada\n')

    // 3. Copiar dados
    console.log('📊 Copiando dados...')
    const dados = await poolAntigo.query('SELECT * FROM public.dim_tipo_movimento')
    
    if (dados.rows.length === 0) {
      console.log('⚠️  Nenhum registro encontrado\n')
      return
    }

    const colunasList = colunas.rows.map(c => `"${c.column_name}"`).join(', ')
    const numColunas = colunas.rows.length
    
    const values = dados.rows.map((_, idx) => {
      const placeholders = Array.from({ length: numColunas }, (_, colIdx) => 
        `$${idx * numColunas + colIdx + 1}`
      ).join(', ')
      return `(${placeholders})`
    }).join(',\n')
    
    const params = dados.rows.flatMap(row => 
      colunas.rows.map(col => row[col.column_name])
    )

    await poolAuditoria.query(`
      INSERT INTO auditoria_integracao."Tipo_Movimento" (${colunasList})
      VALUES ${values}
    `, params)

    console.log(`✅ ${dados.rows.length} registros copiados\n`)

    // 4. Verificar
    const count = await poolAuditoria.query('SELECT COUNT(*) FROM auditoria_integracao."Tipo_Movimento"')
    const sample = await poolAuditoria.query('SELECT * FROM auditoria_integracao."Tipo_Movimento" LIMIT 3')

    console.log('📊 Verificação:')
    console.log(`   Total: ${count.rows[0].count} registros`)
    console.log(`   Colunas: ${colunas.rows.length}`)
    
    if (sample.rows.length > 0) {
      console.log('\n📋 Exemplo de registro:')
      console.log(JSON.stringify(sample.rows[0], null, 2))
    }

    console.log('\n✅ Cópia concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAntigo.end()
    await poolAuditoria.end()
  }
}

copiarTipoMovimento()
