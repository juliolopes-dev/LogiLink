/**
 * Script: Calcular Estoque Mínimo de Todos os Produtos
 * 
 * Execução: npx tsx scripts/calcular-todos-produtos.ts
 * 
 * Calcula o estoque mínimo de todos os produtos ativos em todas as filiais
 */

import poolAuditoria from '../src/lib/database-auditoria'
import { 
  calcularEstoqueMinimoProduto,
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

interface ProgressoCalculo {
  total_produtos: number
  processados: number
  sucesso: number
  erros: number
  inicio: Date
  produtos_erro: string[]
}

async function buscarProdutosAtivos(): Promise<string[]> {
  console.log('\n🔍 Buscando produtos ativos com vendas...')
  
  const dataInicio = new Date()
  dataInicio.setDate(dataInicio.getDate() - 180)
  
  const result = await poolAuditoria.query(`
    SELECT DISTINCT m.cod_produto
    FROM auditoria_integracao."Movimentacao_DRP" m
    WHERE m.data_movimento >= $1
      AND m.tipo_movimento = '55'
      AND m.cod_filial != '03'
    GROUP BY m.cod_produto
    HAVING SUM(m.quantidade) > 10
    ORDER BY m.cod_produto
  `, [dataInicio])
  
  const produtos = result.rows.map((r: any) => r.cod_produto)
  console.log(`✅ Encontrados ${produtos.length} produtos com vendas nos últimos 180 dias`)
  
  return produtos
}

async function calcularComProgresso(produtos: string[]): Promise<ProgressoCalculo> {
  const progresso: ProgressoCalculo = {
    total_produtos: produtos.length,
    processados: 0,
    sucesso: 0,
    erros: 0,
    inicio: new Date(),
    produtos_erro: []
  }
  
  console.log('\n🚀 Iniciando cálculo de estoque mínimo...')
  console.log('=' .repeat(60))
  
  for (const cod_produto of produtos) {
    try {
      // Calcular para todas as filiais
      await calcularEstoqueMinimoProduto(cod_produto)
      progresso.sucesso++
      
      // Log a cada 50 produtos
      if (progresso.sucesso % 50 === 0) {
        const percentual = ((progresso.sucesso / progresso.total_produtos) * 100).toFixed(1)
        const tempoDecorrido = (new Date().getTime() - progresso.inicio.getTime()) / 1000
        const tempoMedioPorProduto = tempoDecorrido / progresso.sucesso
        const tempoRestante = Math.ceil((progresso.total_produtos - progresso.sucesso) * tempoMedioPorProduto)
        
        console.log(`📊 Progresso: ${progresso.sucesso}/${progresso.total_produtos} (${percentual}%) - Tempo restante: ~${tempoRestante}s`)
      }
      
    } catch (error: any) {
      console.error(`❌ Erro no produto ${cod_produto}:`, error.message)
      progresso.erros++
      progresso.produtos_erro.push(cod_produto)
    }
    
    progresso.processados++
  }
  
  return progresso
}

async function exibirResumoFinal(progresso: ProgressoCalculo) {
  const tempoTotal = (new Date().getTime() - progresso.inicio.getTime()) / 1000
  
  console.log('\n' + '=' .repeat(60))
  console.log('✅ CÁLCULO CONCLUÍDO!')
  console.log('=' .repeat(60))
  
  console.log(`\n📊 Estatísticas:`)
  console.log(`   Total de produtos: ${progresso.total_produtos}`)
  console.log(`   Processados: ${progresso.processados}`)
  console.log(`   Sucesso: ${progresso.sucesso} (${((progresso.sucesso / progresso.total_produtos) * 100).toFixed(1)}%)`)
  console.log(`   Erros: ${progresso.erros}`)
  console.log(`   Tempo total: ${Math.ceil(tempoTotal)}s (${(tempoTotal / 60).toFixed(1)} min)`)
  
  if (progresso.produtos_erro.length > 0) {
    console.log(`\n⚠️ Produtos com erro:`)
    progresso.produtos_erro.slice(0, 10).forEach(cod => console.log(`   - ${cod}`))
    if (progresso.produtos_erro.length > 10) {
      console.log(`   ... e mais ${progresso.produtos_erro.length - 10} produtos`)
    }
  }
  
  // Resumo por filial
  console.log('\n📋 RESUMO POR FILIAL:')
  console.log('=' .repeat(60))
  
  for (const cod_filial of FILIAIS) {
    try {
      const resumo = await resumoEstoqueMinimoFilial(cod_filial)
      
      console.log(`\n🏪 ${FILIAIS_MAP[cod_filial]} (${cod_filial})`)
      console.log(`   Total de produtos: ${resumo.total_produtos}`)
      console.log(`   Classe A: ${resumo.produtos_classe_a} produtos`)
      console.log(`   Classe B: ${resumo.produtos_classe_b} produtos`)
      console.log(`   Classe C: ${resumo.produtos_classe_c} produtos`)
      console.log(`   Soma estoque mínimo: ${resumo.soma_estoque_minimo || 0} unidades`)
      
    } catch (error: any) {
      console.error(`   ❌ Erro ao buscar resumo: ${error.message}`)
    }
  }
}

async function main() {
  console.log('🎯 CÁLCULO INICIAL DE ESTOQUE MÍNIMO')
  console.log('=' .repeat(60))
  console.log('Este processo irá calcular o estoque mínimo de todos os produtos')
  console.log('ativos em todas as filiais.')
  console.log('')
  console.log('Parâmetros:')
  console.log('  - Janela de vendas: 180 dias (6 meses)')
  console.log('  - Lead time: 30 dias')
  console.log('  - Classe A: Fator 2.0, +5 dias buffer')
  console.log('  - Classe B: Fator 1.5, +3 dias buffer')
  console.log('  - Classe C: Fator 1.2, 0 dias buffer')

  try {
    // 1. Buscar produtos ativos
    const produtos = await buscarProdutosAtivos()
    
    if (produtos.length === 0) {
      console.log('\n⚠️ Nenhum produto encontrado com vendas suficientes.')
      return
    }
    
    // 2. Calcular com progresso
    const progresso = await calcularComProgresso(produtos)
    
    // 3. Exibir resumo final
    await exibirResumoFinal(progresso)
    
    console.log('\n' + '=' .repeat(60))
    console.log('🎉 Processo concluído com sucesso!')
    console.log('=' .repeat(60))
    
  } catch (error: any) {
    console.error('\n❌ Erro durante o processo:', error)
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
