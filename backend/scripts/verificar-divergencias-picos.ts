import { Pool } from 'pg'

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function verificarDivergenciasPicos() {
  try {
    console.log('🔍 Verificando divergências de estoque na filial Picos...\n')

    // Divergências de estoque em Picos
    const divergenciasEstoque = await poolAuditoria.query(`
      SELECT 
        codigo_do_produto,
        nome_filial,
        estoque_atual_local,
        estoque_atual_matriz,
        divergencia_estoque,
        divergencia_movimentacao
      FROM auditoria_integracao."DIVERGENCIAS_OFFLINE_DRP"
      WHERE nome_filial = 'Picos'
        AND divergencia_estoque > 0
      ORDER BY divergencia_estoque DESC
      LIMIT 20
    `)

    if (divergenciasEstoque.rows.length > 0) {
      console.log(`⚠️  Encontradas ${divergenciasEstoque.rows.length} divergências de ESTOQUE em Picos:\n`)
      console.log('CODIGO | EST.LOCAL | EST.MATRIZ | DIV.ESTOQUE | DIV.MOVIMENTACAO')
      console.log('-------+-----------+------------+-------------+-----------------')
      
      divergenciasEstoque.rows.forEach(row => {
        console.log(
          `${row.codigo_do_produto.padEnd(6)} | ` +
          `${row.estoque_atual_local.toString().padStart(9)} | ` +
          `${row.estoque_atual_matriz.toString().padStart(10)} | ` +
          `${row.divergencia_estoque.toString().padStart(11)} | ` +
          `${row.divergencia_movimentacao.toString().padStart(16)}`
        )
      })
    } else {
      console.log('✅ Nenhuma divergência de ESTOQUE encontrada em Picos!')
    }

    // Estatísticas gerais de Picos
    console.log('\n\n📊 Estatísticas gerais de Picos:\n')
    
    const stats = await poolAuditoria.query(`
      SELECT 
        COUNT(*) as total_divergencias,
        COUNT(CASE WHEN divergencia_estoque > 0 THEN 1 END) as com_divergencia_estoque,
        COUNT(CASE WHEN divergencia_estoque = 0 THEN 1 END) as sem_divergencia_estoque,
        SUM(divergencia_estoque) as soma_divergencia_estoque,
        SUM(divergencia_movimentacao) as soma_divergencia_movimentacao,
        MAX(divergencia_estoque) as maior_divergencia_estoque,
        MAX(divergencia_movimentacao) as maior_divergencia_movimentacao
      FROM auditoria_integracao."DIVERGENCIAS_OFFLINE_DRP"
      WHERE nome_filial = 'Picos'
    `)

    const stat = stats.rows[0]
    console.log(`Total de produtos com divergência: ${stat.total_divergencias}`)
    console.log(`  - Com divergência de estoque: ${stat.com_divergencia_estoque}`)
    console.log(`  - Sem divergência de estoque: ${stat.sem_divergencia_estoque}`)
    console.log(`\nSoma total de divergência de estoque: ${parseFloat(stat.soma_divergencia_estoque || 0).toFixed(2)}`)
    console.log(`Soma total de divergência de movimentação: ${parseFloat(stat.soma_divergencia_movimentacao || 0).toFixed(2)}`)
    console.log(`\nMaior divergência de estoque: ${parseFloat(stat.maior_divergencia_estoque || 0).toFixed(2)}`)
    console.log(`Maior divergência de movimentação: ${parseFloat(stat.maior_divergencia_movimentacao || 0).toFixed(2)}`)

    console.log('\n✅ Verificação concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
  }
}

verificarDivergenciasPicos()
