import axios from 'axios'

const API_URL = 'http://localhost:3333/api'

async function testarEndpoints() {
  try {
    console.log('🧪 Testando endpoints de NF Entrada...\n')

    // 1. Listar NFs (últimas 5)
    console.log('1️⃣ GET /nf-entrada?limit=5\n')
    const lista = await axios.get(`${API_URL}/nf-entrada?limit=5`)
    console.log(`✅ Retornou ${lista.data.total} NFs`)
    console.log('Exemplo:', lista.data.data[0])

    // 2. Buscar NF por número
    const numeroNota = lista.data.data[0].numero_nota
    const codFilial = lista.data.data[0].cod_filial
    console.log(`\n2️⃣ GET /nf-entrada/${numeroNota}?cod_filial=${codFilial}\n`)
    const nf = await axios.get(`${API_URL}/nf-entrada/${numeroNota}?cod_filial=${codFilial}`)
    console.log(`✅ NF ${numeroNota} encontrada`)
    console.log(`   Total de itens: ${nf.data.data.total_itens}`)
    console.log(`   Valor total: R$ ${nf.data.data.valor_total.toFixed(2)}`)

    // 3. Buscar NFs por produto
    const codProduto = lista.data.data[0].cod_produto
    console.log(`\n3️⃣ GET /nf-entrada/produto/${codProduto}?limit=10\n`)
    const nfsProduto = await axios.get(`${API_URL}/nf-entrada/produto/${codProduto}?limit=10`)
    console.log(`✅ Encontradas ${nfsProduto.data.total} NFs do produto ${codProduto}`)

    // 4. Buscar NFs por fornecedor
    const codFornecedor = lista.data.data[0].cod_fornecedor
    console.log(`\n4️⃣ GET /nf-entrada/fornecedor/${codFornecedor}?limit=10\n`)
    const nfsFornecedor = await axios.get(`${API_URL}/nf-entrada/fornecedor/${codFornecedor}?limit=10`)
    console.log(`✅ Encontradas ${nfsFornecedor.data.total} NFs do fornecedor ${codFornecedor}`)

    // 5. Buscar com filtros
    console.log(`\n5️⃣ GET /nf-entrada?cod_filial=${codFilial}&limit=5\n`)
    const nfsFilial = await axios.get(`${API_URL}/nf-entrada?cod_filial=${codFilial}&limit=5`)
    console.log(`✅ Encontradas ${nfsFilial.data.total} NFs da filial ${codFilial}`)

    console.log('\n\n✅ TODOS OS ENDPOINTS FUNCIONANDO CORRETAMENTE! 🎉\n')

    console.log('📋 Endpoints disponíveis:')
    console.log('  GET  /api/nf-entrada')
    console.log('  GET  /api/nf-entrada/:numero_nota')
    console.log('  GET  /api/nf-entrada/produto/:cod_produto')
    console.log('  GET  /api/nf-entrada/fornecedor/:cod_fornecedor')

  } catch (error: any) {
    console.error('❌ Erro ao testar endpoints:', error.message)
    if (error.response) {
      console.error('Resposta:', error.response.data)
    }
  }
}

testarEndpoints()
