import { Pool } from 'pg'

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function analisarBanco() {
  try {
    console.log('🔍 Analisando banco de auditoria...\n')

    // 1. Listar todas as tabelas
    console.log('📋 TABELAS no schema auditoria_integracao:\n')
    
    const tabelas = await poolAuditoria.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) 
         FROM information_schema.columns 
         WHERE table_schema = 'auditoria_integracao' 
           AND table_name = t.table_name) as num_colunas
      FROM information_schema.tables t
      WHERE table_schema = 'auditoria_integracao'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)

    for (const tabela of tabelas.rows) {
      const count = await poolAuditoria.query(`
        SELECT COUNT(*) as total
        FROM auditoria_integracao."${tabela.table_name}"
      `)
      
      console.log(`  📊 ${tabela.table_name.padEnd(50)} ${count.rows[0].total.toString().padStart(10)} registros | ${tabela.num_colunas} colunas`)
    }

    // 2. Listar todas as VIEWs
    console.log('\n\n📋 VIEWs no schema auditoria_integracao:\n')
    
    const views = await poolAuditoria.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'auditoria_integracao'
      ORDER BY table_name
    `)

    views.rows.forEach(v => {
      console.log(`  👁️  ${v.table_name}`)
    })

    // 3. Agrupar tabelas por tipo
    console.log('\n\n📂 AGRUPAMENTO DE TABELAS:\n')

    const grupos = {
      movimentacao: tabelas.rows.filter(t => t.table_name.includes('mov_')),
      nf_entrada: tabelas.rows.filter(t => t.table_name.includes('nf_entrada')),
      estoque: tabelas.rows.filter(t => t.table_name.includes('estoque')),
      outros: tabelas.rows.filter(t => 
        !t.table_name.includes('mov_') && 
        !t.table_name.includes('nf_entrada') && 
        !t.table_name.includes('estoque')
      )
    }

    console.log('🔄 Movimentação:')
    grupos.movimentacao.forEach(t => console.log(`  - ${t.table_name}`))

    console.log('\n📝 NF Entrada:')
    grupos.nf_entrada.forEach(t => console.log(`  - ${t.table_name}`))

    console.log('\n📦 Estoque:')
    grupos.estoque.forEach(t => console.log(`  - ${t.table_name}`))

    console.log('\n📋 Outros:')
    grupos.outros.forEach(t => console.log(`  - ${t.table_name}`))

    // 4. Sugestões de próximas migrações
    console.log('\n\n💡 SUGESTÕES DE PRÓXIMAS MIGRAÇÕES:\n')

    if (grupos.estoque.length > 0) {
      console.log('1️⃣  ESTOQUE')
      console.log('   - Criar VIEW Estoque_DRP unificando tabelas de estoque')
      console.log('   - Migrar consultas de estoque do backend')
      console.log(`   - ${grupos.estoque.length} tabelas disponíveis\n`)
    }

    if (grupos.outros.length > 0) {
      console.log('2️⃣  OUTRAS TABELAS')
      grupos.outros.forEach(t => {
        console.log(`   - ${t.table_name}`)
      })
    }

    console.log('\n✅ Análise concluída!')

  } catch (error) {
    console.error('❌ Erro ao analisar banco:', error)
    throw error
  } finally {
    await poolAuditoria.end()
  }
}

analisarBanco()
