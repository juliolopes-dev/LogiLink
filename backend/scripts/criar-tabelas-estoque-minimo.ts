/**
 * Script de Migração: Criar tabelas de Estoque Mínimo Dinâmico
 * 
 * Execução: npx tsx scripts/criar-tabelas-estoque-minimo.ts
 * 
 * Tabelas criadas:
 * - estoque_minimo: Armazena o estoque mínimo calculado por produto/filial
 * - estoque_minimo_historico: Histórico de alterações para auditoria
 */

import poolAuditoria from '../src/lib/database-auditoria'

async function main() {
  console.log('🚀 Iniciando criação das tabelas de Estoque Mínimo...')
  console.log('=' .repeat(60))

  try {
    // 1. Criar tabela estoque_minimo
    console.log('\n📦 Criando tabela estoque_minimo...')
    
    await poolAuditoria.query(`
      CREATE TABLE IF NOT EXISTS estoque_minimo (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cod_produto VARCHAR(20) NOT NULL,
        cod_filial VARCHAR(2) NOT NULL,
        
        -- Resultado do cálculo
        estoque_minimo_calculado INTEGER NOT NULL DEFAULT 0,
        estoque_minimo_manual INTEGER,
        estoque_minimo_ativo INTEGER NOT NULL DEFAULT 0,
        
        -- Dados do cálculo
        media_vendas_diarias DECIMAL(10,4) DEFAULT 0,
        lead_time_dias INTEGER DEFAULT 30,
        buffer_dias INTEGER DEFAULT 0,
        fator_seguranca DECIMAL(5,2) DEFAULT 1.5,
        fator_tendencia DECIMAL(5,2) DEFAULT 1.0,
        fator_sazonal DECIMAL(5,2) DEFAULT 1.0,
        classe_abc CHAR(1) DEFAULT 'C',
        
        -- Vendas usadas no cálculo
        vendas_180_dias INTEGER DEFAULT 0,
        vendas_90_dias INTEGER DEFAULT 0,
        vendas_90_180_dias INTEGER DEFAULT 0,
        
        -- Metadados
        data_calculo TIMESTAMP DEFAULT NOW(),
        data_proxima_atualizacao TIMESTAMP,
        metodo VARCHAR(20) DEFAULT 'automatico',
        usuario_ajuste VARCHAR(100),
        observacao TEXT,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        -- Constraints
        CONSTRAINT estoque_minimo_produto_filial_unique UNIQUE(cod_produto, cod_filial),
        CONSTRAINT estoque_minimo_classe_check CHECK (classe_abc IN ('A', 'B', 'C')),
        CONSTRAINT estoque_minimo_metodo_check CHECK (metodo IN ('automatico', 'manual', 'ajustado', 'estimativa'))
      )
    `)
    
    console.log('✅ Tabela estoque_minimo criada com sucesso!')

    // 2. Criar índices para estoque_minimo
    console.log('\n📊 Criando índices para estoque_minimo...')
    
    const indices = [
      { nome: 'idx_estoque_minimo_produto', sql: 'CREATE INDEX IF NOT EXISTS idx_estoque_minimo_produto ON estoque_minimo(cod_produto)' },
      { nome: 'idx_estoque_minimo_filial', sql: 'CREATE INDEX IF NOT EXISTS idx_estoque_minimo_filial ON estoque_minimo(cod_filial)' },
      { nome: 'idx_estoque_minimo_classe', sql: 'CREATE INDEX IF NOT EXISTS idx_estoque_minimo_classe ON estoque_minimo(classe_abc)' },
      { nome: 'idx_estoque_minimo_data', sql: 'CREATE INDEX IF NOT EXISTS idx_estoque_minimo_data ON estoque_minimo(data_calculo)' }
    ]
    
    for (const indice of indices) {
      await poolAuditoria.query(indice.sql)
      console.log(`  ✅ ${indice.nome}`)
    }

    // 3. Criar tabela estoque_minimo_historico
    console.log('\n📜 Criando tabela estoque_minimo_historico...')
    
    await poolAuditoria.query(`
      CREATE TABLE IF NOT EXISTS estoque_minimo_historico (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        cod_produto VARCHAR(20) NOT NULL,
        cod_filial VARCHAR(2) NOT NULL,
        
        -- Valores
        estoque_minimo_anterior INTEGER,
        estoque_minimo_novo INTEGER NOT NULL,
        variacao_percentual DECIMAL(10,2),
        
        -- Dados do cálculo
        media_vendas_diarias DECIMAL(10,4),
        lead_time_dias INTEGER,
        buffer_dias INTEGER,
        fator_seguranca DECIMAL(5,2),
        fator_tendencia DECIMAL(5,2),
        fator_sazonal DECIMAL(5,2),
        classe_abc CHAR(1),
        
        -- Vendas usadas
        vendas_180_dias INTEGER,
        vendas_90_dias INTEGER,
        vendas_90_180_dias INTEGER,
        
        -- Metadados
        data_calculo TIMESTAMP DEFAULT NOW(),
        metodo VARCHAR(20),
        usuario VARCHAR(100),
        observacao TEXT
      )
    `)
    
    console.log('✅ Tabela estoque_minimo_historico criada com sucesso!')

    // 4. Criar índices para estoque_minimo_historico
    console.log('\n📊 Criando índices para estoque_minimo_historico...')
    
    const indicesHistorico = [
      { nome: 'idx_estoque_minimo_hist_produto', sql: 'CREATE INDEX IF NOT EXISTS idx_estoque_minimo_hist_produto ON estoque_minimo_historico(cod_produto)' },
      { nome: 'idx_estoque_minimo_hist_filial', sql: 'CREATE INDEX IF NOT EXISTS idx_estoque_minimo_hist_filial ON estoque_minimo_historico(cod_filial)' },
      { nome: 'idx_estoque_minimo_hist_data', sql: 'CREATE INDEX IF NOT EXISTS idx_estoque_minimo_hist_data ON estoque_minimo_historico(data_calculo)' }
    ]
    
    for (const indice of indicesHistorico) {
      await poolAuditoria.query(indice.sql)
      console.log(`  ✅ ${indice.nome}`)
    }

    // 5. Verificar se as tabelas foram criadas
    console.log('\n🔍 Verificando tabelas criadas...')
    
    const tabelasResult = await poolAuditoria.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('estoque_minimo', 'estoque_minimo_historico')
    `)
    
    console.log(`  📋 Tabelas encontradas: ${tabelasResult.rows.map((t: any) => t.tablename).join(', ')}`)

    // 6. Contar registros (deve ser 0)
    const countEstoqueMinimo = await poolAuditoria.query(`
      SELECT COUNT(*) as count FROM estoque_minimo
    `)
    
    const countHistorico = await poolAuditoria.query(`
      SELECT COUNT(*) as count FROM estoque_minimo_historico
    `)
    
    console.log(`  📊 Registros em estoque_minimo: ${countEstoqueMinimo.rows[0].count}`)
    console.log(`  📊 Registros em estoque_minimo_historico: ${countHistorico.rows[0].count}`)

    console.log('\n' + '=' .repeat(60))
    console.log('✅ Migração concluída com sucesso!')
    console.log('=' .repeat(60))
    
    console.log('\n📝 Próximos passos:')
    console.log('  1. Executar o cálculo inicial de estoque mínimo')
    console.log('  2. Configurar job mensal de recálculo')
    console.log('  3. Testar API de consulta e ajuste')

  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await poolAuditoria.end()
    console.log('\n👋 Conexão com banco de dados encerrada.')
  })
