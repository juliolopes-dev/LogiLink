import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function corrigirView() {
  try {
    console.log('🔧 Corrigindo view Estoque_DRP...\n')

    // 1. Dropar view existente (CASCADE para dropar dependências)
    console.log('1️⃣ Dropando view existente e dependências...')
    await pool.query('DROP VIEW IF EXISTS auditoria_integracao."Estoque_DRP" CASCADE')
    console.log('   ✅ View dropada\n')

    // 2. Recriar view com filtro correto
    console.log('2️⃣ Recriando view com dados corretos de cada filial...')
    await pool.query(`
      CREATE VIEW auditoria_integracao."Estoque_DRP" AS
      -- Petrolina (filial 00)
      SELECT 
          id,
          cod_filial,
          cod_produto,
          estoque,
          quantidade_bloqueada,
          preco_custo,
          preco_medio,
          data_calculo_custo,
          estoque_minimo,
          hash_registro,
          data_extracao
      FROM auditoria_integracao.auditoria_estoque_petrolina
      WHERE cod_filial = '00'

      UNION ALL

      -- Juazeiro (filial 01)
      SELECT 
          id,
          cod_filial,
          cod_produto,
          estoque,
          quantidade_bloqueada,
          preco_custo,
          preco_medio,
          data_calculo_custo,
          estoque_minimo,
          hash_registro,
          data_extracao
      FROM auditoria_integracao.auditoria_estoque_juazeiro
      WHERE cod_filial = '01'

      UNION ALL

      -- Salgueiro (filial 02)
      SELECT 
          id,
          cod_filial,
          cod_produto,
          estoque,
          quantidade_bloqueada,
          preco_custo,
          preco_medio,
          data_calculo_custo,
          estoque_minimo,
          hash_registro,
          data_extracao
      FROM auditoria_integracao.auditoria_estoque_salgueiro
      WHERE cod_filial = '02'

      UNION ALL

      -- CD (filial 04)
      SELECT 
          id,
          cod_filial,
          cod_produto,
          estoque,
          quantidade_bloqueada,
          preco_custo,
          preco_medio,
          data_calculo_custo,
          estoque_minimo,
          hash_registro,
          data_extracao
      FROM auditoria_integracao.auditoria_estoque_juazeiro
      WHERE cod_filial = '04'

      UNION ALL

      -- Bonfim (filial 05)
      SELECT 
          id,
          cod_filial,
          cod_produto,
          estoque,
          quantidade_bloqueada,
          preco_custo,
          preco_medio,
          data_calculo_custo,
          estoque_minimo,
          hash_registro,
          data_extracao
      FROM auditoria_integracao.auditoria_estoque_bonfim
      WHERE cod_filial = '05'

      UNION ALL

      -- Picos (filial 06)
      SELECT 
          id,
          cod_filial,
          cod_produto,
          estoque,
          quantidade_bloqueada,
          preco_custo,
          preco_medio,
          data_calculo_custo,
          estoque_minimo,
          hash_registro,
          data_extracao
      FROM auditoria_integracao.auditoria_estoque_picos
      WHERE cod_filial = '06'
    `)
    console.log('   ✅ View recriada\n')

    // 3. Verificar resultado
    console.log('3️⃣ Verificando registros por filial...')
    const resultado = await pool.query(`
      SELECT 
        cod_filial,
        COUNT(*) as total_registros
      FROM auditoria_integracao."Estoque_DRP"
      GROUP BY cod_filial
      ORDER BY cod_filial
    `)

    console.log('\n📊 Registros por filial na view Estoque_DRP:')
    console.log('   Filial | Total Registros')
    console.log('   ' + '-'.repeat(30))
    for (const row of resultado.rows) {
      console.log(`   ${row.cod_filial.padEnd(6)} | ${row.total_registros.toString().padStart(15)}`)
    }

    // 4. Verificar especificamente filial 04
    const filial04 = await pool.query(`
      SELECT COUNT(*) as total
      FROM auditoria_integracao."Estoque_DRP"
      WHERE cod_filial = '04'
    `)

    console.log('\n✅ Filial 04 (CD): ' + filial04.rows[0].total + ' registros')
    console.log('\n🎉 Correção concluída com sucesso!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

corrigirView()
