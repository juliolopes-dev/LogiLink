import { Pool } from 'pg'

const poolAntigo = new Pool({
  connectionString: 'postgres://postgres:12be35dd1e93eead5a07@147.93.144.135:1254/dados-bezerra?sslmode=disable'
})

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function copiarRapido() {
  try {
    console.log('⚡ Cópia RÁPIDA de Combinados\n')

    // 1. Criar tabelas
    console.log('📋 Criando estruturas...')
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
        CONSTRAINT fk_combinados_grupo FOREIGN KEY (cod_grupo) 
          REFERENCES auditoria_integracao.combinados(cod_grupo) ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_combinados_produtos_grupo ON auditoria_integracao.combinados_produtos(cod_grupo);
      CREATE INDEX IF NOT EXISTS idx_combinados_produtos_produto ON auditoria_integracao.combinados_produtos(cod_produto);

      CREATE OR REPLACE VIEW auditoria_integracao.vw_combinados_detalhado AS
      SELECT c.cod_grupo, c.descricao AS grupo_descricao, c.ativo, c.observacao,
             cp.cod_produto, cp.ordem, c.created_at, c.updated_at
      FROM auditoria_integracao.combinados c
      JOIN auditoria_integracao.combinados_produtos cp ON c.cod_grupo = cp.cod_grupo
      ORDER BY c.cod_grupo, cp.ordem, cp.cod_produto;
    `)
    console.log('✅ OK\n')

    // 2. Copiar grupos em LOTE
    console.log('⚡ Copiando grupos...')
    const grupos = await poolAntigo.query('SELECT * FROM public.combinados')
    
    if (grupos.rows.length > 0) {
      const values = grupos.rows.map((g, i) => 
        `($${i*7+1}, $${i*7+2}, $${i*7+3}, $${i*7+4}, $${i*7+5}, $${i*7+6}, $${i*7+7})`
      ).join(',')
      
      const params = grupos.rows.flatMap(g => 
        [g.id, g.cod_grupo, g.descricao, g.ativo, g.observacao, g.created_at, g.updated_at]
      )

      await poolAuditoria.query(`
        INSERT INTO auditoria_integracao.combinados 
        (id, cod_grupo, descricao, ativo, observacao, created_at, updated_at)
        VALUES ${values}
        ON CONFLICT (cod_grupo) DO UPDATE SET
          descricao = EXCLUDED.descricao, ativo = EXCLUDED.ativo,
          observacao = EXCLUDED.observacao, updated_at = EXCLUDED.updated_at
      `, params)

      await poolAuditoria.query(`SELECT setval('auditoria_integracao.combinados_id_seq', (SELECT MAX(id) FROM auditoria_integracao.combinados))`)
    }
    console.log(`✅ ${grupos.rows.length} grupos\n`)

    // 3. Copiar produtos em LOTE
    console.log('⚡ Copiando produtos...')
    const produtos = await poolAntigo.query('SELECT * FROM public.combinados_produtos')
    
    if (produtos.rows.length > 0) {
      // Dividir em lotes de 1000
      const loteSize = 1000
      for (let i = 0; i < produtos.rows.length; i += loteSize) {
        const lote = produtos.rows.slice(i, i + loteSize)
        
        const values = lote.map((_, idx) => 
          `($${idx*5+1}, $${idx*5+2}, $${idx*5+3}, $${idx*5+4}, $${idx*5+5})`
        ).join(',')
        
        const params = lote.flatMap(p => 
          [p.id, p.cod_grupo, p.cod_produto, p.ordem, p.created_at]
        )

        await poolAuditoria.query(`
          INSERT INTO auditoria_integracao.combinados_produtos 
          (id, cod_grupo, cod_produto, ordem, created_at)
          VALUES ${values}
          ON CONFLICT (cod_grupo, cod_produto) DO UPDATE SET ordem = EXCLUDED.ordem
        `, params)

        console.log(`   ${Math.min(i + loteSize, produtos.rows.length)}/${produtos.rows.length}`)
      }

      await poolAuditoria.query(`SELECT setval('auditoria_integracao.combinados_produtos_id_seq', (SELECT MAX(id) FROM auditoria_integracao.combinados_produtos))`)
    }
    console.log(`✅ ${produtos.rows.length} produtos\n`)

    // 4. Verificar
    const stats = await poolAuditoria.query(`
      SELECT 
        (SELECT COUNT(*) FROM auditoria_integracao.combinados) as grupos,
        (SELECT COUNT(*) FROM auditoria_integracao.combinados WHERE ativo = true) as ativos,
        (SELECT COUNT(*) FROM auditoria_integracao.combinados_produtos) as produtos
    `)

    console.log('✅ CONCLUÍDO!')
    console.log(`   ${stats.rows[0].grupos} grupos (${stats.rows[0].ativos} ativos)`)
    console.log(`   ${stats.rows[0].produtos} produtos`)

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAntigo.end()
    await poolAuditoria.end()
  }
}

copiarRapido()
