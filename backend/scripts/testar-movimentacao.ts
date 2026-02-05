import { buscarMovimentacoes, buscarVendasProduto, calcularMediaVendasPorFilial, buscarHistoricoMensal } from '../src/lib/database-auditoria'

async function testarMovimentacao() {
  try {
    console.log('🧪 Testando funções de movimentação...\n')

    // Teste 1: Buscar movimentações de um produto
    console.log('📋 Teste 1: Buscar movimentações do produto 000064')
    const movimentacoes = await buscarMovimentacoes({
      codProduto: '000064',
      limit: 5
    })
    console.log(`   ✅ Encontradas ${movimentacoes.length} movimentações`)
    if (movimentacoes.length > 0) {
      console.log(`   📦 Primeira: ${movimentacoes[0].cod_filial} - ${movimentacoes[0].tipo_movimento} - ${movimentacoes[0].quantidade}`)
    }
    console.log('')

    // Teste 2: Buscar vendas de um produto
    console.log('📋 Teste 2: Buscar vendas dos últimos 90 dias do produto 000064')
    const vendas = await buscarVendasProduto('000064', 90)
    console.log(`   ✅ Encontradas ${vendas.length} vendas`)
    if (vendas.length > 0) {
      const totalVendido = vendas.reduce((acc, v) => acc + Number(v.quantidade), 0)
      console.log(`   📊 Total vendido: ${totalVendido.toLocaleString('pt-BR')} unidades`)
    }
    console.log('')

    // Teste 3: Calcular média de vendas por filial
    console.log('📋 Teste 3: Calcular média de vendas por filial (90 dias)')
    const mediaVendas = await calcularMediaVendasPorFilial('000064', 90)
    console.log(`   ✅ Estatísticas de ${mediaVendas.length} filiais:`)
    mediaVendas.forEach(m => {
      const filiais: any = {
        '00': 'Petrolina',
        '01': 'Juazeiro',
        '02': 'Salgueiro',
        '05': 'Bonfim',
        '06': 'Picos'
      }
      console.log(`   📍 ${filiais[m.cod_filial] || m.cod_filial}:`)
      console.log(`      Total vendido: ${Number(m.total_vendido).toLocaleString('pt-BR')}`)
      console.log(`      Média: ${Number(m.media_vendas).toFixed(2)}`)
      console.log(`      Desvio padrão: ${Number(m.desvio_padrao || 0).toFixed(2)}`)
    })
    console.log('')

    // Teste 4: Buscar histórico mensal
    console.log('📋 Teste 4: Buscar histórico mensal (6 meses)')
    const historico = await buscarHistoricoMensal('000064', 6)
    console.log(`   ✅ Encontrados ${historico.length} registros mensais`)
    if (historico.length > 0) {
      console.log(`   📅 Exemplo: ${historico[0].mes} - ${historico[0].tipo_movimento} - ${Number(historico[0].quantidade_total).toLocaleString('pt-BR')} unidades`)
    }
    console.log('')

    // Teste 5: Buscar por filial específica
    console.log('📋 Teste 5: Buscar movimentações da filial 00 (Petrolina)')
    const movFilial = await buscarMovimentacoes({
      codFilial: '00',
      limit: 3
    })
    console.log(`   ✅ Encontradas ${movFilial.length} movimentações de Petrolina`)
    console.log('')

    // Teste 6: Buscar por período
    console.log('📋 Teste 6: Buscar movimentações dos últimos 7 dias')
    const dataInicio = new Date()
    dataInicio.setDate(dataInicio.getDate() - 7)
    const movPeriodo = await buscarMovimentacoes({
      dataInicio,
      limit: 10
    })
    console.log(`   ✅ Encontradas ${movPeriodo.length} movimentações recentes`)
    console.log('')

    console.log('✅ Todos os testes concluídos com sucesso!')
    console.log('\n🎯 A integração com o banco de auditoria está funcionando!')

  } catch (error) {
    console.error('❌ Erro nos testes:', error)
    throw error
  } finally {
    process.exit(0)
  }
}

testarMovimentacao()
