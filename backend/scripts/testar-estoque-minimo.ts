/**
 * Script de Teste: Estoque Mínimo Dinâmico
 * 
 * Execução: npx tsx scripts/testar-estoque-minimo.ts
 * 
 * Calcula estoque mínimo para alguns produtos de exemplo e exibe os resultados
 */

import poolAuditoria from '../src/lib/database-auditoria'
import { 
  calcularEstoqueMinimoFilial, 
  salvarEstoqueMinimo,
  buscarEstoqueMinimo,
  resumoEstoqueMinimoFilial
} from '../src/services/estoque-minimo/estoque-minimo.service'

const FILIAIS = ['00', '01', '02', '05', '06']
const FILIAIS_MAP: Record<string, string> = {
  '00': 'Petrolina',
  '01': 'Juazeiro',
  '02': 'Salgueiro',
  '05': 'Bonfim',
  '06': 'Picos'
}

async function buscarProdutosExemplo(limite: number = 5): Promise<string[]> {
  console.log(`\n🔍 Buscando ${limite} produtos com vendas nos últimos 180 dias...`)
  
  const dataInicio = new Date()
  dataInicio.setDate(dataInicio.getDate() - 180)
  
  const result = await poolAuditoria.query(`
    SELECT m.cod_produto
    FROM auditoria_integracao."Movimentacao_DRP" m
    WHERE m.data_movimento >= $1
      AND m.tipo_movimento = '55'
      AND m.cod_filial != '03'
    GROUP BY m.cod_produto
    HAVING SUM(m.quantidade) > 50
    ORDER BY SUM(m.quantidade) DESC
    LIMIT $2
  `, [dataInicio, limite])
  
  const produtos = result.rows.map((r: any) => r.cod_produto)
  console.log(`✅ Encontrados ${produtos.length} produtos:`, produtos.join(', '))
  
  return produtos
}

async function buscarNomeProduto(cod_produto: string): Promise<string> {
  const result = await poolAuditoria.query(`
    SELECT descricao
    FROM auditoria_integracao.auditoria_produtos_drp
    WHERE cod_produto = $1
    LIMIT 1
  `, [cod_produto])
  
  return result.rows[0]?.descricao || 'Produto sem descrição'
}

async function testarProduto(cod_produto: string) {
  console.log('\n' + '='.repeat(80))
  
  const nomeProduto = await buscarNomeProduto(cod_produto)
  console.log(`📦 PRODUTO: ${cod_produto} - ${nomeProduto}`)
  console.log('='.repeat(80))
  
  for (const cod_filial of FILIAIS) {
    try {
      console.log(`\n🏪 ${FILIAIS_MAP[cod_filial]} (${cod_filial})`)
      console.log('-'.repeat(80))
      
      // Calcular estoque mínimo
      const resultado = await calcularEstoqueMinimoFilial(cod_produto, cod_filial)
      
      // Salvar no banco
      await salvarEstoqueMinimo(resultado)
      
      // Exibir resultados
      console.log(`📊 Dados do Cálculo:`)
      console.log(`   Vendas 180 dias: ${resultado.vendas_180_dias} unidades`)
      console.log(`   Vendas 90 dias: ${resultado.vendas_90_dias} unidades`)
      console.log(`   Vendas 90-180 dias: ${resultado.vendas_90_180_dias} unidades`)
      console.log(`   Média diária: ${resultado.media_vendas_diarias.toFixed(2)} un/dia`)
      
      console.log(`\n🎯 Classificação e Parâmetros:`)
      console.log(`   Classe ABC: ${resultado.classe_abc}`)
      console.log(`   Lead Time: ${resultado.lead_time_dias} dias`)
      console.log(`   Buffer: ${resultado.buffer_dias} dias`)
      console.log(`   Lead Time Total: ${resultado.lead_time_dias + resultado.buffer_dias} dias`)
      console.log(`   Fator Segurança: ${resultado.fator_seguranca}x`)
      console.log(`   Fator Tendência: ${resultado.fator_tendencia.toFixed(2)}x ${resultado.fator_tendencia > 1 ? '📈 (crescendo)' : resultado.fator_tendencia < 1 ? '📉 (caindo)' : '➡️ (estável)'}`)
      console.log(`   Fator Sazonal: ${resultado.fator_sazonal.toFixed(2)}x`)
      
      console.log(`\n✅ Resultado:`)
      console.log(`   ESTOQUE MÍNIMO: ${resultado.estoque_minimo_calculado} unidades`)
      
      if (resultado.estoque_minimo_anterior !== null) {
        const variacao = resultado.variacao_percentual!
        const sinal = variacao > 0 ? '+' : ''
        console.log(`   Anterior: ${resultado.estoque_minimo_anterior} unidades`)
        console.log(`   Variação: ${sinal}${variacao.toFixed(1)}%`)
      } else {
        console.log(`   (Primeiro cálculo)`)
      }
      
    } catch (error: any) {
      console.error(`   ❌ Erro ao calcular: ${error.message}`)
    }
  }
}

async function exibirResumoGeral() {
  console.log('\n' + '='.repeat(80))
  console.log('📊 RESUMO GERAL POR FILIAL')
  console.log('='.repeat(80))
  
  for (const cod_filial of FILIAIS) {
    try {
      const resumo = await resumoEstoqueMinimoFilial(cod_filial)
      
      console.log(`\n🏪 ${FILIAIS_MAP[cod_filial]} (${cod_filial})`)
      console.log('-'.repeat(80))
      console.log(`   Total de produtos: ${resumo.total_produtos}`)
      console.log(`   Classe A: ${resumo.produtos_classe_a} produtos`)
      console.log(`   Classe B: ${resumo.produtos_classe_b} produtos`)
      console.log(`   Classe C: ${resumo.produtos_classe_c} produtos`)
      console.log(`   Soma estoque mínimo: ${resumo.soma_estoque_minimo} unidades`)
      
    } catch (error: any) {
      console.error(`   ❌ Erro: ${error.message}`)
    }
  }
}

async function main() {
  console.log('🚀 TESTE DO SISTEMA DE ESTOQUE MÍNIMO DINÂMICO')
  console.log('='.repeat(80))
  console.log('Parâmetros:')
  console.log('  - Janela de vendas: 180 dias (6 meses)')
  console.log('  - Lead time: 30 dias')
  console.log('  - Classe A: Fator 2.0, +5 dias buffer')
  console.log('  - Classe B: Fator 1.5, +3 dias buffer')
  console.log('  - Classe C: Fator 1.2, 0 dias buffer')
  
  try {
    // Buscar produtos de exemplo
    const produtos = await buscarProdutosExemplo(3)
    
    if (produtos.length === 0) {
      console.log('\n⚠️ Nenhum produto encontrado com vendas suficientes.')
      return
    }
    
    // Testar cada produto
    for (const cod_produto of produtos) {
      await testarProduto(cod_produto)
    }
    
    // Exibir resumo geral
    await exibirResumoGeral()
    
    console.log('\n' + '='.repeat(80))
    console.log('✅ TESTE CONCLUÍDO COM SUCESSO!')
    console.log('='.repeat(80))
    console.log('\n📝 Próximos passos:')
    console.log('  1. Analisar os resultados acima')
    console.log('  2. Verificar se as classificações ABC fazem sentido')
    console.log('  3. Validar se os estoques mínimos estão adequados')
    console.log('  4. Testar endpoints da API')
    console.log('  5. Fazer deploy na VPS')
    
  } catch (error: any) {
    console.error('\n❌ Erro durante o teste:', error)
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
