import { Pool } from 'pg'

const poolAntigo = new Pool({
  connectionString: 'postgres://postgres:12be35dd1e93eead5a07@147.93.144.135:1254/dados-bezerra?sslmode=disable'
})

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function copiarTabelasDimensao() {
  try {
    console.log('⚡ Copiando Tabelas Dimensão\n')

    const tabelas = [
      { origem: 'dim_fabricante', destino: 'Fabricante' },
      { origem: 'dim_familia', destino: 'Familia' },
      { origem: 'dim_fornecedor', destino: 'Fornecedor' },
      { origem: 'dim_grupo', destino: 'Grupo' },
      { origem: 'dim_subgrupo', destino: 'Subgrupo' }
    ]

    for (const tabela of tabelas) {
      console.log(`📊 Copiando ${tabela.origem} → ${tabela.destino}...`)

      // 1. Buscar estrutura da tabela origem
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
          AND table_name = $1
        ORDER BY ordinal_position
      `, [tabela.origem])

      if (colunas.rows.length === 0) {
        console.log(`⚠️  Tabela ${tabela.origem} não encontrada, pulando...\n`)
        continue
      }

      // 2. Criar definição da tabela
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

      // 3. Dropar e criar tabela
      await poolAuditoria.query(`DROP TABLE IF EXISTS auditoria_integracao."${tabela.destino}" CASCADE`)
      
      await poolAuditoria.query(`
        CREATE TABLE auditoria_integracao."${tabela.destino}" (
          ${colunasSQL}
        )
      `)

      // 4. Buscar dados
      const dados = await poolAntigo.query(`SELECT * FROM public.${tabela.origem}`)
      
      if (dados.rows.length === 0) {
        console.log(`   0 registros\n`)
        continue
      }

      // 5. Copiar dados em lotes
      const loteSize = 1000
      let totalInserido = 0

      for (let i = 0; i < dados.rows.length; i += loteSize) {
        const lote = dados.rows.slice(i, i + loteSize)
        
        const colunasList = colunas.rows.map(c => `"${c.column_name}"`).join(', ')
        const numColunas = colunas.rows.length
        
        const values = lote.map((_, idx) => {
          const placeholders = Array.from({ length: numColunas }, (_, colIdx) => 
            `$${idx * numColunas + colIdx + 1}`
          ).join(', ')
          return `(${placeholders})`
        }).join(',\n')
        
        const params = lote.flatMap(row => 
          colunas.rows.map(col => row[col.column_name])
        )

        await poolAuditoria.query(`
          INSERT INTO auditoria_integracao."${tabela.destino}" (${colunasList})
          VALUES ${values}
        `, params)

        totalInserido += lote.length
        
        if (dados.rows.length > 1000) {
          console.log(`   ${totalInserido}/${dados.rows.length}`)
        }
      }

      console.log(`✅ ${dados.rows.length} registros\n`)
    }

    // Verificar resultado
    console.log('📊 Verificando tabelas criadas...\n')
    
    const resultado = await poolAuditoria.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) 
         FROM information_schema.columns 
         WHERE table_schema = 'auditoria_integracao' 
           AND table_name = t.table_name) as colunas
      FROM information_schema.tables t
      WHERE table_schema = 'auditoria_integracao'
        AND table_name IN ('Fabricante', 'Familia', 'Fornecedor', 'Grupo', 'Subgrupo')
      ORDER BY table_name
    `)

    console.log('✅ Tabelas Criadas:\n')
    for (const t of resultado.rows) {
      const count = await poolAuditoria.query(`SELECT COUNT(*) FROM auditoria_integracao."${t.table_name}"`)
      console.log(`📊 ${t.table_name.padEnd(15)} ${count.rows[0].count.padStart(8)} registros  ${t.colunas} colunas`)
    }

    console.log('\n✅ Cópia concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAntigo.end()
    await poolAuditoria.end()
  }
}

copiarTabelasDimensao()
