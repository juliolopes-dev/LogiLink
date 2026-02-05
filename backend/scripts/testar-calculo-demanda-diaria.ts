import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function testarCalculoDemandaDiaria() {
  try {
    console.log('🧪 Testando Cálculo com Demanda DIÁRIA\n')
    
    // Atualizar a função
    console.log('📝 Atualizando função calcular_metricas_estoque...')
    const fs = require('fs')
    const path = require('path')
    const sqlFuncao = fs.readFileSync(
      path.join(__dirname, 'criar-funcao-calculo-excesso-estoque.sql'),
      'utf-8'
    )
    await pool.query(sqlFuncao)
    console.log('✅ Função atualizada!\n')

    console.log('📊 Parâmetros:')
    console.log('  - Estoque Atual: 255 unidades')
    console.log('  - Demanda DIÁRIA: 180 unidades/dia')
    console.log('  - Lead Time: 30 dias')
    console.log('  - Estoque Segurança: 30 dias (igual ao lead time)\n')

    const resultado = await pool.query(`
      SELECT * FROM public.calcular_metricas_estoque(
        255,    -- Estoque atual
        180,    -- Demanda DIÁRIA
        30,     -- Lead time dias
        30,     -- Estoque segurança dias (igual ao lead time)
        10      -- Percentual segurança (não usado quando dias > 0)
      )
    `)

    const r = resultado.rows[0]

    console.log('📊 RESULTADO DO CÁLCULO:')
    console.log('='.repeat(80))
    console.log('\n🔢 Cálculo Detalhado:')
    console.log(`   Demanda Diária:           180 unidades/dia`)
    console.log(`   Lead Time:                30 dias`)
    console.log(`   Estoque Segurança:        30 dias`)
    console.log('')
    console.log(`   Estoque Lead Time:        180 × 30 = 5.400 unidades`)
    console.log(`   Estoque Segurança:        180 × 30 = 5.400 unidades`)
    console.log(`   ────────────────────────────────────────────────`)
    console.log(`   Estoque Ideal:            ${r.estoque_ideal} unidades`)
    console.log('')
    console.log(`📦 Situação Atual:`)
    console.log(`   Estoque Atual:            255 unidades`)
    console.log(`   Estoque Ideal:            ${r.estoque_ideal} unidades`)
    console.log(`   Falta (Ruptura):          ${Math.abs(r.excesso)} unidades`)
    console.log(`   Percentual de Falta:      ${r.percentual_excesso}%`)
    console.log('')
    console.log(`📅 Cobertura:`)
    console.log(`   Cobertura Atual:          ${r.cobertura_dias} dias`)
    console.log(`   Cobertura Ideal:          60 dias (30 lead time + 30 segurança)`)
    console.log('')
    console.log(`⚠️  Status:                   ${r.status_estoque}`)
    console.log(`💡 Recomendação:             ${r.recomendacao}`)
    console.log('='.repeat(80))

    console.log('\n\n📊 Interpretação:')
    console.log('─'.repeat(80))
    console.log('Com demanda de 180 unidades/dia:')
    console.log('')
    console.log('✅ Estoque Ideal = 10.800 unidades')
    console.log('   ├─ 5.400 para cobrir 30 dias de lead time')
    console.log('   └─ 5.400 para estoque de segurança (30 dias)')
    console.log('')
    console.log('❌ Estoque Atual = 255 unidades')
    console.log('   └─ Cobre apenas 1,4 dias de demanda!')
    console.log('')
    console.log('🔴 SITUAÇÃO CRÍTICA: Faltam 10.545 unidades!')
    console.log('─'.repeat(80))

    console.log('\n\n💡 Recomendação de Compra:')
    console.log('─'.repeat(80))
    console.log(`Comprar URGENTEMENTE: ${Math.abs(r.excesso)} unidades`)
    console.log(`Isso garantirá:`)
    console.log(`  - 30 dias de cobertura durante o lead time`)
    console.log(`  - 30 dias de estoque de segurança`)
    console.log(`  - Total de 60 dias de cobertura`)
    console.log('─'.repeat(80))

    console.log('\n✅ Teste concluído!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

testarCalculoDemandaDiaria()
