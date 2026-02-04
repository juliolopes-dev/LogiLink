/**
 * Script para criar as tabelas Pedido_DRP e Pedido_DRP_Itens
 * Executar: npx tsx scripts/criar-tabelas-pedido-drp.ts
 */

import poolAuditoria from '../src/lib/database-auditoria'

async function criarTabelas() {
  console.log('🚀 Criando tabelas Pedido_DRP...')

  try {
    // Criar tabela principal de pedidos
    await poolAuditoria.query(`
      CREATE TABLE IF NOT EXISTS auditoria_integracao."Pedido_DRP" (
        id SERIAL PRIMARY KEY,
        numero_pedido VARCHAR(50) NOT NULL UNIQUE,
        numero_nf_origem VARCHAR(50) NOT NULL,
        cod_filial_destino VARCHAR(10) NOT NULL,
        nome_filial_destino VARCHAR(100),
        data_pedido TIMESTAMP DEFAULT NOW(),
        status VARCHAR(20) DEFAULT 'pendente',
        usuario VARCHAR(100),
        observacao TEXT,
        total_itens INTEGER DEFAULT 0,
        total_quantidade NUMERIC(15,3) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Tabela Pedido_DRP criada')

    // Criar tabela de itens do pedido
    await poolAuditoria.query(`
      CREATE TABLE IF NOT EXISTS auditoria_integracao."Pedido_DRP_Itens" (
        id SERIAL PRIMARY KEY,
        pedido_id INTEGER NOT NULL REFERENCES auditoria_integracao."Pedido_DRP"(id) ON DELETE CASCADE,
        cod_produto VARCHAR(20) NOT NULL,
        descricao_produto VARCHAR(255),
        quantidade NUMERIC(15,3) NOT NULL,
        tipo_calculo VARCHAR(30),
        necessidade_original NUMERIC(15,3),
        estoque_filial NUMERIC(15,3),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `)
    console.log('✅ Tabela Pedido_DRP_Itens criada')

    // Criar índices para melhor performance
    await poolAuditoria.query(`
      CREATE INDEX IF NOT EXISTS idx_pedido_drp_nf_origem 
      ON auditoria_integracao."Pedido_DRP"(numero_nf_origem)
    `)
    
    await poolAuditoria.query(`
      CREATE INDEX IF NOT EXISTS idx_pedido_drp_filial 
      ON auditoria_integracao."Pedido_DRP"(cod_filial_destino)
    `)
    
    await poolAuditoria.query(`
      CREATE INDEX IF NOT EXISTS idx_pedido_drp_status 
      ON auditoria_integracao."Pedido_DRP"(status)
    `)
    
    await poolAuditoria.query(`
      CREATE INDEX IF NOT EXISTS idx_pedido_drp_itens_pedido 
      ON auditoria_integracao."Pedido_DRP_Itens"(pedido_id)
    `)
    
    await poolAuditoria.query(`
      CREATE INDEX IF NOT EXISTS idx_pedido_drp_itens_produto 
      ON auditoria_integracao."Pedido_DRP_Itens"(cod_produto)
    `)
    console.log('✅ Índices criados')

    // Criar função para gerar número do pedido
    await poolAuditoria.query(`
      CREATE OR REPLACE FUNCTION auditoria_integracao.gerar_numero_pedido_drp(filial VARCHAR)
      RETURNS VARCHAR AS $$
      DECLARE
        sequencia INTEGER;
        ano_mes VARCHAR;
        numero VARCHAR;
      BEGIN
        ano_mes := TO_CHAR(NOW(), 'YYMM');
        
        SELECT COALESCE(MAX(
          CAST(SUBSTRING(numero_pedido FROM 'DRP-[0-9]{4}-([0-9]+)-[0-9]{2}') AS INTEGER)
        ), 0) + 1
        INTO sequencia
        FROM auditoria_integracao."Pedido_DRP"
        WHERE numero_pedido LIKE 'DRP-' || ano_mes || '-%';
        
        numero := 'DRP-' || ano_mes || '-' || LPAD(sequencia::TEXT, 5, '0') || '-' || filial;
        
        RETURN numero;
      END;
      $$ LANGUAGE plpgsql;
    `)
    console.log('✅ Função gerar_numero_pedido_drp criada')

    // Verificar estrutura criada
    const result = await poolAuditoria.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'auditoria_integracao' 
        AND table_name IN ('Pedido_DRP', 'Pedido_DRP_Itens')
      ORDER BY table_name
    `)
    
    console.log('\n📊 Tabelas criadas:')
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`)
    })

    console.log('\n✅ Script executado com sucesso!')

  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error)
    throw error
  } finally {
    await poolAuditoria.end()
  }
}

criarTabelas()
