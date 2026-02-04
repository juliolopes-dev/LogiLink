import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function verificarView() {
  try {
    console.log('🔍 Verificando VIEW Movimentacao_DRP\n')

    // Verificar definição da VIEW
    const viewDef = await pool.query(`
      SELECT definition
      FROM pg_views
      WHERE schemaname = 'auditoria_integracao'
        AND viewname = 'Movimentacao_DRP'
    `)

    if (viewDef.rows.length > 0) {
      console.log('✅ VIEW existe! Definição:\n')
      console.log(viewDef.rows[0].definition)
      console.log('\n')

      // Testar a VIEW
      console.log('🧪 Testando VIEW...')
      const teste = await pool.query(`
        SELECT COUNT(*) FROM auditoria_integracao."Movimentacao_DRP"
      `)
      console.log(`✅ VIEW funciona! Total: ${teste.rows[0].count} registros`)
    } else {
      console.log('❌ VIEW não existe!')
      console.log('\n📋 VIEWs disponíveis:')
      
      const views = await pool.query(`
        SELECT viewname
        FROM pg_views
        WHERE schemaname = 'auditoria_integracao'
        ORDER BY viewname
      `)
      
      for (const v of views.rows) {
        console.log(`   - ${v.viewname}`)
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

verificarView()
