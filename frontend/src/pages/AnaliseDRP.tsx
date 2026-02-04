import React, { useState, useEffect } from 'react'
import { FiSearch, FiFilter, FiPackage, FiAlertTriangle, FiAlertCircle, FiCheckCircle, FiX, FiTruck, FiLoader, FiPrinter, FiFileText } from 'react-icons/fi'
import Tooltip from '../components/Tooltip'

// Interfaces para DRP por NF
interface NFEntrada {
  numero_nota: string
  cod_fornecedor: string
  total_itens: string
  qtd_total: string
  data_extracao: string
}

interface CombinadoDisponivel {
  cod_produto: string
  descricao: string
  estoque_cd: number
}

interface ProdutoNF {
  cod_produto: string
  descricao: string
  referencia_fabricante: string
  grupo: string
  qtd_nf: number
  estoque_cd: number
  necessidade_total: number
  deficit: number
  status: 'ok' | 'rateio' | 'deficit'
  tipo_calculo: 'vendas' | 'estoque_minimo' | 'combinado' | 'sem_historico'
  grupo_combinado?: string | null
  combinados_disponiveis?: CombinadoDisponivel[]
  filiais: Array<{
    cod_filial: string
    nome: string
    estoque_atual: number
    estoque_minimo: number
    vendas_periodo: number
    media_diaria: number
    meta: number
    necessidade: number
    alocacao_sugerida: number
    usou_estoque_minimo?: boolean
  }>
}

interface FilialAnalise {
  cod_filial: string
  nome: string
  estoque_atual: number
  saida_periodo: number
  meta: number
  necessidade: number
  alocacao_sugerida: number
  media_vendas?: number
  desvio_padrao?: number
  coeficiente_variacao?: number
  tem_pico?: boolean
  tem_combinado_estoque?: boolean
  estoque_combinado?: number
  necessidade_reduzida_por_combinado?: number
  combinados_em_estoque?: Array<{
    cod_produto: string
    descricao: string
    referencia_fabricante: string
    estoque: number
  }>
}

interface ProdutoAnalise {
  cod_produto: string
  descricao: string
  grupo: string
  cod_grupo_combinado: string | null
  estoque_cd: number
  necessidade_total: number
  deficit: number
  status: 'ok' | 'rateio' | 'deficit'
  proporcao_atendimento: number
  combinados_disponiveis?: Array<{
    cod_produto: string
    descricao: string
    estoque_cd: number
  }>
  todos_combinados?: Array<{
    cod_produto: string
    descricao: string
    referencia_fabricante: string
    estoque_petrolina: number
    estoque_juazeiro: number
    estoque_salgueiro: number
    estoque_bonfim: number
    estoque_picos: number
  }>
  filiais: FilialAnalise[]
}

interface ProdutoCombinado {
  cod_produto: string
  descricao: string
  referencia_fabricante: string
  estoque_cd: number
  vendas_periodo: number
  ordem: number
}

interface SugestaoEstoqueMin {
  cod_filial: string
  nome_filial: string
  vendas_periodo: number
  media_diaria: number
  desvio_padrao: number
  coeficiente_variacao: number
  confiabilidade: 'alta' | 'media' | 'baixa'
  estoque_minimo_atual: number
  estoque_minimo_sugerido: number
  dias_cobertura_sugerido: number
  valor_editado?: number
}

interface Resumo {
  vendas_origem: number
  seguranca: number
  sobra: number
  cap_porcentagem: number
  meta_destino: number
  total_skus: number
  necessidade_total: number
  estoque_cd: number
  deficit_total: number
  produtos_ok: number
  produtos_rateio: number
  produtos_deficit: number
  periodo_dias: number
  filial_origem?: string
  nome_origem?: string
}

interface Grupo {
  cod_grupo: string
  descricao: string
}

// Filiais que participam do DRP (Garantia não entra - apenas recebe garantias)
const FILIAIS = [
  { cod: '00', nome: 'Petrolina' },
  { cod: '01', nome: 'Juazeiro' },
  { cod: '02', nome: 'Salgueiro' },
  { cod: '05', nome: 'Bonfim' },
  { cod: '06', nome: 'Picos' }
]

// Filiais com CD para seleção de origem
const FILIAIS_COM_CD = [
  { cod: '04', nome: 'CD' },
  { cod: '00', nome: 'Petrolina' },
  { cod: '01', nome: 'Juazeiro' },
  { cod: '02', nome: 'Salgueiro' },
  { cod: '05', nome: 'Bonfim' },
  { cod: '06', nome: 'Picos' }
]

export default function AnaliseDRP() {
  // Aba ativa: 'produto' ou 'nf'
  const [abaAtiva, setAbaAtiva] = useState<'produto' | 'nf'>('produto')
  
  const [periodoDias, setPeriodoDias] = useState(90)
  const [filialOrigem, setFilialOrigem] = useState('04') // Padrão: CD
  const [grupoSelecionado, setGrupoSelecionado] = useState('')
  const [busca, setBusca] = useState('')
  
  // Estados para DRP por NF
  const [buscaNF, setBuscaNF] = useState('')
  const [sugestoesNF, setSugestoesNF] = useState<NFEntrada[]>([])
  const [mostrarSugestoesNF, setMostrarSugestoesNF] = useState(false)
  const [buscandoNF, setBuscandoNF] = useState(false)
  const [nfSelecionada, setNfSelecionada] = useState<NFEntrada | null>(null)
  const [produtosNF, setProdutosNF] = useState<ProdutoNF[]>([])
  const [loadingNF, setLoadingNF] = useState(false)
  const [calculadoNF, setCalculadoNF] = useState(false)
  const [resumoNF, setResumoNF] = useState<{
    numero_nota: string
    periodo_dias: number
    total_produtos: number
    necessidade_total: number
    deficit_total: number
  } | null>(null)
  const [gerandoPedidos, setGerandoPedidos] = useState(false)
  const [pedidosGerados, setPedidosGerados] = useState<Array<{
    numero_pedido: string
    cod_filial: string
    nome_filial: string
    total_itens: number
    total_quantidade: number
  }> | null>(null)
  const [sugestoesProdutos, setSugestoesProdutos] = useState<Array<{
    cod_produto: string
    descricao: string
    referencia_fabricante: string
    grupo_descricao: string
    estoque_cd: string
  }>>([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [buscandoProdutos, setBuscandoProdutos] = useState(false)
  const [produtoSelecionadoBusca, setProdutoSelecionadoBusca] = useState<{
    cod_produto: string
    descricao: string
    referencia_fabricante: string
    grupo_descricao: string
    estoque_cd: string
  } | null>(null)
  const [filiaisSelecionadas, setFiliaisSelecionadas] = useState<string[]>(FILIAIS.map(f => f.cod))

  
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(false)
  const [calculado, setCalculado] = useState(false)
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [produtos, setProdutos] = useState<ProdutoAnalise[]>([])
  
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoAnalise | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [etapaLoading, setEtapaLoading] = useState('')
  
  const [modalCombinadosAberto, setModalCombinadosAberto] = useState(false)
  const [produtosCombinados, setProdutosCombinados] = useState<ProdutoCombinado[]>([])
  const [loadingCombinados, setLoadingCombinados] = useState(false)
  const [tempoProcessamento, setTempoProcessamento] = useState(0)
  const [inicioProcessamento, setInicioProcessamento] = useState<number | null>(null)
  const [textoAnimado, setTextoAnimado] = useState('')
  
  const [filtroComDistribuicao, setFiltroComDistribuicao] = useState(false)
  const [filtroApenasCombinados, setFiltroApenasCombinados] = useState(false)

  // Estados para modal de produtos combinados em estoque
  const [modalCombinadosEstoqueAberto, setModalCombinadosEstoqueAberto] = useState(false)
  const [dadosModalCombinados, setDadosModalCombinados] = useState<{
    produto: string
    filial: string
    combinados: Array<{
      cod_produto: string
      descricao: string
      referencia_fabricante: string
      estoque_petrolina: number
      estoque_juazeiro: number
      estoque_salgueiro: number
      estoque_bonfim: number
      estoque_picos: number
    }>
  } | null>(null)

  // Estados para modal de estoque mínimo
  const [modalEstoqueMinAberto, setModalEstoqueMinAberto] = useState(false)
  const [produtoEstoqueMin, setProdutoEstoqueMin] = useState<{ cod_produto: string; descricao: string } | null>(null)
  const [sugestoesEstoqueMin, setSugestoesEstoqueMin] = useState<SugestaoEstoqueMin[]>([])
  const [loadingEstoqueMin, setLoadingEstoqueMin] = useState(false)
  const [salvandoEstoqueMin, setSalvandoEstoqueMin] = useState(false)

  // Estado para exportação XLSX
  const [exportandoXLSX, setExportandoXLSX] = useState(false)

  // Buscar grupos para o filtro
  useEffect(() => {
    fetch('/api/drp/grupos')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setGrupos(data.data)
        }
      })
      .catch(err => console.error('Erro ao buscar grupos:', err))
  }, [])

  // Buscar produtos conforme digita (autocomplete)
  useEffect(() => {
    if (busca.length < 2) {
      setSugestoesProdutos([])
      setMostrarSugestoes(false)
      return
    }

    setBuscandoProdutos(true)
    const timer = setTimeout(() => {
      fetch(`/api/produtos/buscar?q=${encodeURIComponent(busca)}&filial_origem=${filialOrigem}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setSugestoesProdutos(data.data)
            setMostrarSugestoes(true)
          }
          setBuscandoProdutos(false)
        })
        .catch(err => {
          console.error('Erro ao buscar produtos:', err)
          setBuscandoProdutos(false)
        })
    }, 300) // Debounce de 300ms

    return () => clearTimeout(timer)
  }, [busca])

  // Buscar NFs do CD conforme digita (autocomplete)
  useEffect(() => {
    if (buscaNF.length < 1) {
      setSugestoesNF([])
      setMostrarSugestoesNF(false)
      return
    }

    setBuscandoNF(true)
    const timer = setTimeout(() => {
      fetch(`/api/nf-entrada/cd/recentes?q=${encodeURIComponent(buscaNF)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setSugestoesNF(data.data)
            setMostrarSugestoesNF(true)
          }
          setBuscandoNF(false)
        })
        .catch(err => {
          console.error('Erro ao buscar NFs:', err)
          setBuscandoNF(false)
        })
    }, 300)

    return () => clearTimeout(timer)
  }, [buscaNF])

  // Temporizador de processamento
  useEffect(() => {
    let intervalo: number
    if (loading && inicioProcessamento) {
      intervalo = window.setInterval(() => {
        setTempoProcessamento(Math.floor((Date.now() - inicioProcessamento) / 1000))
      }, 100)
    }
    return () => {
      if (intervalo) clearInterval(intervalo)
    }
  }, [loading, inicioProcessamento])

  // Efeito de texto animado (typing effect)
  useEffect(() => {
    if (!loading || !etapaLoading) {
      setTextoAnimado('')
      return
    }

    let index = 0
    setTextoAnimado('')
    
    const intervalo = window.setInterval(() => {
      if (index < etapaLoading.length) {
        setTextoAnimado(etapaLoading.substring(0, index + 1))
        index++
      } else {
        clearInterval(intervalo)
      }
    }, 50)

    return () => clearInterval(intervalo)
  }, [etapaLoading, loading])

  const calcularDRP = async () => {
    setLoading(true)
    setCalculado(false)
    setTempoProcessamento(0)
    setInicioProcessamento(Date.now())
    setEtapaLoading('Carregando combinados...')

    try {
      // Simular etapas de loading
      setTimeout(() => setEtapaLoading('Buscando produtos...'), 500)
      setTimeout(() => setEtapaLoading('Calculando necessidades...'), 1500)
      setTimeout(() => setEtapaLoading('Gerando distribuição...'), 2500)

      const response = await fetch('/api/drp/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo_dias: periodoDias,
          filial_origem: filialOrigem,
          filtros: {
            grupo: grupoSelecionado || undefined,
            busca: busca || undefined,
            filiais: filiaisSelecionadas.filter(f => f !== filialOrigem)
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        setResumo(data.resumo)
        setProdutos(data.produtos)
        setCalculado(true)
      } else {
        alert('Erro ao calcular DRP: ' + data.error)
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao calcular DRP')
    } finally {
      setLoading(false)
      setInicioProcessamento(null)
    }
  }

  const toggleFilial = (cod: string) => {
    if (filiaisSelecionadas.includes(cod)) {
      setFiliaisSelecionadas(filiaisSelecionadas.filter(f => f !== cod))
    } else {
      setFiliaisSelecionadas([...filiaisSelecionadas, cod])
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(Math.round(num))
  }

  // Filtrar produtos após o cálculo
  const produtosFiltrados = produtos.filter(produto => {
    // Filtro: Apenas com distribuição
    if (filtroComDistribuicao) {
      const temDistribuicao = produto.filiais.some(f => f.alocacao_sugerida > 0)
      if (!temDistribuicao) return false
    }

    // Filtro: Apenas combinados
    if (filtroApenasCombinados) {
      if (!produto.cod_grupo_combinado) return false
    }

    return true
  })

  const buscarProdutosCombinados = async (codGrupo: string) => {
    setLoadingCombinados(true)
    setModalCombinadosAberto(true)
    
    try {
      const response = await fetch(`/api/drp/combinados/${codGrupo}?periodo_dias=${periodoDias}`)
      const data = await response.json()
      
      if (data.success) {
        setProdutosCombinados(data.data)
      } else {
        alert('Erro ao buscar produtos combinados')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao buscar produtos combinados')
    } finally {
      setLoadingCombinados(false)
    }
  }

  // Função para buscar sugestões de estoque mínimo
  const buscarSugestoesEstoqueMin = async (codProduto: string, descricao: string) => {
    setLoadingEstoqueMin(true)
    setProdutoEstoqueMin({ cod_produto: codProduto, descricao })
    setModalEstoqueMinAberto(true)
    
    try {
      const response = await fetch(`/api/estoque-minimo/sugestao/${codProduto}?periodo_dias=${periodoDias}`)
      const data = await response.json()
      
      if (data.success) {
        // Adicionar campo valor_editado com o valor sugerido
        const sugestoesComEdicao = data.sugestoes.map((s: SugestaoEstoqueMin) => ({
          ...s,
          valor_editado: s.estoque_minimo_sugerido
        }))
        setSugestoesEstoqueMin(sugestoesComEdicao)
      } else {
        alert('Erro ao buscar sugestões de estoque mínimo')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao buscar sugestões de estoque mínimo')
    } finally {
      setLoadingEstoqueMin(false)
    }
  }

  // Função para salvar estoque mínimo
  const salvarEstoqueMin = async () => {
    if (!produtoEstoqueMin) return
    
    setSalvandoEstoqueMin(true)
    
    try {
      const filiais = sugestoesEstoqueMin
        .filter(s => s.valor_editado !== undefined && s.valor_editado !== s.estoque_minimo_atual)
        .map(s => ({
          cod_filial: s.cod_filial,
          estoque_minimo: s.valor_editado!
        }))
      
      if (filiais.length === 0) {
        alert('Nenhuma alteração para salvar')
        return
      }
      
      const response = await fetch('/api/estoque-minimo/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cod_produto: produtoEstoqueMin.cod_produto,
          filiais
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`Estoque mínimo salvo para ${filiais.length} filial(is)!`)
        setModalEstoqueMinAberto(false)
      } else {
        alert(data.error || 'Erro ao salvar estoque mínimo')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao salvar estoque mínimo')
    } finally {
      setSalvandoEstoqueMin(false)
    }
  }

  // Atualizar valor editado de estoque mínimo
  const atualizarValorEstoqueMin = (codFilial: string, valor: number) => {
    setSugestoesEstoqueMin(prev => prev.map(s => 
      s.cod_filial === codFilial ? { ...s, valor_editado: valor } : s
    ))
  }

  const imprimirRelatorio = () => {
    const dataHora = new Date().toLocaleString('pt-BR')
    const filiaisSelecionadasNomes = FILIAIS.filter(f => filiaisSelecionadas.includes(f.cod)).map(f => f.nome).join(', ')
    
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório DRP - ${dataHora}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
          .info { background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
          .info-label { font-weight: bold; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #1e40af; color: white; padding: 12px; text-align: left; font-size: 12px; }
          td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
          tr:nth-child(even) { background: #f8fafc; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .badge-ok { background: #dcfce7; color: #166534; }
          .badge-rateio { background: #fef3c7; color: #92400e; }
          .badge-deficit { background: #fee2e2; color: #991b1b; }
          .badge-combinado { background: #e9d5ff; color: #6b21a8; }
          .distribuicao { font-size: 10px; color: #475569; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center; color: #64748b; font-size: 11px; }
          @media print {
            body { margin: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>📦 Relatório de Distribuição DRP</h1>
        
        <div class="info">
          <div class="info-row">
            <span class="info-label">Data/Hora:</span>
            <span>${dataHora}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Período de Análise:</span>
            <span>${periodoDias} dias</span>
          </div>
          <div class="info-row">
            <span class="info-label">Filiais:</span>
            <span>${filiaisSelecionadasNomes}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Total de Produtos:</span>
            <span>${produtosFiltrados.length}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Estoque ${resumo?.nome_origem || 'CD'}:</span>
            <span>${formatNumber(resumo?.estoque_cd || 0)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Necessidade Total:</span>
            <span>${formatNumber(resumo?.necessidade_total || 0)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Déficit:</span>
            <span>${formatNumber(resumo?.deficit_total || 0)}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Produto</th>
              <th>Grupo</th>
              <th style="text-align: right;">Est. ${resumo?.nome_origem || 'CD'}</th>
              <th style="text-align: right;">Necessidade</th>
              <th>Distribuição por Filial</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `

    produtosFiltrados.forEach(produto => {
      const statusClass = produto.status === 'ok' ? 'badge-ok' : produto.status === 'rateio' ? 'badge-rateio' : 'badge-deficit'
      const statusText = produto.status === 'ok' ? 'OK' : produto.status === 'rateio' ? 'Rateio' : 'Déficit'
      const isCombinado = produto.cod_grupo_combinado ? '<span class="badge badge-combinado">COMBINADO</span>' : ''
      
      const distribuicao = produto.filiais
        .filter(f => f.alocacao_sugerida > 0)
        .map(f => `${f.nome}: ${formatNumber(f.alocacao_sugerida)}`)
        .join('<br>')

      html += `
        <tr>
          <td><strong>${produto.cod_produto}</strong></td>
          <td>${produto.descricao.replace(/\[COMBINADO: \d+ produtos\] /, '')} ${isCombinado}</td>
          <td>${produto.grupo}</td>
          <td style="text-align: right;"><strong>${formatNumber(produto.estoque_cd)}</strong></td>
          <td style="text-align: right;">${formatNumber(produto.necessidade_total)}</td>
          <td class="distribuicao">${distribuicao || '-'}</td>
          <td><span class="badge ${statusClass}">${statusText}</span></td>
        </tr>
      `
    })

    html += `
          </tbody>
        </table>

        <div class="footer">
          <p><strong>Sistema DRP - Bezerra</strong></p>
          <p>Relatório gerado automaticamente em ${dataHora}</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <span className="badge badge-success flex items-center gap-1"><FiCheckCircle /> OK</span>
      case 'rateio':
        return <span className="badge badge-warning flex items-center gap-1"><FiAlertTriangle /> Rateio</span>
      case 'deficit':
        return <span className="badge badge-danger flex items-center gap-1"><FiAlertCircle /> Déficit</span>
      default:
        return <span className="badge">{status}</span>
    }
  }

  return (
    <div className="h-full overflow-auto px-6 py-6">
      <div className="space-y-6">
      {/* Abas de Seleção */}
      <div className="card">
        <div className="flex items-center gap-4 mb-4 border-b border-slate-200 pb-3">
          <button
            onClick={() => setAbaAtiva('produto')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              abaAtiva === 'produto'
                ? 'bg-accent text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FiPackage />
            <span>Por Produto</span>
            <Tooltip content="DRP por Produto - Origem: Escolha a filial de onde sairá o estoque (padrão: CD). Meta: Maior valor entre vendas e estoque mínimo. Rateio: Proporcional à necessidade (distribuição justa - todos recebem proporcionalmente). Uso: Distribuir estoque disponível de forma equilibrada entre filiais." />
          </button>
          <button
            onClick={() => setAbaAtiva('nf')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              abaAtiva === 'nf'
                ? 'bg-accent text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FiFileText />
            <span>Por NF</span>
            <Tooltip content="DRP por Nota Fiscal - Origem: Produtos de uma NF que chegou no CD (filial 04). Meta: Maior valor entre vendas e estoque mínimo. Rateio: Por ordem de prioridade (Petrolina → Juazeiro → Salgueiro → Bonfim → Picos). Uso: Distribuir mercadoria recém-chegada priorizando filiais estratégicas." />
          </button>
        </div>

        {/* Configurações - Por Produto */}
        {abaAtiva === 'produto' && (
        <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiFilter className="text-accent text-lg" />
            <h2 className="text-lg font-semibold text-slate-900">Configurações</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Filial Origem */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <div className="flex items-center gap-1">
                Filial Origem
                <Tooltip content="Filial de onde sairão os produtos. Se não for CD, aplica segurança (vendas do período) para não zerar estoque." />
              </div>
            </label>
            <select
              value={filialOrigem}
              onChange={(e) => {
                const novaOrigem = e.target.value
                setFilialOrigem(novaOrigem)
                // Remove a origem das filiais destino selecionadas
                setFiliaisSelecionadas(prev => prev.filter(f => f !== novaOrigem))
              }}
              className="input w-full"
            >
              {FILIAIS_COM_CD.map(f => (
                <option key={f.cod} value={f.cod}>{f.nome}</option>
              ))}
            </select>
          </div>

          {/* Período */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Período de Análise (dias)
            </label>
            <select
              value={periodoDias}
              onChange={(e) => setPeriodoDias(Number(e.target.value))}
              className="input w-full"
            >
              <option value={30}>30 dias (1 mês)</option>
              <option value={60}>60 dias (2 meses)</option>
              <option value={90}>90 dias (3 meses)</option>
              <option value={120}>120 dias (4 meses)</option>
              <option value={180}>180 dias (6 meses)</option>
            </select>
          </div>

          {/* Grupo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Grupo de Produtos
            </label>
            <select
              value={grupoSelecionado}
              onChange={(e) => setGrupoSelecionado(e.target.value)}
              className="input w-full"
            >
              <option value="">Todos os grupos</option>
              {grupos.map(g => (
                <option key={g.cod_grupo} value={g.cod_grupo}>{g.descricao}</option>
              ))}
            </select>
          </div>

          {/* Busca com Autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Buscar Produto
            </label>
            <div className="relative">
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onFocus={() => busca.length >= 2 && setMostrarSugestoes(true)}
                onBlur={() => setTimeout(() => setMostrarSugestoes(false), 200)}
                placeholder="Digite código ou descrição..."
                className="input w-full pl-10"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              {buscandoProdutos && (
                <FiLoader className="absolute right-3 top-1/2 -translate-y-1/2 text-accent animate-spin" />
              )}
            </div>

            {/* Dropdown de Sugestões */}
            {mostrarSugestoes && sugestoesProdutos.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {sugestoesProdutos.map((produto) => (
                  <button
                    key={produto.cod_produto}
                    onClick={() => {
                      setBusca(produto.cod_produto)
                      setProdutoSelecionadoBusca(produto)
                      setMostrarSugestoes(false)
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">{produto.cod_produto}</span>
                          {produto.referencia_fabricante && produto.referencia_fabricante !== '-' && (
                            <span className="text-xs text-slate-500">Ref: {produto.referencia_fabricante}</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 truncate">{produto.descricao}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">{produto.grupo_descricao}</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-accent font-medium">{FILIAIS_COM_CD.find(f => f.cod === filialOrigem)?.nome || 'CD'}: {Math.round(parseFloat(produto.estoque_cd))} un</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {mostrarSugestoes && busca.length >= 2 && sugestoesProdutos.length === 0 && !buscandoProdutos && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center text-slate-500 text-sm">
                Nenhum produto encontrado
              </div>
            )}
          </div>
        </div>

        {/* Tabela do Produto Selecionado */}
        {produtoSelecionadoBusca && (
          <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Produto Selecionado</h3>
              <button
                onClick={() => {
                  setProdutoSelecionadoBusca(null)
                  setBusca('')
                }}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                <FiX className="inline" /> Limpar
              </button>
            </div>
            <div className="bg-white rounded-lg overflow-hidden border border-slate-200">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-600 bg-slate-50 w-32">Código</td>
                    <td className="px-3 py-2 text-slate-900 font-semibold">{produtoSelecionadoBusca.cod_produto}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-600 bg-slate-50">Descrição</td>
                    <td className="px-3 py-2 text-slate-900">{produtoSelecionadoBusca.descricao}</td>
                  </tr>
                  {produtoSelecionadoBusca.referencia_fabricante && produtoSelecionadoBusca.referencia_fabricante !== '-' && (
                    <tr className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-600 bg-slate-50">Referência</td>
                      <td className="px-3 py-2 text-slate-900">{produtoSelecionadoBusca.referencia_fabricante}</td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-600 bg-slate-50">Grupo</td>
                    <td className="px-3 py-2 text-slate-900">{produtoSelecionadoBusca.grupo_descricao}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-600 bg-slate-50">Estoque {FILIAIS_COM_CD.find(f => f.cod === filialOrigem)?.nome || 'CD'}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 text-accent font-semibold rounded-md">
                        <FiPackage className="text-sm" />
                        {Math.round(parseFloat(produtoSelecionadoBusca.estoque_cd))} unidades
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filiais */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Filiais para Análise
          </label>
          <div className="flex flex-wrap gap-2">
            {FILIAIS.map(filial => (
              <button
                key={filial.cod}
                onClick={() => toggleFilial(filial.cod)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filiaisSelecionadas.includes(filial.cod)
                    ? 'bg-accent text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filial.nome}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={calcularDRP}
          disabled={loading || filiaisSelecionadas.length === 0}
          className="btn btn-primary w-full md:w-auto"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <FiLoader className="animate-spin" />
              Calculando...
            </span>
          ) : 'Calcular DRP'}
        </button>
        </div>
        )}

        {/* Configurações - Por NF */}
        {abaAtiva === 'nf' && (
        <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiFileText className="text-accent text-lg" />
            <h2 className="text-lg font-semibold text-slate-900">DRP por Nota Fiscal de Entrada</h2>
            <Tooltip content="Calcule o DRP para todos os produtos de uma NF que entrou no CD (filial 04)" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Busca NF */}
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <div className="flex items-center gap-1">
                Número da NF (CD - Filial 04)
                <Tooltip content="Busca apenas NFs de entrada na filial 04 (CD). NFs com mesmo número em outras filiais não aparecem aqui." />
              </div>
            </label>
            <div className="relative">
              <input
                type="text"
                value={buscaNF}
                onChange={(e) => setBuscaNF(e.target.value)}
                onFocus={() => buscaNF.length >= 1 && setMostrarSugestoesNF(true)}
                onBlur={() => setTimeout(() => setMostrarSugestoesNF(false), 200)}
                placeholder="Digite o número da NF..."
                className="input w-full pl-10"
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              {buscandoNF && (
                <FiLoader className="absolute right-3 top-1/2 -translate-y-1/2 text-accent animate-spin" />
              )}
            </div>

            {/* Dropdown de Sugestões NF */}
            {mostrarSugestoesNF && sugestoesNF.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {sugestoesNF.map((nf) => (
                  <button
                    key={nf.numero_nota + nf.cod_fornecedor}
                    onClick={() => {
                      setBuscaNF(nf.numero_nota)
                      setNfSelecionada(nf)
                      setMostrarSugestoesNF(false)
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900">NF {nf.numero_nota}</span>
                        <span className="text-xs text-slate-500 ml-2">Forn: {nf.cod_fornecedor}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-accent font-medium">{nf.total_itens} itens</span>
                        <span className="text-xs text-slate-400 ml-2">{Math.round(parseFloat(nf.qtd_total))} un</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {mostrarSugestoesNF && buscaNF.length >= 1 && sugestoesNF.length === 0 && !buscandoNF && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center text-slate-500 text-sm">
                Nenhuma NF encontrada no CD
              </div>
            )}
          </div>

          {/* Período */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <div className="flex items-center gap-1">
                Período de Análise
                <Tooltip content="Período para calcular vendas e necessidades das filiais" />
              </div>
            </label>
            <select
              value={periodoDias}
              onChange={(e) => setPeriodoDias(Number(e.target.value))}
              className="input w-full"
            >
              <option value={30}>30 dias (1 mês)</option>
              <option value={60}>60 dias (2 meses)</option>
              <option value={90}>90 dias (3 meses)</option>
              <option value={120}>120 dias (4 meses)</option>
              <option value={180}>180 dias (6 meses)</option>
            </select>
          </div>

          {/* Info da NF Selecionada */}
          <div>
            {nfSelecionada && (
              <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-accent">NF {nfSelecionada.numero_nota}</p>
                    <p className="text-xs text-slate-600">Fornecedor: {nfSelecionada.cod_fornecedor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-accent">{nfSelecionada.total_itens}</p>
                    <p className="text-xs text-slate-500">itens</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filiais para distribuir */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            <div className="flex items-center gap-1">
              Filiais para Distribuir
              <Tooltip content="Selecione as filiais que receberão os produtos da NF" />
            </div>
          </label>
          <div className="flex flex-wrap gap-2">
            {FILIAIS.map(filial => (
              <button
                key={filial.cod}
                onClick={() => toggleFilial(filial.cod)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filiaisSelecionadas.includes(filial.cod)
                    ? 'bg-accent text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filial.nome}
              </button>
            ))}
          </div>
        </div>

        {/* Botão Calcular */}
        <div className="flex justify-end">
          <button
            onClick={async () => {
              if (!nfSelecionada) {
                alert('Selecione uma NF primeiro')
                return
              }
              setLoadingNF(true)
              try {
                const response = await fetch('/api/nf-entrada/cd/calcular-drp', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    numero_nota: nfSelecionada.numero_nota,
                    periodo_dias: periodoDias,
                    filiais: filiaisSelecionadas
                  })
                })
                const data = await response.json()
                if (data.success) {
                  setResumoNF(data.data)
                  setProdutosNF(data.data.produtos)
                  setCalculadoNF(true)
                } else {
                  alert('Erro ao calcular DRP: ' + data.error)
                }
              } catch (error) {
                console.error('Erro:', error)
                alert('Erro ao calcular DRP')
              } finally {
                setLoadingNF(false)
              }
            }}
            disabled={loadingNF || !nfSelecionada || filiaisSelecionadas.length === 0}
            className="btn btn-primary w-full md:w-auto"
          >
            {loadingNF ? (
              <span className="flex items-center gap-2">
                <FiLoader className="animate-spin" />
                Calculando...
              </span>
            ) : 'Calcular DRP da NF'}
          </button>
        </div>
        </div>
        )}
      </div>

      {/* Loading Overlay para DRP por NF */}
      {loadingNF && (
        <div className="card bg-gradient-to-r from-purple-50 to-accent-subtle border-purple-300 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="animate-spin">
                <FiLoader className="text-purple-600 text-3xl" />
              </div>
              <div>
                <p className="font-bold text-purple-600 text-lg">Processando DRP da NF...</p>
                <p className="text-sm text-purple-500 mt-1">
                  Calculando necessidades e distribuição para cada filial
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="bg-purple-100 px-3 py-2 rounded-lg">
                <FiFileText className="text-purple-600 text-2xl mx-auto" />
                <p className="text-xs text-purple-500 mt-1">NF {nfSelecionada?.numero_nota}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resultados DRP por NF */}
      {calculadoNF && resumoNF && abaAtiva === 'nf' && (
        <>
        {/* Resumo da NF */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="bg-accent-subtle p-2.5 rounded-md">
                <FiFileText className="text-accent text-lg" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">NF</p>
                  <Tooltip content="Número da nota fiscal analisada" />
                </div>
                <p className="text-2xl font-semibold text-slate-900">{resumoNF.numero_nota}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2.5 rounded-md">
                <FiPackage className="text-purple-600 text-lg" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Produtos</p>
                  <Tooltip content="Total de produtos na NF" />
                </div>
                <p className="text-2xl font-semibold text-purple-600">{resumoNF.total_produtos}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="bg-warning-subtle p-2.5 rounded-md">
                <FiAlertTriangle className="text-warning text-lg" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Necessidade Total</p>
                  <Tooltip content="Soma das necessidades de todas as filiais" />
                </div>
                <p className="text-2xl font-semibold text-warning">{formatNumber(resumoNF.necessidade_total)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="bg-danger-subtle p-2.5 rounded-md">
                <FiAlertCircle className="text-danger text-lg" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Déficit Total</p>
                  <Tooltip content="Quantidade que falta no CD para atender todas as necessidades" />
                </div>
                <p className="text-2xl font-semibold text-danger">{formatNumber(resumoNF.deficit_total)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botão Gerar Pedidos */}
        <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-800">Gerar Pedidos de Distribuição</h3>
              <p className="text-sm text-green-600 mt-1">
                Criar pedidos para cada filial com base na distribuição calculada
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (!resumoNF || produtosNF.length === 0) return
                  
                  setExportandoXLSX(true)
                  
                  try {
                    const response = await fetch(`${import.meta.env.VITE_API_URL}/nf-entrada/cd/exportar-drp-xlsx`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        numero_nota: resumoNF.numero_nota,
                        periodo_dias: resumoNF.periodo_dias,
                        produtos: produtosNF
                      })
                    })
                    
                    if (response.ok) {
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `DRP_NF_${resumoNF.numero_nota}_${new Date().toISOString().split('T')[0]}.xlsx`
                      document.body.appendChild(a)
                      a.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)
                    } else {
                      alert('Erro ao exportar XLSX')
                    }
                  } catch (error) {
                    console.error('Erro:', error)
                    alert('Erro ao exportar XLSX')
                  } finally {
                    setExportandoXLSX(false)
                  }
                }}
                disabled={exportandoXLSX || !resumoNF || produtosNF.length === 0}
                className="btn bg-blue-600 hover:bg-blue-700 text-white px-4"
                title="Exportar para Excel"
              >
                {exportandoXLSX ? (
                  <span className="flex items-center gap-2">
                    <FiLoader className="animate-spin" />
                    Gerando Excel...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FiFileText />
                    Exportar XLSX
                  </span>
                )}
              </button>
              <button
              onClick={async () => {
                if (!resumoNF || produtosNF.length === 0) return
                
                setGerandoPedidos(true)
                setPedidosGerados(null)
                
                try {
                  const response = await fetch(`${import.meta.env.VITE_API_URL}/nf-entrada/cd/gerar-pedidos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      numero_nota: resumoNF.numero_nota,
                      produtos: produtosNF,
                      usuario: 'Sistema DRP'
                    })
                  })
                  const data = await response.json()
                  if (data.success) {
                    setPedidosGerados(data.data.pedidos)
                    alert(`✅ ${data.data.pedidos.length} pedido(s) gerado(s) com sucesso!`)
                  } else {
                    alert('Erro ao gerar pedidos: ' + data.error)
                  }
                } catch (error) {
                  console.error('Erro:', error)
                  alert('Erro ao gerar pedidos')
                } finally {
                  setGerandoPedidos(false)
                }
              }}
              disabled={gerandoPedidos || !resumoNF || produtosNF.length === 0}
              className="btn bg-green-600 hover:bg-green-700 text-white px-6"
            >
              {gerandoPedidos ? (
                <span className="flex items-center gap-2">
                  <FiLoader className="animate-spin" />
                  Gerando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <FiTruck />
                  Gerar Pedidos
                </span>
              )}
            </button>
            </div>
          </div>
          
          {/* Pedidos Gerados */}
          {pedidosGerados && pedidosGerados.length > 0 && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-sm font-medium text-green-800 mb-2">Pedidos Gerados:</p>
              <div className="flex flex-wrap gap-2">
                {pedidosGerados.map(pedido => (
                  <div key={pedido.numero_pedido} className="bg-white border border-green-300 rounded-lg px-3 py-2">
                    <p className="font-mono text-sm text-green-800">{pedido.numero_pedido}</p>
                    <p className="text-xs text-green-600">{pedido.nome_filial}: {pedido.total_itens} itens, {formatNumber(pedido.total_quantidade)} un</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabela de Produtos da NF */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FiTruck className="text-accent text-lg" />
              <h2 className="text-base font-semibold text-slate-900">Produtos da NF para Distribuição</h2>
              <Tooltip content="Lista de produtos da NF com sugestão de distribuição para cada filial" />
            </div>
            <span className="text-sm text-slate-500">{produtosNF.length} produtos</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-500">Produto</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-500">Grupo</th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">
                    <div className="flex items-center justify-end gap-1">
                      Qtd NF
                      <Tooltip content="Quantidade que entrou na NF" />
                    </div>
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">
                    <div className="flex items-center justify-end gap-1">
                      Est. {FILIAIS_COM_CD.find(f => f.cod === filialOrigem)?.nome || 'CD'}
                      <Tooltip content={`Estoque atual na filial ${FILIAIS_COM_CD.find(f => f.cod === filialOrigem)?.nome || 'CD'}`} />
                    </div>
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">
                    <div className="flex items-center justify-end gap-1">
                      Necessidade
                      <Tooltip content="Soma das necessidades de todas as filiais" />
                    </div>
                  </th>
                  <th className="px-2 py-1.5 text-center text-xs font-medium text-slate-500">Status</th>
                  <th className="px-2 py-1.5 text-center text-xs font-medium text-slate-500">
                    <div className="flex items-center justify-center gap-1">
                      Base
                      <Tooltip content="Base do cálculo: Vendas (histórico), Est.Mín (estoque mínimo) ou Igual (distribuição proporcional para produtos novos)" />
                    </div>
                  </th>
                  {FILIAIS.map(f => (
                    <th key={f.cod} className="px-1.5 py-1.5 text-right text-xs font-medium text-slate-500">
                      <div className="flex items-center justify-end gap-1">
                        {f.nome.substring(0, 3)}
                        <Tooltip content={`Sugestão de envio para ${f.nome}`} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {produtosNF.map((produto) => (
                  <React.Fragment key={produto.cod_produto}>
                  <tr className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-1.5">
                      <div>
                        <span className="font-medium text-slate-900">{produto.cod_produto}</span>
                        <p className="text-xs text-slate-500 truncate max-w-[160px]">{produto.descricao}</p>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-xs text-slate-600">{produto.grupo}</td>
                    <td className="px-2 py-1.5 text-right font-medium text-purple-600">{formatNumber(produto.qtd_nf)}</td>
                    <td className="px-2 py-1.5 text-right">{formatNumber(produto.estoque_cd)}</td>
                    <td className="px-2 py-1.5 text-right font-medium text-warning">{formatNumber(produto.necessidade_total)}</td>
                    <td className="px-2 py-1.5 text-center">{getStatusBadge(produto.status)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {produto.tipo_calculo === 'vendas' && (
                          <>
                            <span className="badge badge-success text-xs">Vendas</span>
                            <Tooltip content="Cálculo baseado no histórico de vendas do próprio produto no período" />
                          </>
                        )}
                        {produto.tipo_calculo === 'estoque_minimo' && (
                          <>
                            <span className="badge badge-warning text-xs">Est.Mín</span>
                            <Tooltip content="Produto sem vendas no período. Usando estoque mínimo configurado como meta" />
                          </>
                        )}
                        {produto.tipo_calculo === 'combinado' && (
                          <>
                            <span className="badge badge-info text-xs">Comb.</span>
                            <Tooltip content="Produto sem vendas próprias. Usando vendas do grupo combinado (produtos similares de outras marcas)" />
                          </>
                        )}
                        {produto.tipo_calculo === 'sem_historico' && (
                          <>
                            <span className="badge text-xs bg-slate-200 text-slate-600">S/Hist</span>
                            <Tooltip content="Produto novo sem histórico de vendas, sem estoque mínimo e sem grupo combinado. Não é possível sugerir distribuição" />
                          </>
                        )}
                        <button
                          onClick={() => buscarSugestoesEstoqueMin(produto.cod_produto, produto.descricao)}
                          className="ml-1 text-amber-500 hover:text-amber-700 transition-colors"
                          title="Configurar estoque mínimo"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    {FILIAIS.map(f => {
                      const filialData = produto.filiais.find(fil => fil.cod_filial === f.cod)
                      const sugestao = filialData?.alocacao_sugerida || 0
                      const motivoSemSugestao = filialData
                        ? (filialData.necessidade <= 0
                            ? 'Sem necessidade (estoque cobre a meta)'
                            : 'Sem alocação nesta rodada de rateio')
                        : 'Sem dados para a filial'
                      const tooltipTexto = filialData
                        ? `${f.nome}: período ${resumoNF?.periodo_dias || periodoDias}d • Vendas: ${formatNumber(filialData.vendas_periodo || 0)} • Estoque: ${formatNumber(filialData.estoque_atual || 0)} • Meta: ${formatNumber(filialData.meta || 0)} • Necessidade: ${formatNumber(filialData.necessidade || 0)} • Sugestão: ${formatNumber(sugestao)}${sugestao === 0 ? ' • Motivo: ' + motivoSemSugestao : ''}`
                        : `${f.nome}: período ${resumoNF?.periodo_dias || periodoDias}d • Sem dados`
                      return (
                        <td key={f.cod} className="px-1.5 py-1.5 text-right">
                          {sugestao > 0 ? (
                            <span className="font-semibold text-success">{formatNumber(sugestao)}</span>
                          ) : (
                            <Tooltip content={tooltipTexto}>
                              <span className="text-slate-300 cursor-help">-</span>
                            </Tooltip>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                  {/* Linha de sugestão de combinados quando há déficit */}
                  {produto.deficit > 0 && produto.combinados_disponiveis && produto.combinados_disponiveis.length > 0 && (
                    <tr className="bg-amber-50 border-l-4 border-amber-400">
                      <td colSpan={7 + FILIAIS.length} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="bg-amber-100 p-2 rounded-full">
                            <FiAlertTriangle className="text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-amber-800">Sugestão de Complemento</span>
                              <Tooltip content={`Déficit de ${formatNumber(produto.deficit)} unidades. Há produtos do mesmo grupo combinado disponíveis no CD que podem complementar a distribuição.`} />
                            </div>
                            <p className="text-sm text-amber-700 mb-2">
                              Faltam <strong>{formatNumber(produto.deficit)}</strong> unidades. Produtos equivalentes disponíveis no CD:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {produto.combinados_disponiveis.map(comb => (
                                <div key={comb.cod_produto} className="bg-white border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                                  <span className="font-mono text-sm text-amber-800">{comb.cod_produto}</span>
                                  <span className="text-xs text-slate-500 max-w-[200px] truncate">{comb.descricao}</span>
                                  <span className="badge badge-success text-xs">{formatNumber(comb.estoque_cd)} un</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="card bg-gradient-to-r from-accent-subtle to-purple-50 border-accent shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="animate-spin">
                <FiLoader className="text-accent text-3xl" />
              </div>
              <div>
                <p className="font-bold text-accent text-lg">Processando DRP...</p>
                <p className="text-sm text-accent-dark mt-1 font-mono">
                  {textoAnimado}<span className="animate-pulse">▊</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Tempo</p>
              <p className="text-2xl font-bold text-accent tabular-nums">
                {Math.floor(tempoProcessamento / 60)}:{String(tempoProcessamento % 60).padStart(2, '0')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {tempoProcessamento < 5 ? '⚡ Rápido' : tempoProcessamento < 10 ? '⏳ Processando' : '🔄 Quase lá'}
              </p>
            </div>
          </div>
          
          {/* Barra de progresso animada */}
          <div className="mt-4 bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-accent to-purple-500 h-full animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      )}

      {/* Resumo */}
      {calculado && resumo && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="bg-accent-subtle p-2.5 rounded-md">
                <FiPackage className="text-accent text-lg" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">SKUs Analisados</p>
                  <Tooltip content="Quantidade de produtos incluídos na análise" />
                </div>
                <p className="text-2xl font-semibold text-slate-900">{formatNumber(resumo.total_skus)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="bg-warning-subtle p-2.5 rounded-md">
                <FiAlertTriangle className="text-warning text-lg" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Necessidade Total</p>
                  <Tooltip content="Soma das necessidades de todas as filiais" />
                </div>
                <p className="text-2xl font-semibold text-warning">{formatNumber(resumo.necessidade_total)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="bg-success-subtle p-2.5 rounded-md">
                <FiCheckCircle className="text-success text-lg" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Estoque {resumo?.nome_origem || 'CD'}</p>
                  <Tooltip content={`Estoque disponível na filial ${resumo?.nome_origem || 'CD'}`} />
                </div>
                <p className="text-2xl font-semibold text-success">{formatNumber(resumo.estoque_cd)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-3">
              <div className="bg-danger-subtle p-2.5 rounded-md">
                <FiAlertCircle className="text-danger text-lg" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Déficit Total</p>
                  <Tooltip content="Quantidade que falta no CD para atender todas as necessidades" />
                </div>
                <p className="text-2xl font-semibold text-danger">{formatNumber(resumo.deficit_total)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros Pós-Processamento */}
      {calculado && produtos.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FiFilter className="text-accent text-lg" />
              <h2 className="text-base font-semibold text-slate-900">Filtros</h2>
            </div>
            <div className="flex gap-3 items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filtroComDistribuicao}
                  onChange={(e) => setFiltroComDistribuicao(e.target.checked)}
                  className="w-4 h-4 text-accent border-slate-300 rounded focus:ring-accent"
                />
                <span className="text-sm font-medium text-slate-700">Apenas com Distribuição</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filtroApenasCombinados}
                  onChange={(e) => setFiltroApenasCombinados(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-slate-700">Apenas Combinados</span>
              </label>
              <button
                onClick={imprimirRelatorio}
                className="btn btn-secondary flex items-center gap-2 ml-4"
                title="Imprimir relatório de distribuição"
              >
                <FiPrinter />
                Imprimir Relatório
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>Mostrando:</span>
            <span className="font-semibold text-accent">{produtosFiltrados.length}</span>
            <span>de</span>
            <span className="font-semibold">{produtos.length}</span>
            <span>produtos</span>
          </div>
        </div>
      )}

      {/* Resumo de Distribuição por Filial */}
      {calculado && produtos.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <FiTruck className="text-accent text-lg" />
            <h2 className="text-base font-semibold text-slate-900">Resumo de Distribuição</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {FILIAIS.filter(f => filiaisSelecionadas.includes(f.cod)).map(filial => {
              const totalEnviar = produtos.reduce((acc, p) => {
                const filialData = p.filiais.find(f => f.cod_filial === filial.cod)
                return acc + (filialData?.alocacao_sugerida || 0)
              }, 0)
              const totalNecessidade = produtos.reduce((acc, p) => {
                const filialData = p.filiais.find(f => f.cod_filial === filial.cod)
                return acc + (filialData?.necessidade || 0)
              }, 0)
              return (
                <div key={filial.cod} className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">{filial.nome}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Necessidade:</span>
                      <span className="font-medium text-warning">{formatNumber(totalNecessidade)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Enviar:</span>
                      <span className="font-medium text-success">{formatNumber(totalEnviar)}</span>
                    </div>
                    {totalNecessidade > 0 && (
                      <div className="mt-2 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-success h-full transition-all"
                          style={{ width: `${Math.min(100, (totalEnviar / totalNecessidade) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Botões de Ação - DRP por Produto */}
      {calculado && produtos.length > 0 && abaAtiva === 'produto' && (
        <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-800">Ações de Distribuição</h3>
              <p className="text-sm text-green-600 mt-1">
                Exportar planilha ou gerar pedidos para as filiais
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setExportandoXLSX(true)
                  
                  try {
                    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/drp/exportar-xlsx`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        produtos: produtos,
                        periodo_dias: periodoDias,
                        filial_origem: filialOrigem
                      })
                    })

                    if (response.ok) {
                      const blob = await response.blob()
                      const url = window.URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `DRP_Produto_${new Date().toISOString().split('T')[0]}.xlsx`
                      document.body.appendChild(a)
                      a.click()
                      window.URL.revokeObjectURL(url)
                      document.body.removeChild(a)
                    } else {
                      alert('Erro ao exportar XLSX')
                    }
                  } catch (error) {
                    console.error('Erro:', error)
                    alert('Erro ao exportar XLSX')
                  } finally {
                    setExportandoXLSX(false)
                  }
                }}
                disabled={exportandoXLSX}
                className="btn btn-secondary flex items-center gap-2"
              >
                {exportandoXLSX ? (
                  <span className="flex items-center gap-2">
                    <FiLoader className="animate-spin" />
                    Exportando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FiFileText />
                    Exportar XLSX
                  </span>
                )}
              </button>

              <button
                onClick={async () => {
                  if (!confirm('Deseja gerar pedidos de distribuição para as filiais?')) {
                    return
                  }

                  setGerandoPedidos(true)
                  
                  try {
                    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/drp/gerar-pedidos`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        produtos: produtos,
                        usuario: 'Sistema',
                        filial_origem: filialOrigem
                      })
                    })

                    const data = await response.json()
                    
                    if (data.success) {
                      setPedidosGerados(data.data.pedidos)
                      alert(`✅ ${data.data.pedidos.length} pedido(s) gerado(s) com sucesso!`)
                    } else {
                      alert('Erro ao gerar pedidos: ' + data.error)
                    }
                  } catch (error) {
                    console.error('Erro:', error)
                    alert('Erro ao gerar pedidos')
                  } finally {
                    setGerandoPedidos(false)
                  }
                }}
                disabled={gerandoPedidos}
                className="btn btn-primary flex items-center gap-2"
              >
                {gerandoPedidos ? (
                  <span className="flex items-center gap-2">
                    <FiLoader className="animate-spin" />
                    Gerando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FiTruck />
                    Gerar Pedidos
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Produtos */}
      {calculado && produtosFiltrados.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-base font-semibold text-slate-900">Produtos Analisados</h2>
            <p className="text-sm text-slate-500 mt-1">
              {resumo?.produtos_ok} OK • {resumo?.produtos_rateio} Rateio • {resumo?.produtos_deficit} Déficit
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-500">Produto</th>
                  <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-500">Grupo</th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">
                    <div className="flex items-center justify-end gap-1">
                      Qtd {resumo?.nome_origem || 'CD'}
                      <Tooltip content={`Quantidade disponível na filial ${resumo?.nome_origem || 'CD'}`} />
                    </div>
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">
                    <div className="flex items-center justify-end gap-1">
                      Est. {resumo?.nome_origem || 'CD'}
                      <Tooltip content={`Estoque atual na filial ${resumo?.nome_origem || 'CD'}`} />
                    </div>
                  </th>
                  <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">
                    <div className="flex items-center justify-end gap-1">
                      Necessidade
                      <Tooltip content="Soma das necessidades de todas as filiais" />
                    </div>
                  </th>
                  <th className="px-2 py-1.5 text-center text-xs font-medium text-slate-500">Status</th>
                  <th className="px-2 py-1.5 text-center text-xs font-medium text-slate-500">
                    <div className="flex items-center justify-center gap-1">
                      Base
                      <Tooltip content="Base do cálculo da meta" />
                    </div>
                  </th>
                  {FILIAIS.map(f => (
                    <th key={f.cod} className="px-1.5 py-1.5 text-right text-xs font-medium text-slate-500">
                      <div className="flex items-center justify-end gap-1">
                        {f.nome.substring(0, 3)}
                        <Tooltip content={`Sugestão de envio para ${f.nome}`} />
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-center text-xs font-medium text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.map((produto) => (
                  <React.Fragment key={produto.cod_produto}>
                  <tr className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-1.5">
                      <div>
                        <span className="font-medium text-slate-900">{produto.cod_produto}</span>
                        <p className="text-xs text-slate-500 truncate max-w-[160px]">{produto.descricao.replace(/\[COMBINADO: \d+ produtos\] /, '')}</p>
                      </div>
                    </td>
                    <td className="px-2 py-1.5 text-xs text-slate-600">{produto.grupo}</td>
                    <td className="px-2 py-1.5 text-right font-medium text-purple-600">{formatNumber(produto.estoque_cd)}</td>
                    <td className="px-2 py-1.5 text-right">{formatNumber(produto.estoque_cd)}</td>
                    <td className="px-2 py-1.5 text-right font-medium text-warning">{formatNumber(produto.necessidade_total)}</td>
                    <td className="px-2 py-1.5 text-center">{getStatusBadge(produto.status)}</td>
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {produto.filiais.some(f => f.usou_estoque_minimo) ? (
                          <>
                            <span className="badge badge-warning text-xs">Est.Mín</span>
                            <Tooltip content="Meta baseada no estoque mínimo" />
                          </>
                        ) : produto.descricao.includes('[COMBINADO:') ? (
                          <>
                            <span className="badge badge-info text-xs">Comb.</span>
                            <Tooltip content="Meta baseada em vendas de produtos combinados" />
                          </>
                        ) : (
                          <>
                            <span className="badge badge-success text-xs">Vendas</span>
                            <Tooltip content="Meta baseada em vendas do período" />
                          </>
                        )}
                      </div>
                    </td>
                    {FILIAIS.map(f => {
                      const filialData = produto.filiais.find(fil => fil.cod_filial === f.cod)
                      const sugestao = filialData?.alocacao_sugerida || 0
                      const temCombinadoEstoque = filialData?.tem_combinado_estoque || false
                      const todosCombinados = produto.todos_combinados || []
                      
                      // Calcular estoque combinado na filial específica
                      const estoqueCombinadoFilial = todosCombinados.reduce((acc, c) => {
                        const estoqueFilial = f.cod === '00' ? c.estoque_petrolina :
                                             f.cod === '01' ? c.estoque_juazeiro :
                                             f.cod === '02' ? c.estoque_salgueiro :
                                             f.cod === '05' ? c.estoque_bonfim :
                                             f.cod === '06' ? c.estoque_picos : 0
                        return acc + estoqueFilial
                      }, 0)
                      
                      const motivoSemSugestao = filialData
                        ? (filialData.necessidade <= 0
                            ? 'Sem necessidade (estoque cobre a meta)'
                            : 'Sem alocação nesta rodada de rateio')
                        : 'Sem dados para a filial'
                      
                      const tooltipTexto = filialData
                        ? `${f.nome}: período ${periodoDias}d • Vendas: ${formatNumber(filialData.saida_periodo || 0)} • Estoque: ${formatNumber(filialData.estoque_atual || 0)} • Meta: ${formatNumber(filialData.meta || 0)} • Necessidade: ${formatNumber(filialData.necessidade || 0)} • Sugestão: ${formatNumber(sugestao)}${sugestao === 0 ? ' • Motivo: ' + motivoSemSugestao : ''}`
                        : `${f.nome}: período ${periodoDias}d • Sem dados`
                      
                      return (
                        <td key={f.cod} className="px-1.5 py-1.5 text-right">
                          {sugestao > 0 ? (
                            <Tooltip content={tooltipTexto}>
                              <span className="font-semibold text-success cursor-help">{formatNumber(sugestao)}</span>
                            </Tooltip>
                          ) : temCombinadoEstoque && todosCombinados.length > 0 ? (
                            <button
                              onClick={() => {
                                setDadosModalCombinados({
                                  produto: `${produto.cod_produto} - ${produto.descricao}`,
                                  filial: f.nome,
                                  combinados: todosCombinados
                                })
                                setModalCombinadosEstoqueAberto(true)
                              }}
                              className="text-amber-500 hover:text-amber-600 cursor-pointer flex items-center justify-end gap-1 transition-colors"
                              title="Clique para ver produtos combinados em estoque"
                            >
                              <FiPackage className="text-xs" />
                              <span className="text-xs font-medium">{formatNumber(estoqueCombinadoFilial)}</span>
                            </button>
                          ) : (
                            <Tooltip content={tooltipTexto}>
                              <span className="text-slate-300 cursor-help">-</span>
                            </Tooltip>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => {
                          setProdutoSelecionado(produto)
                          setModalAberto(true)
                        }}
                        className="text-accent hover:text-accent-dark text-sm font-medium"
                      >
                        Detalhes
                      </button>
                    </td>
                  </tr>
                  
                  {/* Linha de sugestão de combinados quando há déficit - DRP por Produto */}
                  {produto.deficit > 0 && produto.combinados_disponiveis && produto.combinados_disponiveis.length > 0 && (
                    <tr className="bg-amber-50 border-l-4 border-amber-400">
                      <td colSpan={7 + FILIAIS.length + 1} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                              <FiPackage className="text-amber-600" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-amber-800 mb-1">Produtos Combinados Disponíveis</h4>
                            <p className="text-sm text-amber-700 mb-2">
                              Faltam <strong>{formatNumber(produto.deficit)}</strong> unidades. Produtos equivalentes disponíveis no CD:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {produto.combinados_disponiveis.map(comb => (
                                <div key={comb.cod_produto} className="bg-white border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
                                  <span className="font-mono text-sm text-amber-800">{comb.cod_produto}</span>
                                  <span className="text-xs text-slate-500 max-w-[200px] truncate">{comb.descricao}</span>
                                  <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                                    {formatNumber(comb.estoque_cd)} un
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {calculado && produtos.length > 0 && produtosFiltrados.length === 0 && (
        <div className="card text-center py-12">
          <FiFilter className="mx-auto text-4xl text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium mb-2">Nenhum produto corresponde aos filtros aplicados</p>
          <p className="text-sm text-slate-500">Ajuste os filtros para ver mais resultados</p>
        </div>
      )}

      {calculado && produtos.length === 0 && (
        <div className="card text-center py-12">
          <FiPackage className="mx-auto text-4xl text-slate-300 mb-3" />
          <p className="text-slate-500">Nenhum produto encontrado com os filtros selecionados</p>
        </div>
      )}

      {/* Modal de Detalhes */}
      {modalAberto && produtoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-slate-900">{produtoSelecionado.cod_produto}</h3>
                  {produtoSelecionado.descricao.includes('[COMBINADO:') && produtoSelecionado.cod_grupo_combinado && (
                    <button
                      onClick={() => buscarProdutosCombinados(produtoSelecionado.cod_grupo_combinado!)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium hover:bg-purple-200 transition-colors cursor-pointer"
                      title="Clique para ver os produtos combinados"
                    >
                      <FiPackage className="text-xs" />
                      {produtoSelecionado.descricao.match(/\[COMBINADO: (\d+) produtos\]/)?.[1] || '?'} produtos combinados
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-500">{produtoSelecionado.descricao.replace(/\[COMBINADO: \d+ produtos\] /, '')}</p>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Resumo do Produto */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Grupo</p>
                  <p className="font-medium text-slate-900">{produtoSelecionado.grupo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Estoque {resumo?.nome_origem || 'CD'}</p>
                  <p className="font-medium text-slate-900">{formatNumber(produtoSelecionado.estoque_cd)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Necessidade Total</p>
                  <p className="font-medium text-warning">{formatNumber(produtoSelecionado.necessidade_total)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Déficit</p>
                  <p className="font-medium text-danger">{formatNumber(produtoSelecionado.deficit)}</p>
                </div>
              </div>

              {/* Status */}
              <div className="mb-6">
                <p className="text-xs text-slate-500 mb-2">Status</p>
                <div className="flex items-center gap-3">
                  {getStatusBadge(produtoSelecionado.status)}
                  <span className="text-sm text-slate-600">
                    Atendimento: {Math.round(produtoSelecionado.proporcao_atendimento * 100)}%
                  </span>
                </div>
              </div>

              {/* Tabela por Filial */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Análise por Filial</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-2 py-1.5 text-left text-xs font-medium text-slate-500">Filial</th>
                        <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">
                          <div className="flex items-center justify-end gap-1">
                            Estoque
                            <Tooltip content="Estoque disponível atual da filial (descontando bloqueios)" />
                          </div>
                        </th>
                        <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">
                          <div className="flex items-center justify-end gap-1">
                            Saída ({resumo?.periodo_dias}d)
                            <Tooltip content="Total de vendas/saídas no período selecionado" />
                          </div>
                        </th>
                        <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">
                          <div className="flex items-center justify-end gap-1">
                            Média
                            <Tooltip content="Média das vendas diárias do período. Usada para detectar picos de venda anormais." />
                          </div>
                        </th>
                        <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">
                          <div className="flex items-center justify-end gap-1">
                            CV%
                            <Tooltip content="Coeficiente de Variação: mede a estabilidade das vendas. Quanto maior, mais instável." />
                          </div>
                        </th>
                        <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">
                          <div className="flex items-center justify-end gap-1">
                            Meta
                            <Tooltip content="Quantidade ideal para manter em estoque. Usa a saída do período, mas ajusta se detectar pico de venda." />
                          </div>
                        </th>
                        <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">
                          <div className="flex items-center justify-end gap-1">
                            Necessidade
                            <Tooltip content="Quantidade que falta para atingir a meta (Meta - Estoque Atual)" />
                          </div>
                        </th>
                        <th className="px-2 py-1.5 text-right text-xs font-medium text-slate-500">
                          <div className="flex items-center justify-end gap-1">
                            Sugestão
                            <Tooltip content="Quantidade sugerida para enviar do CD para esta filial" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtoSelecionado.filiais.map((filial) => (
                        <tr key={filial.cod_filial} className={`border-t border-slate-100 ${filial.tem_pico ? 'bg-orange-50' : ''}`}>
                          <td className="px-2 py-1.5 font-medium text-slate-900">
                            {filial.nome}
                            {filial.tem_pico && (
                              <span className="ml-1 inline-flex items-center px-1 py-0.5 bg-orange-100 text-orange-700 text-xs rounded" title="Pico de demanda detectado">
                                ⚠️
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right">{formatNumber(filial.estoque_atual)}</td>
                          <td className="px-2 py-1.5 text-right">
                            <span className={filial.tem_pico ? 'text-orange-600 font-bold' : ''}>
                              {formatNumber(filial.saida_periodo)}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-right text-slate-600">
                            {filial.media_vendas !== undefined ? formatNumber(filial.media_vendas) : '-'}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {filial.coeficiente_variacao !== undefined ? (
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold ${
                                filial.coeficiente_variacao < 30 
                                  ? 'bg-green-100 text-green-700' 
                                  : filial.coeficiente_variacao < 50 
                                  ? 'bg-yellow-100 text-yellow-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {filial.coeficiente_variacao < 30 ? '🟢' : filial.coeficiente_variacao < 50 ? '🟡' : '🔴'}
                                {filial.coeficiente_variacao.toFixed(0)}%
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-2 py-1.5 text-right">{formatNumber(filial.meta)}</td>
                          <td className="px-2 py-1.5 text-right">{formatNumber(filial.necessidade)}</td>
                          <td className="px-2 py-1.5 text-right font-medium text-success">{formatNumber(filial.alocacao_sugerida)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Legenda do CV% */}
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Legenda - Coeficiente de Variação (CV%):</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-green-100 text-green-700 font-semibold">
                        🟢 &lt;30%
                      </span>
                      <span className="text-slate-600">Estável - Demanda previsível</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-100 text-yellow-700 font-semibold">
                        🟡 30-50%
                      </span>
                      <span className="text-slate-600">Moderado - Variações significativas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-700 font-semibold">
                        🔴 &gt;50%
                      </span>
                      <span className="text-slate-600">Instável - Demanda imprevisível</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex justify-end">
              <button onClick={() => setModalAberto(false)} className="btn btn-secondary">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Produtos Combinados */}
      {modalCombinadosAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiPackage className="text-purple-600 text-xl" />
                <h3 className="text-lg font-semibold text-slate-900">Produtos Combinados</h3>
              </div>
              <button
                onClick={() => setModalCombinadosAberto(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
              {loadingCombinados ? (
                <div className="flex items-center justify-center py-12">
                  <FiLoader className="animate-spin text-accent text-3xl" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Código</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Descrição</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Referência</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Vendas ({periodoDias}d)</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Estoque CD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {produtosCombinados.map((prod, index) => {
                        const temVendas = parseFloat(prod.vendas_periodo.toString()) > 0
                        const temEstoque = parseFloat(prod.estoque_cd.toString()) > 0
                        return (
                          <tr 
                            key={prod.cod_produto} 
                            className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ${temVendas ? 'border-l-4 border-l-accent' : ''}`}
                          >
                            <td className="px-3 py-2 font-medium text-slate-900">
                              {prod.cod_produto}
                              {temVendas && (
                                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 bg-accent-subtle text-accent-text text-xs rounded">
                                  Saiu
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-700">{prod.descricao}</td>
                            <td className="px-3 py-2 text-slate-600">{prod.referencia_fabricante}</td>
                            <td className="px-3 py-2 text-right font-medium">
                              <span className={temVendas ? 'text-accent font-bold' : 'text-slate-400'}>
                                {formatNumber(parseFloat(prod.vendas_periodo.toString()))}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-medium">
                              <span className={temEstoque ? 'text-success' : 'text-slate-400'}>
                                {formatNumber(parseFloat(prod.estoque_cd.toString()))}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-semibold">
                        <td colSpan={3} className="px-3 py-2 text-right text-slate-700">Totais:</td>
                        <td className="px-3 py-2 text-right text-accent font-bold">
                          {formatNumber(produtosCombinados.reduce((acc, p) => acc + parseFloat(p.vendas_periodo.toString()), 0))}
                        </td>
                        <td className="px-3 py-2 text-right text-success font-bold">
                          {formatNumber(produtosCombinados.reduce((acc, p) => acc + parseFloat(p.estoque_cd.toString()), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex justify-end">
              <button onClick={() => setModalCombinadosAberto(false)} className="btn btn-secondary">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Produtos Combinados em Estoque */}
      {modalCombinadosEstoqueAberto && dadosModalCombinados && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <FiPackage className="text-amber-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Produtos Combinados em Estoque</h3>
                    <p className="text-sm text-slate-500">{dadosModalCombinados.filial}</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalCombinadosEstoqueAberto(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <FiX className="text-xl" />
                </button>
              </div>
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">Produto:</span> {dadosModalCombinados.produto}
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  {dadosModalCombinados.combinados.length} produto(s) equivalente(s) do mesmo grupo
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Código</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Descrição</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Referência</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Pet</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Jua</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Sal</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Bon</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Pic</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-slate-700">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosModalCombinados.combinados.map((comb, index) => {
                      const total = comb.estoque_petrolina + comb.estoque_juazeiro + comb.estoque_salgueiro + comb.estoque_bonfim + comb.estoque_picos
                      return (
                        <tr key={comb.cod_produto} className="border-b border-slate-100 hover:bg-amber-50">
                          <td className="px-3 py-2">
                            <span className="font-mono font-semibold text-amber-800">{comb.cod_produto}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-700 max-w-[200px] truncate" title={comb.descricao}>
                            {comb.descricao}
                          </td>
                          <td className="px-3 py-2 text-slate-600 text-xs">
                            {comb.referencia_fabricante}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={comb.estoque_petrolina > 0 ? 'font-semibold text-success' : 'text-slate-400'}>
                              {formatNumber(comb.estoque_petrolina)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={comb.estoque_juazeiro > 0 ? 'font-semibold text-success' : 'text-slate-400'}>
                              {formatNumber(comb.estoque_juazeiro)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={comb.estoque_salgueiro > 0 ? 'font-semibold text-success' : 'text-slate-400'}>
                              {formatNumber(comb.estoque_salgueiro)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={comb.estoque_bonfim > 0 ? 'font-semibold text-success' : 'text-slate-400'}>
                              {formatNumber(comb.estoque_bonfim)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={comb.estoque_picos > 0 ? 'font-semibold text-success' : 'text-slate-400'}>
                              {formatNumber(comb.estoque_picos)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="font-bold text-amber-700">
                              {formatNumber(total)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-semibold">
                      <td colSpan={3} className="px-3 py-2 text-right text-slate-700">Totais:</td>
                      <td className="px-3 py-2 text-right text-success">
                        {formatNumber(dadosModalCombinados.combinados.reduce((acc, c) => acc + c.estoque_petrolina, 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-success">
                        {formatNumber(dadosModalCombinados.combinados.reduce((acc, c) => acc + c.estoque_juazeiro, 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-success">
                        {formatNumber(dadosModalCombinados.combinados.reduce((acc, c) => acc + c.estoque_salgueiro, 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-success">
                        {formatNumber(dadosModalCombinados.combinados.reduce((acc, c) => acc + c.estoque_bonfim, 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-success">
                        {formatNumber(dadosModalCombinados.combinados.reduce((acc, c) => acc + c.estoque_picos, 0))}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-amber-700">
                        {formatNumber(dadosModalCombinados.combinados.reduce((acc, c) => 
                          acc + c.estoque_petrolina + c.estoque_juazeiro + c.estoque_salgueiro + c.estoque_bonfim + c.estoque_picos, 0
                        ))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex justify-end items-center">
              <button 
                onClick={() => setModalCombinadosEstoqueAberto(false)} 
                className="btn btn-secondary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Estoque Mínimo */}
      {modalEstoqueMinAberto && produtoEstoqueMin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Configurar Estoque Mínimo</h3>
                <p className="text-sm text-slate-500">{produtoEstoqueMin.cod_produto} - {produtoEstoqueMin.descricao}</p>
              </div>
              <button
                onClick={() => setModalEstoqueMinAberto(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
              {loadingEstoqueMin ? (
                <div className="flex items-center justify-center py-8">
                  <FiLoader className="animate-spin text-2xl text-accent mr-2" />
                  <span>Calculando sugestões...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Legenda */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      CV ≤ 30% (Alta confiabilidade)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                      CV 31-60% (Média)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      CV &gt; 60% (Baixa - dados instáveis)
                    </span>
                  </div>

                  {/* Tabela de sugestões por filial */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="px-3 py-2 text-left font-medium text-slate-600">Filial</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600">Vendas {periodoDias}d</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600">Média/dia</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600">CV</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600">Atual</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600">Sugerido</th>
                        <th className="px-3 py-2 text-center font-medium text-slate-600">Novo Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sugestoesEstoqueMin.map((s) => (
                        <tr key={s.cod_filial} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-3 font-medium text-slate-900">{s.nome_filial}</td>
                          <td className="px-3 py-3 text-center">{s.vendas_periodo}</td>
                          <td className="px-3 py-3 text-center">{s.media_diaria.toFixed(2)}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              s.confiabilidade === 'alta' ? 'bg-green-100 text-green-700' :
                              s.confiabilidade === 'media' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {s.coeficiente_variacao}%
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center text-slate-500">{s.estoque_minimo_atual}</td>
                          <td className="px-3 py-3 text-center">
                            <span className="font-medium text-accent">{s.estoque_minimo_sugerido}</span>
                            <span className="text-xs text-slate-400 ml-1">({s.dias_cobertura_sugerido}d)</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="range"
                                min="0"
                                max={Math.max(s.estoque_minimo_sugerido * 3, 50)}
                                value={s.valor_editado || 0}
                                onChange={(e) => atualizarValorEstoqueMin(s.cod_filial, parseInt(e.target.value))}
                                className="w-24 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
                              />
                              <input
                                type="number"
                                min="0"
                                value={s.valor_editado || 0}
                                onChange={(e) => atualizarValorEstoqueMin(s.cod_filial, parseInt(e.target.value) || 0)}
                                className="w-16 px-2 py-1 text-center border border-slate-300 rounded text-sm"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    <strong>Como funciona:</strong> O estoque mínimo sugerido é calculado com base na média de vendas diárias × dias de cobertura. 
                    Quanto maior o CV (coeficiente de variação), mais dias de cobertura são sugeridos para compensar a instabilidade.
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex justify-between items-center">
              <span className="text-xs text-slate-500">
                {sugestoesEstoqueMin.filter(s => s.valor_editado !== s.estoque_minimo_atual).length} alteração(ões) pendente(s)
              </span>
              <div className="flex gap-2">
                <button onClick={() => setModalEstoqueMinAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button 
                  onClick={salvarEstoqueMin} 
                  disabled={salvandoEstoqueMin}
                  className="btn bg-accent text-white hover:bg-accent-dark disabled:opacity-50"
                >
                  {salvandoEstoqueMin ? (
                    <span className="flex items-center gap-2">
                      <FiLoader className="animate-spin" />
                      Salvando...
                    </span>
                  ) : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
