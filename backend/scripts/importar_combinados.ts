import * as XLSX from 'xlsx'
import prisma from '../src/lib/prisma.js'
import { join } from 'path'

interface LinhaExcel {
  'N.GRUPO': string
  'B': string
  'PRODUTO': string | number
  'UN': string
  'PAI': string
  'FILHO': string
  'DESCRIÇÃO': string
}

function normalizarCodProduto(cod: string | number): string {
  let codStr = String(cod).trim()
  if (codStr.includes('E') || codStr.includes('e')) {
    codStr = Number(cod).toString()
  }
  return codStr.padStart(6, '0')
}

async function importarCombinados() {
  try {
    console.log('📂 Lendo arquivo COMBINADOS.xlsx...')
    const caminhoArquivo = join(process.cwd(), '..', 'COMBINADOS.xlsx')
    const workbook = XLSX.readFile(caminhoArquivo)
    const dados: LinhaExcel[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])

    console.log(`📊 ${dados.length} linhas encontradas`)
    console.log('🔄 Processando em lote...\n')

    // Agrupar dados
    const gruposMap = new Map<string, { descricao: string, produtos: Set<string> }>()
    const todosProdutos = new Set<string>()

    for (const linha of dados) {
      const codGrupo = linha['N.GRUPO']?.trim()
      const descricao = linha['B']?.trim()
      const codProdutoRaw = linha['PRODUTO']
      
      if (!codGrupo || !codProdutoRaw) continue
      
      const codProduto = normalizarCodProduto(codProdutoRaw)
      todosProdutos.add(codProduto)
      
      if (!gruposMap.has(codGrupo)) {
        gruposMap.set(codGrupo, { descricao: descricao || codGrupo, produtos: new Set() })
      }
      gruposMap.get(codGrupo)!.produtos.add(codProduto)
    }

    console.log(`📦 ${gruposMap.size} grupos encontrados`)
    console.log(`🔍 Validando ${todosProdutos.size} produtos...`)

    // Validar produtos em lote
    const produtosValidos = await prisma.dimProduto.findMany({
      where: { cod_produto: { in: Array.from(todosProdutos) } },
      select: { cod_produto: true }
    })
    const produtosValidosSet = new Set(produtosValidos.map(p => p.cod_produto))
    
    console.log(`✅ ${produtosValidosSet.size} produtos válidos\n`)

    // Limpar tabelas
    console.log('🗑️  Limpando dados antigos...')
    await prisma.$executeRaw`DELETE FROM combinados_produtos`
    await prisma.$executeRaw`DELETE FROM combinados`

    // Inserir grupos em lote
    console.log('📥 Inserindo grupos...')
    const gruposParaInserir = Array.from(gruposMap.entries()).map(([cod_grupo, data]) => ({
      cod_grupo,
      descricao: data.descricao,
      ativo: true
    }))
    
    await prisma.combinado.createMany({ data: gruposParaInserir })
    console.log(`✅ ${gruposParaInserir.length} grupos inseridos`)

    // Inserir produtos em lote
    console.log('📥 Inserindo produtos...')
    const produtosParaInserir: any[] = []
    let totalValidos = 0
    let totalInvalidos = 0

    for (const [cod_grupo, data] of gruposMap.entries()) {
      for (const cod_produto of data.produtos) {
        if (produtosValidosSet.has(cod_produto)) {
          produtosParaInserir.push({ cod_grupo, cod_produto, ordem: 1 })
          totalValidos++
        } else {
          totalInvalidos++
        }
      }
    }

    // Inserir em lotes de 1000
    const BATCH_SIZE = 1000
    for (let i = 0; i < produtosParaInserir.length; i += BATCH_SIZE) {
      const batch = produtosParaInserir.slice(i, i + BATCH_SIZE)
      await prisma.combinadoProduto.createMany({ data: batch, skipDuplicates: true })
      console.log(`   Processados ${Math.min(i + BATCH_SIZE, produtosParaInserir.length)}/${produtosParaInserir.length}`)
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 RESUMO')
    console.log('='.repeat(60))
    console.log(`✅ Grupos: ${gruposParaInserir.length}`)
    console.log(`✅ Produtos válidos: ${totalValidos}`)
    console.log(`⚠️  Produtos ignorados: ${totalInvalidos}`)
    console.log('\n✅ Importação concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

importarCombinados()
