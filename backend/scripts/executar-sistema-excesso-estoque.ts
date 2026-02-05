import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

const pool = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function executarSistemaExcessoEstoque() {
  try {
    console.log('🚀 Executando Sistema de Análise de Excesso de Estoque...\n')

    // 1. Criar tabela de configuração
    console.log('📋 1. Criando tabela config_regras_estoque...')
    const sqlTabela = fs.readFileSync(
      path.join(__dirname, 'criar-tabela-config-regras-estoque.sql'),
      'utf-8'
    )
    await pool.query(sqlTabela)
    console.log('✅ Tabela criada com sucesso!\n')

    // 2. Criar função de cálculo
    console.log('🔢 2. Criando função calcular_metricas_estoque...')
    const sqlFuncao = fs.readFileSync(
      path.join(__dirname, 'criar-funcao-calculo-excesso-estoque.sql'),
      'utf-8'
    )
    await pool.query(sqlFuncao)
    console.log('✅ Função criada com sucesso!\n')

    // 3. Criar VIEW de análise
    console.log('📊 3. Criando VIEW vw_analise_excesso_estoque...')
    const sqlView = fs.readFileSync(
      path.join(__dirname, 'criar-view-analise-excesso-estoque.sql'),
      'utf-8'
    )
    await pool.query(sqlView)
    console.log('✅ VIEW criada com sucesso!\n')

    // 4. Testar com exemplo do usuário
    console.log('🧪 4. Testando cálculo com seus parâmetros (Demanda: 180, Lead Time: 30 dias)...\n')
    
    const teste = await pool.query(`
      SELECT * FROM public.calcular_metricas_estoque(
        255,    -- Estoque atual (do exemplo da imagem)
        180,    -- Demanda mensal
        30,     -- Lead time dias
        7,      -- Estoque segurança dias
        10      -- Percentual segurança
      )
    `)

    console.log('📊 Resultado do Cálculo:')
    console.log('='.repeat(80))
    const resultado = teste.rows[0]
    console.log(`Estoque Atual:           255 unidades`)
    console.log(`Demanda Mensal:          180 unidades`)
    console.log(`Lead Time:               30 dias`)
    console.log(``)
    console.log(`Estoque Ideal:           ${resultado.estoque_ideal} unidades`)
    console.log(`Estoque de Segurança:    ${resultado.estoque_seguranca} unidades`)
    console.log(`Excesso:                 ${resultado.excesso} unidades`)
    console.log(`Percentual de Excesso:   ${resultado.percentual_excesso}%`)
    console.log(`Cobertura:               ${resultado.cobertura_dias} dias`)
    console.log(`Status:                  ${resultado.status_estoque}`)
    console.log(`Recomendação:            ${resultado.recomendacao}`)
    console.log('='.repeat(80))

    // 5. Verificar regra padrão
    console.log('\n📋 5. Verificando regra padrão cadastrada...\n')
    const regra = await pool.query(`
      SELECT * FROM public.config_regras_estoque 
      WHERE nome_regra = 'REGRA_PADRAO_GLOBAL'
    `)

    if (regra.rows.length > 0) {
      const r = regra.rows[0]
      console.log('✅ Regra Padrão Global:')
      console.log(`   Nome: ${r.nome_regra}`)
      console.log(`   Demanda Mensal Padrão: ${r.demanda_mensal_padrao}`)
      console.log(`   Lead Time: ${r.lead_time_dias} dias`)
      console.log(`   Estoque Segurança: ${r.estoque_seguranca_dias} dias`)
      console.log(`   Percentual Segurança: ${r.percentual_seguranca}%`)
      console.log(`   Cobertura Mínima: ${r.cobertura_minima_dias} dias`)
      console.log(`   Cobertura Máxima: ${r.cobertura_maxima_dias} dias`)
      console.log(`   Ativo: ${r.ativo ? 'Sim' : 'Não'}`)
    }

    // 6. Testar VIEW com produtos reais (top 10 com maior excesso)
    console.log('\n\n📊 6. Top 10 produtos com MAIOR EXCESSO de estoque:\n')
    
    const topExcesso = await pool.query(`
      SELECT 
        cod_produto,
        nome_filial,
        estoque_atual,
        demanda_mensal,
        estoque_ideal,
        excesso,
        percentual_excesso,
        cobertura_dias,
        status_estoque
      FROM public.vw_analise_excesso_estoque
      WHERE excesso > 0
      ORDER BY percentual_excesso DESC
      LIMIT 10
    `)

    if (topExcesso.rows.length > 0) {
      console.log('CODIGO | FILIAL      | EST.ATUAL | DEMANDA | EST.IDEAL | EXCESSO | % EXCESSO | COBERTURA | STATUS')
      console.log('-'.repeat(110))
      
      topExcesso.rows.forEach(row => {
        console.log(
          `${row.cod_produto.padEnd(6)} | ` +
          `${row.nome_filial.padEnd(11)} | ` +
          `${row.estoque_atual.toString().padStart(9)} | ` +
          `${row.demanda_mensal.toString().padStart(7)} | ` +
          `${row.estoque_ideal.toString().padStart(9)} | ` +
          `${row.excesso.toString().padStart(7)} | ` +
          `${row.percentual_excesso.toString().padStart(9)} | ` +
          `${row.cobertura_dias.toString().padStart(9)} | ` +
          `${row.status_estoque}`
        )
      })
    } else {
      console.log('Nenhum produto com excesso encontrado.')
    }

    // 7. Top 10 produtos em RUPTURA
    console.log('\n\n⚠️  7. Top 10 produtos em RUPTURA (falta de estoque):\n')
    
    const topRuptura = await pool.query(`
      SELECT 
        cod_produto,
        nome_filial,
        estoque_atual,
        demanda_mensal,
        estoque_ideal,
        excesso,
        percentual_excesso,
        cobertura_dias,
        status_estoque
      FROM public.vw_analise_excesso_estoque
      WHERE excesso < 0
      ORDER BY percentual_excesso ASC
      LIMIT 10
    `)

    if (topRuptura.rows.length > 0) {
      console.log('CODIGO | FILIAL      | EST.ATUAL | DEMANDA | EST.IDEAL | FALTA   | % FALTA   | COBERTURA | STATUS')
      console.log('-'.repeat(110))
      
      topRuptura.rows.forEach(row => {
        console.log(
          `${row.cod_produto.padEnd(6)} | ` +
          `${row.nome_filial.padEnd(11)} | ` +
          `${row.estoque_atual.toString().padStart(9)} | ` +
          `${row.demanda_mensal.toString().padStart(7)} | ` +
          `${row.estoque_ideal.toString().padStart(9)} | ` +
          `${Math.abs(row.excesso).toString().padStart(7)} | ` +
          `${row.percentual_excesso.toString().padStart(9)} | ` +
          `${row.cobertura_dias.toString().padStart(9)} | ` +
          `${row.status_estoque}`
        )
      })
    } else {
      console.log('Nenhum produto em ruptura encontrado.')
    }

    console.log('\n\n✅ Sistema de Análise de Excesso de Estoque instalado com sucesso!')
    console.log('\n📌 Próximos passos:')
    console.log('   1. Criar API endpoints para gerenciar regras')
    console.log('   2. Criar painel frontend para configuração')
    console.log('   3. Integrar com sistema de compras')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

executarSistemaExcessoEstoque()
