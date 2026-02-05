import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function renomearProdutosCombinado() {
  try {
    console.log('🔄 Renomeando Grupo_Combinado_Produtos_DRP → Produtos_Combinado_DRP\n')

    // 1. Dropar VIEW
    await pool.query('DROP VIEW IF EXISTS auditoria_integracao.vw_grupo_combinado_detalhado CASCADE')

    // 2. Renomear tabela
    await pool.query('ALTER TABLE auditoria_integracao."Grupo_Combinado_Produtos_DRP" RENAME TO "Produtos_Combinado_DRP"')
    console.log('✅ Tabela renomeada\n')

    // 3. Recriar VIEW
    await pool.query(`
      CREATE OR REPLACE VIEW auditoria_integracao.vw_grupo_combinado_detalhado AS
      SELECT 
        c.cod_grupo,
        c.descricao AS grupo_descricao,
        c.ativo,
        c.observacao,
        cp.cod_produto,
        cp.ordem,
        c.created_at,
        c.updated_at
      FROM auditoria_integracao."Grupo_Combinado_DRP" c
      JOIN auditoria_integracao."Produtos_Combinado_DRP" cp 
        ON c.cod_grupo = cp.cod_grupo
      ORDER BY c.cod_grupo, cp.ordem, cp.cod_produto
    `)
    console.log('✅ VIEW recriada\n')

    // 4. Verificar
    const tabelas = await pool.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'auditoria_integracao'
        AND (table_name LIKE '%Combinado%' OR table_name LIKE '%combinado%')
      ORDER BY table_name
    `)

    console.log('✅ Estrutura Final:\n')
    for (const t of tabelas.rows) {
      const icone = t.table_type === 'BASE TABLE' ? '📊' : '👁️ '
      console.log(`${icone} ${t.table_name}`)
    }

    console.log('\n✅ Renomeação concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

renomearProdutosCombinado()
