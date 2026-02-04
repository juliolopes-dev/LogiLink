import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function verificar() {
  try {
    console.log('📊 Verificando estrutura da tabela Estoque_DRP\n')

    // 1. Colunas da tabela
    const colunas = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'auditoria_integracao'
        AND table_name = 'Estoque_DRP'
      ORDER BY ordinal_position
    `)

    console.log('📋 Colunas da tabela Estoque_DRP:')
    for (const c of colunas.rows) {
      console.log(`   - ${c.column_name}: ${c.data_type}`)
    }

    // 2. Exemplo de dados
    console.log('\n📦 Exemplo de registro:')
    const exemplo = await pool.query(`
      SELECT * FROM auditoria_integracao."Estoque_DRP"
      WHERE estoque > 0
      LIMIT 1
    `)
    
    if (exemplo.rows.length > 0) {
      console.log(JSON.stringify(exemplo.rows[0], null, 2))
    }

    // 3. Verificar se tem campo de quantidade_bloqueada ou reserva
    console.log('\n🔍 Verificando campos de reserva/bloqueio:')
    const camposReserva = colunas.rows.filter(c => 
      c.column_name.includes('bloqueada') || 
      c.column_name.includes('reserva') ||
      c.column_name.includes('disponivel')
    )
    
    if (camposReserva.length > 0) {
      console.log('   Campos encontrados:')
      camposReserva.forEach(c => console.log(`   - ${c.column_name}`))
    } else {
      console.log('   Nenhum campo de reserva/bloqueio encontrado')
    }

    // 4. Verificar cálculo atual
    console.log('\n📊 Verificando cálculo de estoque:')
    const calculo = await pool.query(`
      SELECT 
        cod_produto,
        cod_filial,
        estoque,
        COALESCE(quantidade_bloqueada, 0) as quantidade_bloqueada,
        estoque - COALESCE(quantidade_bloqueada, 0) as estoque_disponivel
      FROM auditoria_integracao."Estoque_DRP"
      WHERE estoque > 0
      LIMIT 5
    `)
    
    console.log('   cod_produto | filial | estoque_total | bloqueado | disponivel')
    console.log('   ' + '-'.repeat(60))
    for (const r of calculo.rows) {
      console.log(`   ${r.cod_produto.padEnd(11)} | ${r.cod_filial.padEnd(6)} | ${r.estoque.toString().padStart(13)} | ${r.quantidade_bloqueada.toString().padStart(9)} | ${r.estoque_disponivel.toString().padStart(10)}`)
    }

    console.log('\n✅ Verificação concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

verificar()
