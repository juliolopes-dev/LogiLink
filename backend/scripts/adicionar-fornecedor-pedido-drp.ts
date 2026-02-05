/**
 * Script para adicionar colunas de fornecedor na tabela Pedido_DRP
 */

import poolAuditoria from '../src/lib/database-auditoria'

async function adicionarColunasFornecedor() {
  try {
    console.log('🔧 Adicionando colunas de fornecedor na tabela Pedido_DRP...\n')

    // Verificar se as colunas já existem
    const checkResult = await poolAuditoria.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'auditoria_integracao' 
        AND table_name = 'Pedido_DRP'
        AND column_name IN ('cod_fornecedor', 'nome_fornecedor')
    `)

    if (checkResult.rows.length > 0) {
      console.log('⚠️  Colunas já existem:', checkResult.rows.map(r => r.column_name))
      console.log('Nada a fazer.')
      return
    }

    // Adicionar coluna cod_fornecedor
    console.log('➕ Adicionando coluna cod_fornecedor...')
    await poolAuditoria.query(`
      ALTER TABLE auditoria_integracao."Pedido_DRP"
      ADD COLUMN IF NOT EXISTS cod_fornecedor VARCHAR(20)
    `)
    console.log('✅ Coluna cod_fornecedor adicionada')

    // Adicionar coluna nome_fornecedor
    console.log('➕ Adicionando coluna nome_fornecedor...')
    await poolAuditoria.query(`
      ALTER TABLE auditoria_integracao."Pedido_DRP"
      ADD COLUMN IF NOT EXISTS nome_fornecedor VARCHAR(255)
    `)
    console.log('✅ Coluna nome_fornecedor adicionada')

    // Verificar estrutura final
    console.log('\n📊 Estrutura atualizada da tabela Pedido_DRP:')
    const structureResult = await poolAuditoria.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'auditoria_integracao' 
        AND table_name = 'Pedido_DRP'
      ORDER BY ordinal_position
    `)
    console.table(structureResult.rows)

    console.log('\n✅ Migração concluída com sucesso!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
  }
}

adicionarColunasFornecedor()
