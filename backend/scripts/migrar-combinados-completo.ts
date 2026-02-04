import { Pool } from 'pg'
import * as fs from 'fs'
import * as path from 'path'

const poolAntigo = new Pool({
  connectionString: 'postgres://postgres:12be35dd1e93eead5a07@147.93.144.135:1254/dados-bezerra?sslmode=disable'
})

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function migrarCombinados() {
  try {
    console.log('🚀 Migrando estrutura de Combinados para o Banco de Auditoria\n')

    // 1. Criar estruturas no banco de auditoria
    console.log('📋 1. Criando tabelas e VIEW no banco de auditoria...')
    const sqlCriar = fs.readFileSync(
      path.join(__dirname, 'criar-tabelas-combinados-auditoria.sql'),
      'utf-8'
    )
    await poolAuditoria.query(sqlCriar)
    console.log('✅ Estruturas criadas!\n')

    // 2. Copiar dados da tabela combinados
    console.log('📊 2. Copiando dados da tabela "combinados"...')
    const combinados = await poolAntigo.query(`
      SELECT 
        id,
        cod_grupo,
        descricao,
        ativo,
        observacao,
        created_at,
        updated_at
      FROM public.combinados
      ORDER BY id
    `)

    console.log(`   Encontrados ${combinados.rows.length} registros`)

    if (combinados.rows.length > 0) {
      for (const row of combinados.rows) {
        await poolAuditoria.query(`
          INSERT INTO public.combinados (
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

      // Atualizar sequence
      await poolAuditoria.query(`
        SELECT setval('combinados_id_seq', (SELECT MAX(id) FROM combinados))
      `)

      console.log(`✅ ${combinados.rows.length} registros copiados!\n`)
    }

    // 3. Copiar dados da tabela combinados_produtos
    console.log('📊 3. Copiando dados da tabela "combinados_produtos"...')
    const produtos = await poolAntigo.query(`
      SELECT 
        id,
        cod_grupo,
        cod_produto,
        ordem,
        created_at
      FROM public.combinados_produtos
      ORDER BY id
    `)

    console.log(`   Encontrados ${produtos.rows.length} registros`)

    if (produtos.rows.length > 0) {
      for (const row of produtos.rows) {
        await poolAuditoria.query(`
          INSERT INTO public.combinados_produtos (
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

      // Atualizar sequence
      await poolAuditoria.query(`
        SELECT setval('combinados_produtos_id_seq', (SELECT MAX(id) FROM combinados_produtos))
      `)

      console.log(`✅ ${produtos.rows.length} registros copiados!\n`)
    }

    // 4. Verificar VIEW
    console.log('👁️  4. Testando VIEW vw_combinados_detalhado...')
    const viewTest = await poolAuditoria.query(`
      SELECT * FROM public.vw_combinados_detalhado
      LIMIT 5
    `)

    console.log(`✅ VIEW funcionando! ${viewTest.rows.length} registros retornados\n`)

    if (viewTest.rows.length > 0) {
      console.log('📋 Exemplo de registro da VIEW:')
      console.log(JSON.stringify(viewTest.rows[0], null, 2))
    }

    // 5. Estatísticas finais
    console.log('\n\n📊 Estatísticas Finais:\n')

    const statsCombinados = await poolAuditoria.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN ativo = true THEN 1 END) as ativos,
        COUNT(CASE WHEN ativo = false THEN 1 END) as inativos
      FROM public.combinados
    `)

    const statsProdutos = await poolAuditoria.query(`
      SELECT 
        COUNT(*) as total_produtos,
        COUNT(DISTINCT cod_grupo) as total_grupos,
        AVG(ordem) as ordem_media
      FROM public.combinados_produtos
    `)

    console.log('Tabela "combinados":')
    console.log(`  Total de grupos:     ${statsCombinados.rows[0].total}`)
    console.log(`  Ativos:              ${statsCombinados.rows[0].ativos}`)
    console.log(`  Inativos:            ${statsCombinados.rows[0].inativos}`)

    console.log('\nTabela "combinados_produtos":')
    console.log(`  Total de produtos:   ${statsProdutos.rows[0].total_produtos}`)
    console.log(`  Grupos com produtos: ${statsProdutos.rows[0].total_grupos}`)
    console.log(`  Ordem média:         ${parseFloat(statsProdutos.rows[0].ordem_media).toFixed(2)}`)

    console.log('\n\n✅ Migração concluída com sucesso!')
    console.log('\n📌 Estruturas criadas no banco de auditoria:')
    console.log('   - public.combinados')
    console.log('   - public.combinados_produtos')
    console.log('   - public.vw_combinados_detalhado')

  } catch (error) {
    console.error('❌ Erro na migração:', error)
  } finally {
    await poolAntigo.end()
    await poolAuditoria.end()
  }
}

migrarCombinados()
