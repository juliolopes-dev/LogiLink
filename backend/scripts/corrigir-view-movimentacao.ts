/**
 * Script para corrigir a view Movimentacao_DRP
 * Adiciona filtros para que cada tabela retorne apenas dados de sua filial
 * Executar: npx tsx scripts/corrigir-view-movimentacao.ts
 */

import poolAuditoria from '../src/lib/database-auditoria'

async function corrigirView() {
  console.log('🔧 Corrigindo view Movimentacao_DRP...')

  try {
    // Dropar a view existente
    await poolAuditoria.query(`
      DROP VIEW IF EXISTS auditoria_integracao."Movimentacao_DRP"
    `)
    console.log('✅ View antiga removida')

    // Recriar a view com filtros por filial
    await poolAuditoria.query(`
      CREATE VIEW auditoria_integracao."Movimentacao_DRP" AS
      
      -- Petrolina (00)
      SELECT 
        id, cod_filial, cod_produto, data_movimento, tipo_movimento,
        CASE
          WHEN tipo_movimento = '01' THEN 'Entrada NF'
          WHEN tipo_movimento = '05' THEN 'Entrada Transferência'
          WHEN tipo_movimento = '09' THEN 'Troca/Devolução'
          WHEN tipo_movimento = '12' THEN 'Entrada Ajuste'
          WHEN tipo_movimento = '54' THEN 'Saída Ajuste'
          WHEN tipo_movimento = '55' THEN 'Vendas'
          WHEN tipo_movimento = '64' THEN 'Saída Transferência'
          ELSE 'Outros'
        END AS descricao_tipo_movimento,
        quantidade, valor_custo, valor_medio, valor_venda, valor_entrada,
        numero_documento, tipo_agente, cod_agente, sequencia, hash_registro, data_extracao
      FROM auditoria_integracao.auditoria_mov_petrolina
      WHERE cod_filial = '00'
      
      UNION ALL
      
      -- Juazeiro (01)
      SELECT 
        id, cod_filial, cod_produto, data_movimento, tipo_movimento,
        CASE
          WHEN tipo_movimento = '01' THEN 'Entrada NF'
          WHEN tipo_movimento = '05' THEN 'Entrada Transferência'
          WHEN tipo_movimento = '09' THEN 'Troca/Devolução'
          WHEN tipo_movimento = '12' THEN 'Entrada Ajuste'
          WHEN tipo_movimento = '54' THEN 'Saída Ajuste'
          WHEN tipo_movimento = '55' THEN 'Vendas'
          WHEN tipo_movimento = '64' THEN 'Saída Transferência'
          ELSE 'Outros'
        END AS descricao_tipo_movimento,
        quantidade, valor_custo, valor_medio, valor_venda, valor_entrada,
        numero_documento, tipo_agente, cod_agente, sequencia, hash_registro, data_extracao
      FROM auditoria_integracao.auditoria_mov_juazeiro
      WHERE cod_filial = '01'
      
      UNION ALL
      
      -- Salgueiro (02)
      SELECT 
        id, cod_filial, cod_produto, data_movimento, tipo_movimento,
        CASE
          WHEN tipo_movimento = '01' THEN 'Entrada NF'
          WHEN tipo_movimento = '05' THEN 'Entrada Transferência'
          WHEN tipo_movimento = '09' THEN 'Troca/Devolução'
          WHEN tipo_movimento = '12' THEN 'Entrada Ajuste'
          WHEN tipo_movimento = '54' THEN 'Saída Ajuste'
          WHEN tipo_movimento = '55' THEN 'Vendas'
          WHEN tipo_movimento = '64' THEN 'Saída Transferência'
          ELSE 'Outros'
        END AS descricao_tipo_movimento,
        quantidade, valor_custo, valor_medio, valor_venda, valor_entrada,
        numero_documento, tipo_agente, cod_agente, sequencia, hash_registro, data_extracao
      FROM auditoria_integracao.auditoria_mov_salgueiro
      WHERE cod_filial = '02'
      
      UNION ALL
      
      -- Bonfim (05)
      SELECT 
        id, cod_filial, cod_produto, data_movimento, tipo_movimento,
        CASE
          WHEN tipo_movimento = '01' THEN 'Entrada NF'
          WHEN tipo_movimento = '05' THEN 'Entrada Transferência'
          WHEN tipo_movimento = '09' THEN 'Troca/Devolução'
          WHEN tipo_movimento = '12' THEN 'Entrada Ajuste'
          WHEN tipo_movimento = '54' THEN 'Saída Ajuste'
          WHEN tipo_movimento = '55' THEN 'Vendas'
          WHEN tipo_movimento = '64' THEN 'Saída Transferência'
          ELSE 'Outros'
        END AS descricao_tipo_movimento,
        quantidade, valor_custo, valor_medio, valor_venda, valor_entrada,
        numero_documento, tipo_agente, cod_agente, sequencia, hash_registro, data_extracao
      FROM auditoria_integracao.auditoria_mov_bonfim
      WHERE cod_filial = '05'
      
      UNION ALL
      
      -- Picos (06)
      SELECT 
        id, cod_filial, cod_produto, data_movimento, tipo_movimento,
        CASE
          WHEN tipo_movimento = '01' THEN 'Entrada NF'
          WHEN tipo_movimento = '05' THEN 'Entrada Transferência'
          WHEN tipo_movimento = '09' THEN 'Troca/Devolução'
          WHEN tipo_movimento = '12' THEN 'Entrada Ajuste'
          WHEN tipo_movimento = '54' THEN 'Saída Ajuste'
          WHEN tipo_movimento = '55' THEN 'Vendas'
          WHEN tipo_movimento = '64' THEN 'Saída Transferência'
          ELSE 'Outros'
        END AS descricao_tipo_movimento,
        quantidade, valor_custo, valor_medio, valor_venda, valor_entrada,
        numero_documento, tipo_agente, cod_agente, sequencia, hash_registro, data_extracao
      FROM auditoria_integracao.auditoria_mov_picos
      WHERE cod_filial = '06'
    `)
    console.log('✅ View recriada com filtros por filial')

    // Verificar resultado
    const result = await poolAuditoria.query(`
      SELECT 
        cod_filial,
        COUNT(*) as total_registros
      FROM auditoria_integracao."Movimentacao_DRP"
      WHERE data_movimento >= CURRENT_DATE - INTERVAL '30 days'
        AND tipo_movimento = '55'
      GROUP BY cod_filial
      ORDER BY cod_filial
    `)

    console.log('\n📊 Registros por filial (últimos 30 dias):')
    result.rows.forEach(row => {
      const nomeFilial = {
        '00': 'Petrolina',
        '01': 'Juazeiro',
        '02': 'Salgueiro',
        '05': 'Bonfim',
        '06': 'Picos'
      }[row.cod_filial] || row.cod_filial
      
      console.log(`   ${nomeFilial} (${row.cod_filial}): ${row.total_registros} registros`)
    })

    console.log('\n✅ View corrigida com sucesso!')

  } catch (error) {
    console.error('❌ Erro ao corrigir view:', error)
    throw error
  } finally {
    await poolAuditoria.end()
  }
}

corrigirView()
