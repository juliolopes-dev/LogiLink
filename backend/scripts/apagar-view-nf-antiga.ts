import { Pool } from 'pg'

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function apagarViewAntiga() {
  try {
    console.log('🗑️  Apagando VIEW antiga NF_Entrada...\n')

    // Verificar se a VIEW existe
    const verificar = await poolAuditoria.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'auditoria_integracao'
        AND table_name = 'NF_Entrada'
    `)

    if (verificar.rows.length === 0) {
      console.log('ℹ️  VIEW NF_Entrada não existe. Já foi removida!\n')
      return
    }

    console.log('✅ VIEW NF_Entrada encontrada. Removendo...\n')

    // Apagar VIEW antiga
    await poolAuditoria.query(`
      DROP VIEW IF EXISTS auditoria_integracao."NF_Entrada" CASCADE;
    `)

    console.log('✅ VIEW NF_Entrada removida com sucesso!\n')

    // Verificar VIEWs restantes
    console.log('📋 VIEWs restantes no schema auditoria_integracao:\n')
    
    const views = await poolAuditoria.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'auditoria_integracao'
        AND table_name LIKE '%NF%'
      ORDER BY table_name
    `)

    views.rows.forEach(v => {
      console.log(`  ✅ ${v.table_name}`)
    })

    console.log('\n🎉 Limpeza concluída! Apenas NF_Entrada_DRP permanece.')

  } catch (error) {
    console.error('❌ Erro ao apagar VIEW:', error)
    throw error
  } finally {
    await poolAuditoria.end()
  }
}

apagarViewAntiga()
