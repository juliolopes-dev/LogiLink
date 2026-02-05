/**
 * Script para atualizar pedidos DRP existentes com dados do fornecedor
 */

import poolAuditoria from '../src/lib/database-auditoria'

async function atualizarPedidosExistentes() {
  try {
    console.log('🔄 Atualizando pedidos existentes com dados do fornecedor...\n')

    // Buscar pedidos sem fornecedor
    const pedidosSemFornecedorResult = await poolAuditoria.query(`
      SELECT id, numero_pedido, numero_nf_origem, cod_fornecedor, nome_fornecedor
      FROM auditoria_integracao."Pedido_DRP"
      WHERE cod_fornecedor IS NULL OR nome_fornecedor IS NULL
      ORDER BY data_pedido DESC
    `)

    const pedidos = pedidosSemFornecedorResult.rows
    console.log(`📋 Encontrados ${pedidos.length} pedidos sem dados de fornecedor`)

    if (pedidos.length === 0) {
      console.log('✅ Todos os pedidos já possuem dados de fornecedor!')
      return
    }

    let atualizados = 0
    let erros = 0

    for (const pedido of pedidos) {
      try {
        // Buscar fornecedor da NF
        const fornecedorResult = await poolAuditoria.query(`
          SELECT DISTINCT nf.cod_fornecedor, f.nome as nome_fornecedor
          FROM auditoria_integracao."NF_Entrada_DRP" nf
          LEFT JOIN auditoria_integracao."Fornecedor" f ON f.codfornec = nf.cod_fornecedor
          WHERE nf.numero_nota = $1 AND nf.cod_filial = '04'
          LIMIT 1
        `, [pedido.numero_nf_origem])

        if (fornecedorResult.rows.length > 0) {
          const codFornecedor = fornecedorResult.rows[0].cod_fornecedor
          const nomeFornecedor = fornecedorResult.rows[0].nome_fornecedor || 'Fornecedor não identificado'

          // Atualizar pedido
          await poolAuditoria.query(`
            UPDATE auditoria_integracao."Pedido_DRP"
            SET cod_fornecedor = $1, nome_fornecedor = $2
            WHERE id = $3
          `, [codFornecedor, nomeFornecedor, pedido.id])

          console.log(`✅ Pedido ${pedido.numero_pedido} (NF ${pedido.numero_nf_origem}): ${codFornecedor} - ${nomeFornecedor}`)
          atualizados++
        } else {
          console.log(`⚠️  Pedido ${pedido.numero_pedido} (NF ${pedido.numero_nf_origem}): Fornecedor não encontrado`)
          erros++
        }
      } catch (error) {
        console.error(`❌ Erro ao atualizar pedido ${pedido.numero_pedido}:`, error)
        erros++
      }
    }

    console.log('\n📊 Resumo:')
    console.log(`   ✅ Atualizados: ${atualizados}`)
    console.log(`   ⚠️  Erros/Não encontrados: ${erros}`)
    console.log(`   📋 Total processados: ${pedidos.length}`)

    // Verificar resultado final
    const verificacaoResult = await poolAuditoria.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(cod_fornecedor) as com_fornecedor,
        COUNT(*) - COUNT(cod_fornecedor) as sem_fornecedor
      FROM auditoria_integracao."Pedido_DRP"
    `)

    console.log('\n📈 Status final da tabela Pedido_DRP:')
    console.table(verificacaoResult.rows)

    console.log('\n✅ Atualização concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
  }
}

atualizarPedidosExistentes()
