import { Pool } from 'pg'

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function analisarViewMovOrfas() {
  try {
    console.log('🔍 Analisando VIEW vw_divergencias_mov_orfas...\n')

    // Buscar definição da VIEW
    const viewDef = await poolAuditoria.query(`
      SELECT 
        schemaname,
        viewname,
        definition
      FROM pg_views
      WHERE viewname = 'vw_divergencias_mov_orfas'
    `)

    if (viewDef.rows.length > 0) {
      console.log('📋 Definição da VIEW encontrada:\n')
      console.log(`Schema: ${viewDef.rows[0].schemaname}`)
      console.log(`Nome: ${viewDef.rows[0].viewname}\n`)
      console.log('SQL da VIEW:')
      console.log('='.repeat(80))
      console.log(viewDef.rows[0].definition)
      console.log('='.repeat(80))
    } else {
      console.log('❌ VIEW vw_divergencias_mov_orfas não encontrada!')
    }

    // Testar a VIEW com alguns dados
    console.log('\n\n📊 Testando a VIEW (primeiros 10 registros):\n')
    
    const teste = await poolAuditoria.query(`
      SELECT * 
      FROM auditoria_integracao.vw_divergencias_mov_orfas
      LIMIT 10
    `)

    if (teste.rows.length > 0) {
      console.log(`Colunas: ${Object.keys(teste.rows[0]).join(', ')}\n`)
      console.log(`Total de registros encontrados: ${teste.rows.length}\n`)
      
      teste.rows.forEach((row, index) => {
        console.log(`Registro ${index + 1}:`)
        Object.entries(row).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`)
        })
        console.log('')
      })
    } else {
      console.log('Nenhum registro encontrado na VIEW')
    }

    // Contar total de registros
    const count = await poolAuditoria.query(`
      SELECT COUNT(*) as total
      FROM auditoria_integracao.vw_divergencias_mov_orfas
    `)

    console.log(`\n📈 Total de registros na VIEW: ${count.rows[0].total}`)

    console.log('\n✅ Análise concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
  }
}

analisarViewMovOrfas()
