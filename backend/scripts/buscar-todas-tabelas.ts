import { Pool } from 'pg'

const poolJuaz = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function buscarTodasTabelas() {
  try {
    console.log('🔍 Buscando todas as tabelas no banco antigo...\n')

    // Buscar todas as tabelas
    const tabelas = await poolJuaz.query(`
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_type, table_name
    `)

    console.log(`📋 Total de tabelas/views: ${tabelas.rows.length}\n`)
    
    console.log('TABELAS:')
    const tabelasBase = tabelas.rows.filter(t => t.table_type === 'BASE TABLE')
    for (const item of tabelasBase) {
      console.log(`  - ${item.table_name}`)
    }

    console.log('\n\nVIEWS:')
    const views = tabelas.rows.filter(t => t.table_type === 'VIEW')
    for (const item of views) {
      console.log(`  - ${item.table_name}`)
    }

    // Buscar especificamente por padrões relacionados a "combinado"
    console.log('\n\n🔍 Buscando padrões relacionados a combinado/pedido/venda...\n')
    
    const palavrasChave = ['combin', 'pedido', 'venda', 'ordem', 'compra']
    
    for (const palavra of palavrasChave) {
      const resultado = tabelas.rows.filter(t => 
        t.table_name.toLowerCase().includes(palavra)
      )
      
      if (resultado.length > 0) {
        console.log(`\n📌 Contém "${palavra}":`)
        for (const item of resultado) {
          console.log(`  ${item.table_type === 'BASE TABLE' ? '📊' : '👁️ '} ${item.table_name}`)
        }
      }
    }

    console.log('\n✅ Busca concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolJuaz.end()
  }
}

buscarTodasTabelas()
