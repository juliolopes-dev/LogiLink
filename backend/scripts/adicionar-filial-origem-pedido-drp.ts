/**
 * Script para adicionar colunas cod_filial_origem e nome_filial_origem
 * na tabela Pedido_DRP
 */

import poolAuditoria from '../src/lib/database-auditoria'

async function adicionarFilialOrigem() {
  try {
    console.log('🔧 Adicionando colunas de filial de origem na tabela Pedido_DRP...\n')

    // Verificar se as colunas já existem
    const checkResult = await poolAuditoria.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'auditoria_integracao' 
        AND table_name = 'Pedido_DRP'
        AND column_name IN ('cod_filial_origem', 'nome_filial_origem')
    `)

    if (checkResult.rows.length >= 2) {
      console.log('⚠️  Colunas já existem:', checkResult.rows.map(r => r.column_name))
      console.log('Nada a fazer.')
      return
    }

    // Adicionar coluna cod_filial_origem
    console.log('➕ Adicionando coluna cod_filial_origem...')
    await poolAuditoria.query(`
      ALTER TABLE auditoria_integracao."Pedido_DRP"
      ADD COLUMN IF NOT EXISTS cod_filial_origem VARCHAR(10)
    `)
    console.log('✅ Coluna cod_filial_origem adicionada')

    // Adicionar coluna nome_filial_origem
    console.log('➕ Adicionando coluna nome_filial_origem...')
    await poolAuditoria.query(`
      ALTER TABLE auditoria_integracao."Pedido_DRP"
      ADD COLUMN IF NOT EXISTS nome_filial_origem VARCHAR(100)
    `)
    console.log('✅ Coluna nome_filial_origem adicionada')

    // Atualizar registros existentes que não têm filial de origem (padrão: CD)
    const updateResult = await poolAuditoria.query(`
      UPDATE auditoria_integracao."Pedido_DRP"
      SET cod_filial_origem = '04', nome_filial_origem = 'CD'
      WHERE cod_filial_origem IS NULL
    `)
    console.log(`📝 ${updateResult.rowCount} registros existentes atualizados com filial origem CD (padrão)`)

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

adicionarFilialOrigem()
