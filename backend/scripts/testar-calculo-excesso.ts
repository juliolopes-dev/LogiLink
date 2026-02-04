import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function testarCalculoExcesso() {
  try {
    console.log('🧪 Testando Cálculo de Excesso de Estoque\n')
    console.log('Parâmetros fornecidos:')
    console.log('  - Estoque Atual: 255 unidades (do exemplo da imagem)')
    console.log('  - Demanda Mensal: 180 unidades')
    console.log('  - Lead Time: 30 dias')
    console.log('  - Estoque Segurança: 7 dias')
    console.log('  - Percentual Segurança: 10%\n')

    const resultado = await pool.query(`
      SELECT * FROM public.calcular_metricas_estoque(
        255,    -- Estoque atual
        180,    -- Demanda mensal
        30,     -- Lead time dias
        7,      -- Estoque segurança dias
        10      -- Percentual segurança
      )
    `)

    const r = resultado.rows[0]

    console.log('📊 RESULTADO DO CÁLCULO:')
    console.log('='.repeat(80))
    console.log(`Estoque Ideal:           ${r.estoque_ideal} unidades`)
    console.log(`  ├─ Lead Time (30 dias): ${(180/30*30).toFixed(2)} unidades`)
    console.log(`  └─ Estoque Segurança:   ${r.estoque_seguranca} unidades`)
    console.log(``)
    console.log(`Estoque Atual:           255.00 unidades`)
    console.log(`Excesso:                 ${r.excesso} unidades`)
    console.log(`Percentual de Excesso:   ${r.percentual_excesso}%`)
    console.log(``)
    console.log(`Cobertura:               ${r.cobertura_dias} dias`)
    console.log(`Status:                  ${r.status_estoque}`)
    console.log(``)
    console.log(`💡 Recomendação:`)
    console.log(`   ${r.recomendacao}`)
    console.log('='.repeat(80))

    console.log('\n\n📋 Verificando regra padrão cadastrada...\n')
    const regra = await pool.query(`
      SELECT * FROM public.config_regras_estoque 
      WHERE nome_regra = 'REGRA_PADRAO_GLOBAL'
    `)

    if (regra.rows.length > 0) {
      const rg = regra.rows[0]
      console.log('✅ Regra Padrão Global Cadastrada:')
      console.log(`   Demanda Mensal Padrão:    ${rg.demanda_mensal_padrao}`)
      console.log(`   Lead Time:                ${rg.lead_time_dias} dias`)
      console.log(`   Estoque Segurança:        ${rg.estoque_seguranca_dias} dias`)
      console.log(`   Percentual Segurança:     ${rg.percentual_seguranca}%`)
      console.log(`   Cobertura Mínima:         ${rg.cobertura_minima_dias} dias`)
      console.log(`   Cobertura Máxima:         ${rg.cobertura_maxima_dias} dias`)
      console.log(`   Alerta Excesso:           ${rg.percentual_excesso_alerta}%`)
      console.log(`   Crítico Excesso:          ${rg.percentual_excesso_critico}%`)
    }

    console.log('\n\n💡 Como alterar as regras:')
    console.log('   1. Via SQL direto no banco:')
    console.log(`      UPDATE public.config_regras_estoque`)
    console.log(`      SET demanda_mensal_padrao = 200,`)
    console.log(`          lead_time_dias = 45`)
    console.log(`      WHERE nome_regra = 'REGRA_PADRAO_GLOBAL';`)
    console.log('')
    console.log('   2. Via API (próximo passo - criar endpoints REST)')
    console.log('   3. Via Painel Web (próximo passo - criar interface)')

    console.log('\n✅ Teste concluído!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

testarCalculoExcesso()
