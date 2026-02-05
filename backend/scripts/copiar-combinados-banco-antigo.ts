import { Pool } from 'pg'

const poolAntigo = new Pool({
  connectionString: 'postgres://postgres:12be35dd1e93eead5a07@147.93.144.135:1254/dados-bezerra?sslmode=disable'
})

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function copiarCombinados() {
  try {
    console.log('🚀 Copiando Combinados do Banco Antigo\n')

    // 1. Criar tabelas
    console.log('📋 1. Criando estruturas...')
    await poolAuditoria.query(`
      CREATE TABLE IF NOT EXISTS auditoria_integracao.combinados (
        id SERIAL PRIMARY KEY,
        cod_grupo VARCHAR(50) NOT NULL UNIQUE,
        descricao VARCHAR(255) NOT NULL,
        ativo BOOLEAN DEFAULT true,
        observacao TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_combinados_ativo ON auditoria_integracao.combinados(ativo);

      CREATE TABLE IF NOT EXISTS auditoria_integracao.combinados_produtos (
        id SERIAL PRIMARY KEY,
        cod_grupo VARCHAR(50) NOT NULL,
        cod_produto VARCHAR(20) NOT NULL,
        ordem INTEGER DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT combinados_produtos_unique UNIQUE (cod_grupo, cod_produto),
        CONSTRAINT fk_combinados_grupo 
          FOREIGN KEY (cod_grupo) 
          REFERENCES auditoria_integracao.combinados(cod_grupo)
          ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_combinados_produtos_grupo ON auditoria_integracao.combinados_produtos(cod_grupo);
      CREATE INDEX IF NOT EXISTS idx_combinados_produtos_produto ON auditoria_integracao.combinados_produtos(cod_produto);

      CREATE OR REPLACE VIEW auditoria_integracao.vw_combinados_detalhado AS
      SELECT 
        c.cod_grupo, c.descricao AS grupo_descricao, c.ativo, c.observacao,
        cp.cod_produto, cp.ordem, c.created_at, c.updated_at
      FROM auditoria_integracao.combinados c
      JOIN auditoria_integracao.combinados_produtos cp ON c.cod_grupo = cp.cod_grupo
      ORDER BY c.cod_grupo, cp.ordem, cp.cod_produto;
    `)
    console.log('✅ Estruturas criadas!\n')

    // 2. Copiar grupos
    console.log('📊 2. Copiando grupos de combinados...')
    const grupos = await poolAntigo.query('SELECT * FROM public.combinados ORDER BY id')
    
    for (const g of grupos.rows) {
      await poolAuditoria.query(`
        INSERT INTO auditoria_integracao.combinados 
        (id, cod_grupo, descricao, ativo, observacao, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (cod_grupo) DO UPDATE SET
          descricao = EXCLUDED.descricao, ativo = EXCLUDED.ativo,
          observacao = EXCLUDED.observacao, updated_at = EXCLUDED.updated_at
      `, [g.id, g.cod_grupo, g.descricao, g.ativo, g.observacao, g.created_at, g.updated_at])
    }
    
    await poolAuditoria.query(`SELECT setval('auditoria_integracao.combinados_id_seq', (SELECT MAX(id) FROM auditoria_integracao.combinados))`)
    console.log(`✅ ${grupos.rows.length} grupos copiados!\n`)

    // 3. Copiar produtos
    console.log('📊 3. Copiando produtos dos combinados...')
    const produtos = await poolAntigo.query('SELECT * FROM public.combinados_produtos ORDER BY id')
    
    for (const p of produtos.rows) {
      await poolAuditoria.query(`
        INSERT INTO auditoria_integracao.combinados_produtos 
        (id, cod_grupo, cod_produto, ordem, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (cod_grupo, cod_produto) DO UPDATE SET ordem = EXCLUDED.ordem
      `, [p.id, p.cod_grupo, p.cod_produto, p.ordem, p.created_at])
    }
    
    await poolAuditoria.query(`SELECT setval('auditoria_integracao.combinados_produtos_id_seq', (SELECT MAX(id) FROM auditoria_integracao.combinados_produtos))`)
    console.log(`✅ ${produtos.rows.length} produtos copiados!\n`)

    // 4. Verificar
    const stats = await poolAuditoria.query(`
      SELECT 
        (SELECT COUNT(*) FROM auditoria_integracao.combinados) as grupos,
        (SELECT COUNT(*) FROM auditoria_integracao.combinados WHERE ativo = true) as ativos,
        (SELECT COUNT(*) FROM auditoria_integracao.combinados_produtos) as produtos
    `)

    console.log('📊 Estatísticas:')
    console.log(`   Grupos:   ${stats.rows[0].grupos} (${stats.rows[0].ativos} ativos)`)
    console.log(`   Produtos: ${stats.rows[0].produtos}`)

    const exemplo = await poolAuditoria.query('SELECT * FROM auditoria_integracao.vw_combinados_detalhado LIMIT 1')
    if (exemplo.rows.length > 0) {
      console.log('\n📋 Exemplo:')
      console.log(JSON.stringify(exemplo.rows[0], null, 2))
    }

    console.log('\n✅ Cópia concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAntigo.end()
    await poolAuditoria.end()
  }
}

copiarCombinados()
