import { Pool } from 'pg'

const pool = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function renomearTabelas() {
  try {
    console.log('🔄 Renomeando tabelas de combinados\n')

    // 1. Dropar VIEW que depende das tabelas
    console.log('📋 1. Dropando VIEW...')
    await pool.query('DROP VIEW IF EXISTS auditoria_integracao.vw_combinados_detalhado CASCADE')
    console.log('✅ OK\n')

    // 2. Renomear tabelas
    console.log('📋 2. Renomeando tabelas...')
    await pool.query('ALTER TABLE auditoria_integracao.combinados RENAME TO "Grupo_Combinado_DRP"')
    await pool.query('ALTER TABLE auditoria_integracao.combinados_produtos RENAME TO "Grupo_Combinado_Produtos_DRP"')
    console.log('✅ OK\n')

    // 3. Renomear constraints e índices
    console.log('📋 3. Renomeando constraints...')
    
    // Renomear constraint de FK
    await pool.query(`
      ALTER TABLE auditoria_integracao."Grupo_Combinado_Produtos_DRP"
      DROP CONSTRAINT IF EXISTS fk_combinados_grupo
    `)
    
    await pool.query(`
      ALTER TABLE auditoria_integracao."Grupo_Combinado_Produtos_DRP"
      ADD CONSTRAINT fk_grupo_combinado_produtos 
        FOREIGN KEY (cod_grupo) 
        REFERENCES auditoria_integracao."Grupo_Combinado_DRP"(cod_grupo)
        ON DELETE CASCADE ON UPDATE CASCADE
    `)
    
    // Renomear índices
    await pool.query('DROP INDEX IF EXISTS auditoria_integracao.idx_combinados_ativo')
    await pool.query('DROP INDEX IF EXISTS auditoria_integracao.idx_combinados_produtos_grupo')
    await pool.query('DROP INDEX IF EXISTS auditoria_integracao.idx_combinados_produtos_produto')
    
    await pool.query('CREATE INDEX idx_grupo_combinado_ativo ON auditoria_integracao."Grupo_Combinado_DRP"(ativo)')
    await pool.query('CREATE INDEX idx_grupo_combinado_produtos_grupo ON auditoria_integracao."Grupo_Combinado_Produtos_DRP"(cod_grupo)')
    await pool.query('CREATE INDEX idx_grupo_combinado_produtos_produto ON auditoria_integracao."Grupo_Combinado_Produtos_DRP"(cod_produto)')
    
    console.log('✅ OK\n')

    // 4. Recriar VIEW com novos nomes
    console.log('📋 4. Recriando VIEW...')
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
      JOIN auditoria_integracao."Grupo_Combinado_Produtos_DRP" cp 
        ON c.cod_grupo = cp.cod_grupo
      ORDER BY c.cod_grupo, cp.ordem, cp.cod_produto
    `)
    
    await pool.query(`
      COMMENT ON VIEW auditoria_integracao.vw_grupo_combinado_detalhado 
      IS 'VIEW detalhada de grupos de combinados com seus produtos'
    `)
    
    console.log('✅ OK\n')

    // 5. Atualizar comentários
    console.log('📋 5. Atualizando comentários...')
    await pool.query(`
      COMMENT ON TABLE auditoria_integracao."Grupo_Combinado_DRP" 
      IS 'Grupos de produtos combinados para DRP'
    `)
    
    await pool.query(`
      COMMENT ON TABLE auditoria_integracao."Grupo_Combinado_Produtos_DRP" 
      IS 'Produtos que compõem cada grupo de combinados'
    `)
    console.log('✅ OK\n')

    // 6. Verificar
    console.log('📊 Verificando estrutura final...\n')
    
    const tabelas = await pool.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'auditoria_integracao'
        AND (table_name LIKE '%Combinado%' OR table_name LIKE '%combinado%')
      ORDER BY table_type, table_name
    `)

    console.log('✅ Estrutura Final:\n')
    for (const t of tabelas.rows) {
      const icone = t.table_type === 'BASE TABLE' ? '📊' : '👁️ '
      console.log(`${icone} ${t.table_name}`)
    }

    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM auditoria_integracao."Grupo_Combinado_DRP") as grupos,
        (SELECT COUNT(*) FROM auditoria_integracao."Grupo_Combinado_Produtos_DRP") as produtos
    `)

    console.log(`\n📈 Dados:`)
    console.log(`   ${stats.rows[0].grupos} grupos`)
    console.log(`   ${stats.rows[0].produtos} produtos`)

    console.log('\n✅ Renomeação concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

renomearTabelas()
