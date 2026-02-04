import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function testarSistemaCompleto() {
  try {
    console.log('🧪 Testando Sistema Completo DRP\n')
    console.log('='.repeat(80))

    // 1. Testar Conexão
    console.log('\n📡 1. TESTANDO CONEXÃO COM BANCO DE DADOS\n')
    const conexao = await pool.query('SELECT NOW() as data_hora, current_database() as banco')
    console.log(`✅ Conectado ao banco: ${conexao.rows[0].banco}`)
    console.log(`✅ Data/Hora: ${conexao.rows[0].data_hora}`)

    // 2. Verificar Tabelas
    console.log('\n\n📊 2. VERIFICANDO TABELAS\n')
    const tabelas = await pool.query(`
      SELECT 
        table_name,
        table_type,
        (SELECT COUNT(*) 
         FROM information_schema.columns 
         WHERE table_schema = 'auditoria_integracao' 
           AND table_name = t.table_name) as colunas
      FROM information_schema.tables t
      WHERE table_schema = 'auditoria_integracao'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)

    console.log(`Total de tabelas: ${tabelas.rows.length}\n`)
    for (const t of tabelas.rows) {
      const count = await pool.query(`SELECT COUNT(*) FROM auditoria_integracao."${t.table_name}"`)
      console.log(`✅ ${t.table_name.padEnd(30)} ${count.rows[0].count.toString().padStart(8)} registros  ${t.colunas} colunas`)
    }

    // 3. Testar VIEWs
    console.log('\n\n👁️  3. TESTANDO VIEWs\n')
    
    // VIEW de Análise de Estoque
    console.log('📈 VIEW: vw_analise_estoque_cobertura')
    const viewEstoque = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status_estoque = 'RUPTURA_CRITICO' THEN 1 END) as ruptura_critico,
        COUNT(CASE WHEN status_estoque = 'RUPTURA_ALERTA' THEN 1 END) as ruptura_alerta,
        COUNT(CASE WHEN status_estoque = 'NORMAL' THEN 1 END) as normal,
        COUNT(CASE WHEN status_estoque = 'EXCESSO_ALERTA' THEN 1 END) as excesso_alerta,
        COUNT(CASE WHEN status_estoque = 'EXCESSO_CRITICO' THEN 1 END) as excesso_critico,
        SUM(quantidade_comprar) as total_comprar
      FROM auditoria_integracao.vw_analise_estoque_cobertura
    `)
    
    const stats = viewEstoque.rows[0]
    console.log(`   Total de produtos:     ${stats.total}`)
    console.log(`   Ruptura Crítico:       ${stats.ruptura_critico}`)
    console.log(`   Ruptura Alerta:        ${stats.ruptura_alerta}`)
    console.log(`   Normal:                ${stats.normal}`)
    console.log(`   Excesso Alerta:        ${stats.excesso_alerta}`)
    console.log(`   Excesso Crítico:       ${stats.excesso_critico}`)
    console.log(`   Total a Comprar:       ${parseFloat(stats.total_comprar || 0).toFixed(0)} unidades`)

    // Exemplo de produto
    const exemploProduto = await pool.query(`
      SELECT * FROM auditoria_integracao.vw_analise_estoque_cobertura
      WHERE status_estoque = 'RUPTURA_CRITICO'
      LIMIT 1
    `)
    
    if (exemploProduto.rows.length > 0) {
      console.log('\n   📋 Exemplo de produto em ruptura crítica:')
      const p = exemploProduto.rows[0]
      console.log(`      Produto: ${p.cod_produto}`)
      console.log(`      Filial: ${p.nome_filial}`)
      console.log(`      Estoque Atual: ${p.estoque_atual}`)
      console.log(`      Demanda Diária: ${p.demanda_diaria}`)
      console.log(`      Cobertura Atual: ${p.cobertura_dias_atual} dias`)
      console.log(`      Quantidade a Comprar: ${p.quantidade_comprar}`)
    }

    // VIEW de Combinados
    console.log('\n\n📦 VIEW: vw_grupo_combinado_detalhado')
    const viewCombinados = await pool.query(`
      SELECT 
        COUNT(DISTINCT cod_grupo) as total_grupos,
        COUNT(*) as total_produtos
      FROM auditoria_integracao.vw_grupo_combinado_detalhado
    `)
    
    console.log(`   Total de grupos:       ${viewCombinados.rows[0].total_grupos}`)
    console.log(`   Total de produtos:     ${viewCombinados.rows[0].total_produtos}`)

    // Exemplo de combinado
    const exemploCombinado = await pool.query(`
      SELECT * FROM auditoria_integracao.vw_grupo_combinado_detalhado
      LIMIT 3
    `)
    
    if (exemploCombinado.rows.length > 0) {
      console.log('\n   📋 Exemplo de combinado:')
      const c = exemploCombinado.rows[0]
      console.log(`      Grupo: ${c.cod_grupo}`)
      console.log(`      Descrição: ${c.grupo_descricao}`)
      console.log(`      Produto: ${c.cod_produto}`)
      console.log(`      Ordem: ${c.ordem}`)
    }

    // 4. Testar Função
    console.log('\n\n⚙️  4. TESTANDO FUNÇÃO calcular_metricas_estoque\n')
    const funcao = await pool.query(`
      SELECT * FROM auditoria_integracao.calcular_metricas_estoque(
        1000,  -- estoque_atual
        50,    -- demanda_diaria
        30,    -- lead_time_dias
        30     -- estoque_seguranca_dias
      )
    `)
    
    const resultado = funcao.rows[0]
    console.log(`   Estoque Ideal:         ${resultado.estoque_ideal}`)
    console.log(`   Estoque Segurança:     ${resultado.estoque_seguranca}`)
    console.log(`   Excesso:               ${resultado.excesso}`)
    console.log(`   Percentual Excesso:    ${resultado.percentual_excesso}%`)
    console.log(`   Cobertura Dias:        ${resultado.cobertura_dias}`)
    console.log(`   Status:                ${resultado.status_estoque}`)
    console.log(`   Recomendação:          ${resultado.recomendacao}`)

    // 5. Testar Integridade de Dados
    console.log('\n\n🔍 5. VERIFICANDO INTEGRIDADE DOS DADOS\n')

    // Verificar combinados órfãos
    const combinadosOrfaos = await pool.query(`
      SELECT COUNT(*) as total
      FROM auditoria_integracao."Produtos_Combinado_DRP" pc
      WHERE NOT EXISTS (
        SELECT 1 FROM auditoria_integracao."Grupo_Combinado_DRP" gc
        WHERE gc.cod_grupo = pc.cod_grupo
      )
    `)
    console.log(`   Produtos combinados órfãos: ${combinadosOrfaos.rows[0].total}`)

    // Verificar grupos de combinados ativos
    const gruposAtivos = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN ativo = true THEN 1 END) as ativos
      FROM auditoria_integracao."Grupo_Combinado_DRP"
    `)
    console.log(`   Grupos combinados ativos: ${gruposAtivos.rows[0].ativos}/${gruposAtivos.rows[0].total}`)

    // 6. Testar Regras de Estoque
    console.log('\n\n📋 6. VERIFICANDO REGRAS DE ESTOQUE\n')
    const regras = await pool.query(`
      SELECT * FROM auditoria_integracao.config_regras_estoque
      WHERE ativo = true
    `)
    
    if (regras.rows.length > 0) {
      const r = regras.rows[0]
      console.log(`   Nome da Regra:         ${r.nome_regra}`)
      console.log(`   Lead Time:             ${r.lead_time_dias} dias`)
      console.log(`   Estoque Segurança:     ${r.estoque_seguranca_dias} dias`)
      console.log(`   Cobertura Máxima:      ${r.cobertura_maxima_dias} dias`)
      console.log(`   Aplicar Global:        ${r.aplicar_global ? 'Sim' : 'Não'}`)
      console.log(`   Última Atualização:    ${r.updated_at}`)
    } else {
      console.log('   ⚠️  Nenhuma regra ativa encontrada')
    }

    // 7. Resumo Final
    console.log('\n\n' + '='.repeat(80))
    console.log('📊 RESUMO DO TESTE\n')
    console.log(`✅ Conexão com banco:              OK`)
    console.log(`✅ Tabelas verificadas:            ${tabelas.rows.length}`)
    console.log(`✅ VIEW análise estoque:           OK (${stats.total} produtos)`)
    console.log(`✅ VIEW combinados:                OK (${viewCombinados.rows[0].total_grupos} grupos)`)
    console.log(`✅ Função calcular_metricas:       OK`)
    console.log(`✅ Integridade dos dados:          ${combinadosOrfaos.rows[0].total === '0' ? 'OK' : 'ATENÇÃO'}`)
    console.log(`✅ Regras de estoque:              ${regras.rows.length > 0 ? 'OK' : 'ATENÇÃO'}`)

    console.log('\n' + '='.repeat(80))
    console.log('✅ SISTEMA TESTADO COM SUCESSO!\n')

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error)
  } finally {
    await pool.end()
  }
}

testarSistemaCompleto()
