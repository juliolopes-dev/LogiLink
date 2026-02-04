import poolAuditoria from '../src/lib/database-auditoria'

async function criarTabelaProdutoConfigDRP() {
  try {
    console.log('🔧 Criando tabela Produto_Config_DRP...')

    // Criar tabela de configuração de produtos para DRP
    await poolAuditoria.query(`
      CREATE TABLE IF NOT EXISTS auditoria_integracao."Produto_Config_DRP" (
        cod_produto VARCHAR(20) PRIMARY KEY,
        multiplo_venda INTEGER DEFAULT 1 CHECK (multiplo_venda > 0),
        observacao TEXT,
        ativo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)

    console.log('✅ Tabela Produto_Config_DRP criada com sucesso!')

    // Criar índices para performance
    await poolAuditoria.query(`
      CREATE INDEX IF NOT EXISTS idx_produto_config_drp_ativo 
      ON auditoria_integracao."Produto_Config_DRP"(ativo);
    `)

    console.log('✅ Índices criados com sucesso!')

    // Criar função de trigger para atualizar updated_at
    await poolAuditoria.query(`
      CREATE OR REPLACE FUNCTION auditoria_integracao.update_produto_config_drp_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `)

    await poolAuditoria.query(`
      DROP TRIGGER IF EXISTS trigger_update_produto_config_drp_timestamp 
      ON auditoria_integracao."Produto_Config_DRP";
      
      CREATE TRIGGER trigger_update_produto_config_drp_timestamp
      BEFORE UPDATE ON auditoria_integracao."Produto_Config_DRP"
      FOR EACH ROW
      EXECUTE FUNCTION auditoria_integracao.update_produto_config_drp_timestamp();
    `)

    console.log('✅ Trigger de atualização criado com sucesso!')

    // Inserir alguns exemplos para teste
    await poolAuditoria.query(`
      INSERT INTO auditoria_integracao."Produto_Config_DRP" (cod_produto, multiplo_venda, observacao)
      VALUES 
        ('052680', 4, 'Velas de ignição - vendidas em múltiplos de 4'),
        ('037937', 10, 'Rebites - vendidos em caixas de 10')
      ON CONFLICT (cod_produto) DO NOTHING;
    `)

    console.log('✅ Exemplos inseridos com sucesso!')

    // Verificar dados inseridos
    const result = await poolAuditoria.query(`
      SELECT * FROM auditoria_integracao."Produto_Config_DRP" 
      ORDER BY cod_produto
    `)

    console.log('\n📊 Registros na tabela:')
    console.table(result.rows)

    console.log('\n✅ Script executado com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error)
    throw error
  } finally {
    await poolAuditoria.end()
  }
}

criarTabelaProdutoConfigDRP()
