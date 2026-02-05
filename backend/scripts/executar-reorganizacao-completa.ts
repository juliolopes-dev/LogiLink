import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

const poolAntigo = new Pool({
  connectionString: 'postgres://postgres:12be35dd1e93eead5a07@147.93.144.135:1254/dados-bezerra?sslmode=disable'
})

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function reorganizarBanco() {
  try {
    console.log('🚀 Reorganizando Banco de Auditoria\n')
    console.log('📋 Movendo tudo para schema auditoria_integracao...\n')

    // 1. Executar reorganização
    console.log('📊 1. Executando script de reorganização...')
    const sqlReorganizar = fs.readFileSync(
      path.join(__dirname, 'reorganizar-banco-auditoria.sql'),
      'utf-8'
    )
    await poolAuditoria.query(sqlReorganizar)
    console.log('✅ Estruturas reorganizadas!\n')

    // 2. Copiar dados de combinados
    console.log('📊 2. Copiando dados de combinados do banco antigo...')
    
    const combinados = await poolAntigo.query(`
      SELECT * FROM public.combinados ORDER BY id
    `)

    console.log(`   Encontrados ${combinados.rows.length} grupos de combinados`)

    if (combinados.rows.length > 0) {
      for (const row of combinados.rows) {
        await poolAuditoria.query(`
          INSERT INTO auditoria_integracao.combinados (
            id, cod_grupo, descricao, ativo, observacao, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (cod_grupo) DO UPDATE SET
            descricao = EXCLUDED.descricao,
            ativo = EXCLUDED.ativo,
            observacao = EXCLUDED.observacao,
            updated_at = EXCLUDED.updated_at
        `, [
          row.id,
          row.cod_grupo,
          row.descricao,
          row.ativo,
          row.observacao,
          row.created_at,
          row.updated_at
        ])
      }

      await poolAuditoria.query(`
        SELECT setval('auditoria_integracao.combinados_id_seq', (SELECT MAX(id) FROM auditoria_integracao.combinados))
      `)

      console.log(`✅ ${combinados.rows.length} grupos copiados!\n`)
    }

    // 3. Copiar produtos dos combinados
    console.log('📊 3. Copiando produtos dos combinados...')
    
    const produtos = await poolAntigo.query(`
      SELECT * FROM public.combinados_produtos ORDER BY id
    `)

    console.log(`   Encontrados ${produtos.rows.length} produtos`)

    if (produtos.rows.length > 0) {
      for (const row of produtos.rows) {
        await poolAuditoria.query(`
          INSERT INTO auditoria_integracao.combinados_produtos (
            id, cod_grupo, cod_produto, ordem, created_at
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (cod_grupo, cod_produto) DO UPDATE SET
            ordem = EXCLUDED.ordem
        `, [
          row.id,
          row.cod_grupo,
          row.cod_produto,
          row.ordem,
          row.created_at
        ])
      }

      await poolAuditoria.query(`
        SELECT setval('auditoria_integracao.combinados_produtos_id_seq', (SELECT MAX(id) FROM auditoria_integracao.combinados_produtos))
      `)

      console.log(`✅ ${produtos.rows.length} produtos copiados!\n`)
    }

    // 4. Verificar estrutura final
    console.log('📋 4. Verificando estrutura final do banco...\n')
    
    const estrutura = await poolAuditoria.query(`
      SELECT 
        table_schema,
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema IN ('auditoria_integracao', 'public')
      ORDER BY table_schema, table_type, table_name
    `)

    console.log('📊 Estrutura do Banco de Auditoria:\n')
    
    let schemaAtual = ''
    for (const item of estrutura.rows) {
      if (item.table_schema !== schemaAtual) {
        schemaAtual = item.table_schema
        console.log(`\n📁 Schema: ${schemaAtual}`)
      }
      const icone = item.table_type === 'BASE TABLE' ? '  📊' : '  👁️ '
      console.log(`${icone} ${item.table_name}`)
    }

    // 5. Estatísticas
    console.log('\n\n📊 Estatísticas Finais:\n')

    const stats = await poolAuditoria.query(`
      SELECT 
        (SELECT COUNT(*) FROM auditoria_integracao.combinados) as total_combinados,
        (SELECT COUNT(*) FROM auditoria_integracao.combinados WHERE ativo = true) as combinados_ativos,
        (SELECT COUNT(*) FROM auditoria_integracao.combinados_produtos) as total_produtos,
        (SELECT COUNT(*) FROM auditoria_integracao.config_regras_estoque) as total_regras
    `)

    const st = stats.rows[0]
    console.log(`Combinados:              ${st.total_combinados} (${st.combinados_ativos} ativos)`)
    console.log(`Produtos em Combinados:  ${st.total_produtos}`)
    console.log(`Regras de Estoque:       ${st.total_regras}`)

    // 6. Testar VIEWs
    console.log('\n\n👁️  Testando VIEWs...\n')

    const viewCombinados = await poolAuditoria.query(`
      SELECT * FROM auditoria_integracao.vw_combinados_detalhado LIMIT 1
    `)
    console.log(`✅ vw_combinados_detalhado: ${viewCombinados.rows.length > 0 ? 'OK' : 'VAZIA'}`)

    const viewEstoque = await poolAuditoria.query(`
      SELECT * FROM auditoria_integracao.vw_analise_estoque_cobertura LIMIT 1
    `)
    console.log(`✅ vw_analise_estoque_cobertura: ${viewEstoque.rows.length > 0 ? 'OK' : 'VAZIA'}`)

    console.log('\n\n✅ Reorganização concluída com sucesso!')
    console.log('\n📌 Estrutura Organizada:')
    console.log('   Schema: auditoria_integracao')
    console.log('   ├─ Tabelas:')
    console.log('   │  ├─ Estoque_DRP')
    console.log('   │  ├─ Movimentacao_DRP')
    console.log('   │  ├─ combinados')
    console.log('   │  ├─ combinados_produtos')
    console.log('   │  └─ config_regras_estoque')
    console.log('   ├─ VIEWs:')
    console.log('   │  ├─ vw_analise_estoque_cobertura')
    console.log('   │  └─ vw_combinados_detalhado')
    console.log('   └─ Funções:')
    console.log('      └─ calcular_metricas_estoque')

  } catch (error) {
    console.error('❌ Erro na reorganização:', error)
  } finally {
    await poolAntigo.end()
    await poolAuditoria.end()
  }
}

reorganizarBanco()
