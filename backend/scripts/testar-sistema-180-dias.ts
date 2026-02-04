import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

const pool = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function testarSistema180Dias() {
  try {
    console.log('🚀 Configurando Sistema de Cobertura de 180 Dias\n')

    // 1. Atualizar regra para 180 dias
    console.log('📋 1. Atualizando regra padrão para 180 dias de cobertura...')
    const sqlRegra = fs.readFileSync(
      path.join(__dirname, 'atualizar-regra-180-dias.sql'),
      'utf-8'
    )
    await pool.query(sqlRegra)
    console.log('✅ Regra atualizada!\n')

    // 2. Criar VIEW com cálculo automático
    console.log('📊 2. Criando VIEW vw_analise_estoque_cobertura...')
    const sqlView = fs.readFileSync(
      path.join(__dirname, 'criar-view-analise-estoque-automatica.sql'),
      'utf-8'
    )
    await pool.query(sqlView)
    console.log('✅ VIEW criada!\n')

    // 3. Verificar configuração
    console.log('📋 3. Verificando configuração:\n')
    const config = await pool.query(`
      SELECT 
        nome_regra,
        lead_time_dias,
        estoque_seguranca_dias,
        cobertura_maxima_dias,
        descricao
      FROM public.config_regras_estoque
      WHERE nome_regra = 'REGRA_PADRAO_GLOBAL'
    `)

    const cfg = config.rows[0]
    console.log('✅ Configuração Ativa:')
    console.log(`   Lead Time:              ${cfg.lead_time_dias} dias`)
    console.log(`   Estoque Segurança:      ${cfg.estoque_seguranca_dias} dias`)
    console.log(`   Cobertura Desejada:     ${cfg.cobertura_maxima_dias} dias`)
    console.log(`   Descrição:              ${cfg.descricao}\n`)

    // 4. Testar com produtos reais
    console.log('📊 4. Testando com produtos reais (Top 10 com maior demanda):\n')
    
    const produtos = await pool.query(`
      SELECT 
        cod_produto,
        nome_filial,
        estoque_atual,
        vendas_30_dias,
        demanda_diaria,
        cobertura_dias_atual,
        cobertura_desejada_dias,
        estoque_ideal,
        estoque_cobertura_maxima,
        quantidade_comprar,
        status_estoque,
        recomendacao
      FROM public.vw_analise_estoque_cobertura
      WHERE demanda_diaria > 0
      ORDER BY demanda_diaria DESC
      LIMIT 10
    `)

    if (produtos.rows.length > 0) {
      console.log('CODIGO | FILIAL      | ESTOQUE | VENDAS 30D | DEM.DIARIA | COBERT.ATUAL | COBERT.DESEJ | QTD COMPRAR | STATUS')
      console.log('-'.repeat(130))
      
      produtos.rows.forEach(row => {
        console.log(
          `${row.cod_produto.padEnd(6)} | ` +
          `${row.nome_filial.padEnd(11)} | ` +
          `${row.estoque_atual.toString().padStart(7)} | ` +
          `${row.vendas_30_dias.toString().padStart(10)} | ` +
          `${row.demanda_diaria.toString().padStart(10)} | ` +
          `${row.cobertura_dias_atual.toString().padStart(12)} | ` +
          `${row.cobertura_desejada_dias.toString().padStart(12)} | ` +
          `${row.quantidade_comprar.toString().padStart(11)} | ` +
          `${row.status_estoque}`
        )
      })

      console.log('\n\n📋 Detalhes do Primeiro Produto:\n')
      const p = produtos.rows[0]
      console.log('='.repeat(80))
      console.log(`Produto:                ${p.cod_produto}`)
      console.log(`Filial:                 ${p.nome_filial}`)
      console.log(``)
      console.log(`📦 Situação Atual:`)
      console.log(`   Estoque Atual:       ${p.estoque_atual} unidades`)
      console.log(`   Vendas (30 dias):    ${p.vendas_30_dias} unidades`)
      console.log(`   Demanda Diária:      ${p.demanda_diaria} unidades/dia`)
      console.log(`   Cobertura Atual:     ${p.cobertura_dias_atual} dias`)
      console.log(``)
      console.log(`🎯 Meta de Cobertura:`)
      console.log(`   Cobertura Desejada:  ${p.cobertura_desejada_dias} dias`)
      console.log(`   Estoque Ideal:       ${p.estoque_ideal} unidades (60 dias)`)
      console.log(`   Estoque p/ 180 dias: ${p.estoque_cobertura_maxima} unidades`)
      console.log(``)
      console.log(`📊 Análise:`)
      console.log(`   Status:              ${p.status_estoque}`)
      console.log(`   Recomendação:        ${p.recomendacao}`)
      console.log(`   Quantidade Comprar:  ${p.quantidade_comprar} unidades`)
      console.log('='.repeat(80))
    } else {
      console.log('Nenhum produto com demanda encontrado.')
    }

    // 5. Estatísticas gerais
    console.log('\n\n📊 5. Estatísticas Gerais:\n')
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_produtos,
        COUNT(CASE WHEN status_estoque = 'EXCESSO_CRITICO' THEN 1 END) as excesso_critico,
        COUNT(CASE WHEN status_estoque = 'EXCESSO_ALERTA' THEN 1 END) as excesso_alerta,
        COUNT(CASE WHEN status_estoque = 'NORMAL' THEN 1 END) as normal,
        COUNT(CASE WHEN status_estoque = 'RUPTURA_ALERTA' THEN 1 END) as ruptura_alerta,
        COUNT(CASE WHEN status_estoque = 'RUPTURA_CRITICO' THEN 1 END) as ruptura_critico,
        SUM(quantidade_comprar) as total_comprar
      FROM public.vw_analise_estoque_cobertura
      WHERE demanda_diaria > 0
    `)

    const st = stats.rows[0]
    console.log(`Total de Produtos:           ${st.total_produtos}`)
    console.log(``)
    console.log(`Status:`)
    console.log(`  🔴 Excesso Crítico:        ${st.excesso_critico}`)
    console.log(`  ⚠️  Excesso Alerta:         ${st.excesso_alerta}`)
    console.log(`  ✅ Normal:                 ${st.normal}`)
    console.log(`  ⚠️  Ruptura Alerta:         ${st.ruptura_alerta}`)
    console.log(`  🔴 Ruptura Crítico:        ${st.ruptura_critico}`)
    console.log(``)
    console.log(`Total a Comprar:             ${parseFloat(st.total_comprar || 0).toFixed(2)} unidades`)

    console.log('\n\n✅ Sistema configurado com sucesso!')
    console.log('\n📌 Resumo:')
    console.log('   ✅ Demanda calculada automaticamente das vendas dos últimos 30 dias')
    console.log('   ✅ Cobertura desejada: 180 dias')
    console.log('   ✅ Lead Time: 30 dias')
    console.log('   ✅ Estoque Segurança: 30 dias')
    console.log('   ✅ Sistema recomenda quantidade a comprar automaticamente')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

testarSistema180Dias()
