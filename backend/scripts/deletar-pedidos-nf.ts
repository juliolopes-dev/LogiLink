import poolAuditoria from '../src/lib/database-auditoria.js'

async function deletarPedidosNF() {
  const numeroNF = '61573'
  
  try {
    console.log(`🗑️  Deletando pedidos da NF ${numeroNF}...`)

    // Buscar pedidos da NF
    const pedidosResult = await poolAuditoria.query(`
      SELECT id, numero_pedido, nome_filial_destino, total_itens
      FROM auditoria_integracao."Pedido_DRP"
      WHERE numero_nf_origem = $1
    `, [numeroNF])

    if (pedidosResult.rows.length === 0) {
      console.log('⚠️  Nenhum pedido encontrado para esta NF')
      return
    }

    console.log(`📋 Encontrados ${pedidosResult.rows.length} pedidos:`)
    pedidosResult.rows.forEach(p => {
      console.log(`   - ${p.numero_pedido} (${p.nome_filial_destino}) - ${p.total_itens} itens`)
    })

    // Deletar itens dos pedidos
    const deleteItensResult = await poolAuditoria.query(`
      DELETE FROM auditoria_integracao."Pedido_DRP_Itens"
      WHERE pedido_id IN (
        SELECT id FROM auditoria_integracao."Pedido_DRP"
        WHERE numero_nf_origem = $1
      )
    `, [numeroNF])
    console.log(`✅ ${deleteItensResult.rowCount} itens deletados`)

    // Deletar pedidos
    const deletePedidosResult = await poolAuditoria.query(`
      DELETE FROM auditoria_integracao."Pedido_DRP"
      WHERE numero_nf_origem = $1
    `, [numeroNF])
    console.log(`✅ ${deletePedidosResult.rowCount} pedidos deletados`)

    console.log(`\n✅ Todos os pedidos da NF ${numeroNF} foram removidos com sucesso!`)

  } catch (error) {
    console.error('❌ Erro ao deletar pedidos:', error)
    throw error
  } finally {
    await poolAuditoria.end()
  }
}

deletarPedidosNF()
