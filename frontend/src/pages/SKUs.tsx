import { useState, useEffect } from 'react'
import { FiSearch, FiPackage, FiBarChart2, FiX, FiLoader, FiAlertCircle, FiChevronDown, FiChevronRight } from 'react-icons/fi'
import { Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, ComposedChart, Line } from 'recharts'

interface Produto {
  cod_produto: string
  descricao: string
  referencia_fabricante: string
  codigo_barras: string
  grupo_descricao: string
  tem_combinado: boolean
  cod_grupo_combinado: string | null
  qtd_combinados: number
  ativo: string
  estoque_total_grupo: number
}

interface ProdutoCombinado {
  cod_produto: string
  descricao: string
  referencia_fabricante: string
  estoque_total: number
}

interface ProdutoDetalhes {
  produto: {
    cod_produto: string
    descricao: string
    referencia_fabricante: string
    grupo_descricao: string
    ativo: string
  }
  combinado: {
    cod_grupo: string
    qtd_produtos: number
  } | null
  estoques: Array<{
    cod_filial: string
    estoque: number
    estoque_minimo: number
    preco_custo: number
    preco_medio: number
  }>
  vendas: Array<{
    cod_filial: string
    total_vendas: number
  }>
  historico_vendas: Array<{
    mes: number
    ano: number
    total: number
  }>
  historico_entradas: Array<{
    mes: number
    ano: number
    total: number
  }>
  estatisticas: {
    estoque_total: number
    estoque_disponivel: number
    media_vendas_3_meses: number
    media_vendas_6_meses: number
    media_vendas_12_meses: number
  }
}

const FILIAIS = [
  { cod: '00', nome: 'Petrolina' },
  { cod: '01', nome: 'Juazeiro' },
  { cod: '02', nome: 'Salgueiro' },
  { cod: '04', nome: 'CD' },
  { cod: '05', nome: 'Bonfim' },
  { cod: '06', nome: 'Picos' }
]

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function SKUs() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [modalAberto, setModalAberto] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoDetalhes | null>(null)
  const [produtoDetalhesCompleto, setProdutoDetalhesCompleto] = useState<any>(null) // Armazena dados de 90 dias
  const [loadingDetalhes, setLoadingDetalhes] = useState(false)
  const [periodoDetalhes, setPeriodoDetalhes] = useState<'30' | '60' | '90'>('30')

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [combinadosCache, setCombinadosCache] = useState<Map<string, ProdutoCombinado[]>>(new Map())
  const [loadingCombinados, setLoadingCombinados] = useState<Set<string>>(new Set())

  // Estado para análise de vendas dos combinados
  const [modalAnaliseAberto, setModalAnaliseAberto] = useState(false)
  const [dadosAnalise, setDadosAnalise] = useState<any>(null)
  const [dadosAnaliseCompleto, setDadosAnaliseCompleto] = useState<any>(null) // Armazena todos os períodos
  const [loadingAnalise, setLoadingAnalise] = useState(false)
  const [periodoAnalise, setPeriodoAnalise] = useState<'30' | '60' | '90'>('30')

  // Busca quando a página muda
  useEffect(() => {
    buscarProdutos()
  }, [page])

  // Busca em tempo real ao digitar (com debounce de 300ms)
  useEffect(() => {
    if (busca.length >= 2 || busca.length === 0) {
      const timeoutId = setTimeout(() => {
        setPage(1)
        buscarProdutos()
      }, 300)
      return () => clearTimeout(timeoutId)
    }
  }, [busca])

  const buscarProdutos = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30',
        busca: busca
      })

      const response = await fetch(`/api/produtos?${params}`)
      const data = await response.json()

      if (data.success) {
        setProdutos(data.data)
        setTotalPages(data.pagination.totalPages)
        setTotal(data.pagination.total)
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const buscarDetalhes = async (codProduto: string) => {
    setLoadingDetalhes(true)
    setModalAberto(true)
    setPeriodoDetalhes('30') // Reset para 30 dias ao abrir

    try {
      // Busca dados de 30, 60 e 90 dias em paralelo
      const [res30, res60, res90] = await Promise.all([
        fetch(`/api/produtos/${codProduto}/detalhes?periodo_dias=30`).then(r => r.json()),
        fetch(`/api/produtos/${codProduto}/detalhes?periodo_dias=60`).then(r => r.json()),
        fetch(`/api/produtos/${codProduto}/detalhes?periodo_dias=90`).then(r => r.json())
      ])

      if (res30.success && res60.success && res90.success) {
        // Armazena todos os períodos
        setProdutoDetalhesCompleto({
          '30': res30.data,
          '60': res60.data,
          '90': res90.data
        })
        // Exibe dados de 30 dias inicialmente
        setProdutoSelecionado(res30.data)
      } else {
        alert('Erro ao buscar detalhes do produto')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao buscar detalhes do produto')
    } finally {
      setLoadingDetalhes(false)
    }
  }

  // Atualizar dados exibidos quando mudar período (sem recarregar)
  useEffect(() => {
    if (produtoDetalhesCompleto && modalAberto) {
      setProdutoSelecionado(produtoDetalhesCompleto[periodoDetalhes])
    }
  }, [periodoDetalhes])

  const toggleCombinados = async (codGrupoCombinado: string) => {
    if (expandedRows.has(codGrupoCombinado)) {
      const newExpanded = new Set(expandedRows)
      newExpanded.delete(codGrupoCombinado)
      setExpandedRows(newExpanded)
      return
    }

    if (!combinadosCache.has(codGrupoCombinado)) {
      setLoadingCombinados(new Set(loadingCombinados).add(codGrupoCombinado))
      try {
        const response = await fetch(`/api/combinados/${codGrupoCombinado}/produtos`)
        const data = await response.json()
        
        if (data.success) {
          setCombinadosCache(new Map(combinadosCache).set(codGrupoCombinado, data.data))
        }
      } catch (error) {
        console.error('Erro ao buscar combinados:', error)
      } finally {
        const newLoading = new Set(loadingCombinados)
        newLoading.delete(codGrupoCombinado)
        setLoadingCombinados(newLoading)
      }
    }

    setExpandedRows(new Set(expandedRows).add(codGrupoCombinado))
  }

  const prepararDadosGrafico = (produto: ProdutoDetalhes) => {
    const mesesMap = new Map<string, { mes: string, entradas: number, vendas: number }>()

    produto.historico_vendas.forEach(v => {
      const key = `${v.mes}/${v.ano}`
      const mesNome = `${MESES[v.mes - 1]}/${v.ano}`
      mesesMap.set(key, { mes: mesNome, entradas: 0, vendas: v.total })
    })

    produto.historico_entradas.forEach(e => {
      const key = `${e.mes}/${e.ano}`
      const mesNome = `${MESES[e.mes - 1]}/${e.ano}`
      const existing = mesesMap.get(key)
      if (existing) {
        existing.entradas = e.total
      } else {
        mesesMap.set(key, { mes: mesNome, entradas: e.total, vendas: 0 })
      }
    })

    return Array.from(mesesMap.values()).reverse().slice(-12)
  }

  const handleBusca = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    buscarProdutos()
  }

  const handleBuscaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusca(e.target.value)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('pt-BR').format(Math.round(num))
  }

  // Buscar análise de vendas dos produtos combinados
  const buscarAnaliseVendas = async (codGrupo: string) => {
    setLoadingAnalise(true)
    setModalAnaliseAberto(true)
    setPeriodoAnalise('30') // Reset para 30 dias ao abrir
    
    try {
      // Busca dados de 30, 60 e 90 dias em paralelo
      const [res30, res60, res90] = await Promise.all([
        fetch(`/api/combinados/${codGrupo}/analise-vendas?periodo=30`).then(r => r.json()),
        fetch(`/api/combinados/${codGrupo}/analise-vendas?periodo=60`).then(r => r.json()),
        fetch(`/api/combinados/${codGrupo}/analise-vendas?periodo=90`).then(r => r.json())
      ])
      
      if (res30.success && res60.success && res90.success) {
        // Armazena todos os períodos
        setDadosAnaliseCompleto({
          '30': res30.data,
          '60': res60.data,
          '90': res90.data
        })
        // Exibe dados de 30 dias inicialmente
        setDadosAnalise(res30.data)
      }
    } catch (error) {
      console.error('Erro ao buscar análise:', error)
    } finally {
      setLoadingAnalise(false)
    }
  }

  // Atualizar dados exibidos quando mudar período (sem recarregar)
  useEffect(() => {
    if (dadosAnaliseCompleto && modalAnaliseAberto) {
      setDadosAnalise(dadosAnaliseCompleto[periodoAnalise])
    }
  }, [periodoAnalise])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Filtros - Fixo */}
      <div className="bg-white border-b border-border px-4 py-3 flex-shrink-0">
        <form onSubmit={handleBusca} className="flex gap-3">
          <div className="flex-1">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={busca}
                onChange={handleBuscaChange}
                placeholder="Digite código, referência ou descrição para buscar..."
                className="input pl-10 w-full"
              />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <FiLoader className="animate-spin" />
                Buscando...
              </span>
            ) : (
              'Buscar'
            )}
          </button>
        </form>

        <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
          <span>
            Total: <span className="font-semibold">{formatNumber(total)}</span> produtos
          </span>
          {loading && (
            <span className="flex items-center gap-1">
              <FiLoader className="animate-spin text-xs" />
              Buscando...
            </span>
          )}
        </div>
      </div>

      {/* Tabela de Produtos - Scrollável */}
      <div className="flex-1 overflow-hidden">
        {loading && produtos.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FiLoader className="animate-spin mx-auto text-4xl text-accent mb-3" />
              <p className="text-slate-500">Carregando produtos...</p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-background-subtle z-10">
                <tr>
                  <th className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 px-2 py-1.5 text-left">Código</th>
                  <th className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 px-2 py-1.5 text-left">Descrição</th>
                  <th className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 px-2 py-1.5 text-left">Referência</th>
                  <th className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 px-2 py-1.5 text-left">Grupo</th>
                  <th className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 px-2 py-1.5 text-right">Estoque</th>
                  <th className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 px-2 py-1.5 text-center">Combinado</th>
                  <th className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 px-2 py-1.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((produto) => {
                  const isExpanded = produto.cod_grupo_combinado ? expandedRows.has(produto.cod_grupo_combinado) : false
                  const combinados = produto.cod_grupo_combinado ? combinadosCache.get(produto.cod_grupo_combinado) : null
                  const isLoadingComb = produto.cod_grupo_combinado ? loadingCombinados.has(produto.cod_grupo_combinado) : false
                  
                  return (
                    <>
                      <tr key={produto.cod_produto} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                        <td className="px-2 py-1">
                          <div className="flex items-center gap-1.5">
                            {produto.tem_combinado && produto.cod_grupo_combinado && (
                              <button
                                onClick={() => toggleCombinados(produto.cod_grupo_combinado!)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                {isExpanded ? <FiChevronDown className="text-xs" /> : <FiChevronRight className="text-xs" />}
                              </button>
                            )}
                            <span className="text-xs font-medium text-slate-900">{produto.cod_produto}</span>
                          </div>
                        </td>
                        <td className="px-2 py-1">
                          <p className="text-xs text-slate-900">{produto.descricao}</p>
                        </td>
                        <td className="px-2 py-1 text-xs text-slate-600">{produto.referencia_fabricante}</td>
                        <td className="px-2 py-1 text-xs text-slate-600">{produto.grupo_descricao}</td>
                        <td className="px-2 py-1 text-xs text-right">
                          <span className={`font-medium ${produto.estoque_total_grupo > 0 ? 'text-success' : 'text-slate-400'}`}>
                            {formatNumber(produto.estoque_total_grupo)}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-center">
                          {produto.tem_combinado ? (
                            <button
                              onClick={() => produto.cod_grupo_combinado && toggleCombinados(produto.cod_grupo_combinado)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] rounded-full font-medium hover:bg-purple-200 transition-colors cursor-pointer"
                            >
                              <FiPackage className="text-[8px]" />
                              {produto.qtd_combinados}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-center">
                          <button
                            onClick={() => buscarDetalhes(produto.cod_produto)}
                            className="text-accent hover:text-accent-dark text-[10px] font-medium inline-flex items-center gap-1"
                          >
                            <FiBarChart2 className="text-xs" />
                            Detalhes
                          </button>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr className="bg-purple-50">
                          <td colSpan={7} className="px-2 py-1.5">
                            {isLoadingComb ? (
                              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <FiLoader className="animate-spin text-xs" />
                                Carregando produtos combinados...
                              </div>
                            ) : combinados && combinados.length > 0 ? (
                              <div className="pl-6">
                                <p className="text-[9px] font-semibold text-purple-700 mb-1">Produtos do Combinado</p>
                                <div className="grid grid-cols-12 text-[9px] font-semibold text-purple-600 uppercase tracking-wide mb-1">
                                  <span className="col-span-2">Código</span>
                                  <span className="col-span-5">Descrição</span>
                                  <span className="col-span-3">Referência</span>
                                  <span className="col-span-2 text-right">Estoque</span>
                                </div>
                                <div className="border border-purple-100 rounded-md divide-y divide-purple-100">
                                  {combinados.map((comb) => (
                                    <div key={comb.cod_produto} className="grid grid-cols-12 items-center text-[10px] text-slate-700 px-2 py-1 bg-white/60">
                                      <span className="col-span-2 font-semibold text-slate-900">{comb.cod_produto}</span>
                                      <span className="col-span-5 truncate">{comb.descricao}</span>
                                      <span className="col-span-3 text-slate-500 truncate">{comb.referencia_fabricante}</span>
                                      <span className={`col-span-2 text-right font-semibold ${comb.estoque_total > 0 ? 'text-success' : 'text-slate-400'}`}>
                                        {formatNumber(comb.estoque_total)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-500 pl-6">Nenhum produto encontrado</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginação - Fixo no rodapé */}
      {totalPages > 1 && (
        <div className="bg-white border-t border-border px-6 py-2 flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs font-medium rounded border border-border hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="text-xs text-slate-600">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs font-medium rounded border border-border hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próxima
          </button>
        </div>
      )}

      {/* Modal de Detalhes */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-[95vw] w-full max-h-[95vh] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex-1">
                {loadingDetalhes ? (
                  <div className="flex items-center gap-2">
                    <FiLoader className="animate-spin text-accent" />
                    <span className="text-slate-600">Carregando detalhes...</span>
                  </div>
                ) : produtoSelecionado && (
                  <>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {produtoSelecionado.produto.cod_produto} - {produtoSelecionado.produto.descricao}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-slate-500">
                        Ref: {produtoSelecionado.produto.referencia_fabricante} • {produtoSelecionado.produto.grupo_descricao}
                      </p>
                      {produtoSelecionado.combinado && (
                        <>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                            <FiPackage className="text-[10px]" />
                            {produtoSelecionado.combinado.qtd_produtos} produtos combinados
                          </span>
                          <button
                            onClick={() => buscarAnaliseVendas(produtoSelecionado.combinado!.cod_grupo)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                            title="Analisar vendas dos produtos combinados por filial"
                          >
                            <FiBarChart2 className="text-xs" />
                            Analisar Vendas
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  setModalAberto(false)
                  setProdutoSelecionado(null)
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-3 overflow-y-auto max-h-[calc(95vh-120px)]">
              {loadingDetalhes ? (
                <div className="flex items-center justify-center py-12">
                  <FiLoader className="animate-spin text-accent text-3xl" />
                </div>
              ) : produtoSelecionado && (
                <div className="space-y-2" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  {/* Cards de Informações Principais + Médias */}
                  <div className="grid grid-cols-6 gap-2">
                    <div className="p-2 bg-accent-subtle border border-accent rounded">
                      <p className="text-[9px] text-accent-text font-medium mb-0.5">Estoque Total</p>
                      <p className="text-base font-bold text-secondary">{formatNumber(produtoSelecionado.estatisticas.estoque_total)}</p>
                    </div>
                    <div className="p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-[9px] text-green-600 font-medium mb-0.5">Disponível</p>
                      <p className="text-base font-bold text-green-700">{formatNumber(produtoSelecionado.estatisticas.estoque_disponivel)}</p>
                    </div>
                    <div className="p-2 bg-purple-50 border border-purple-200 rounded">
                      <p className="text-[9px] text-purple-600 font-medium mb-0.5">Preço Médio</p>
                      <p className="text-sm font-bold text-purple-700">
                        R$ {formatNumber(produtoSelecionado.estoques.reduce((acc, e) => acc + e.preco_medio, 0) / produtoSelecionado.estoques.length)}
                      </p>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                      <p className="text-[9px] text-slate-500 font-medium mb-0.5">Média 3m</p>
                      <p className="text-base font-bold text-slate-900">{formatNumber(produtoSelecionado.estatisticas.media_vendas_3_meses)}</p>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                      <p className="text-[9px] text-slate-500 font-medium mb-0.5">Média 6m</p>
                      <p className="text-base font-bold text-slate-900">{formatNumber(produtoSelecionado.estatisticas.media_vendas_6_meses)}</p>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded">
                      <p className="text-[9px] text-slate-500 font-medium mb-0.5">Média 12m</p>
                      <p className="text-base font-bold text-slate-900">{formatNumber(produtoSelecionado.estatisticas.media_vendas_12_meses)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                  {/* Gráfico: Entradas vs Vendas */}
                  <div className="p-2 border border-border rounded lg:col-span-2 hover:shadow-sm transition-shadow duration-200">
                    <h4 className="text-[10px] font-semibold text-slate-900 mb-1.5">Histórico: Entradas vs Vendas (12 meses)</h4>
                    <ResponsiveContainer width="100%" height={140}>
                      <ComposedChart data={prepararDadosGrafico(produtoDetalhesCompleto?.['90'] || produtoSelecionado)} barGap={2} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="mes" tick={{ fontSize: 8 }} />
                        <YAxis tick={{ fontSize: 8 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '10px' }}
                          formatter={(value) => formatNumber(value as number)}
                        />
                        <Legend wrapperStyle={{ fontSize: '9px' }} />
                        <Bar dataKey="entradas" fill="#3b82f6" name="Entradas" radius={[2, 2, 0, 0]} maxBarSize={20} />
                        <Bar dataKey="vendas" fill="#ef4444" name="Vendas" radius={[2, 2, 0, 0]} maxBarSize={20} />
                        <Line type="monotone" dataKey="vendas" stroke="#dc2626" strokeWidth={1.5} dot={false} name="Tendência" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Card: Indicadores */}
                  <div className="p-2 border border-border rounded hover:shadow-sm transition-shadow duration-200">
                    <h4 className="text-[10px] font-semibold text-slate-900 mb-1.5 flex items-center gap-1">
                      <FiAlertCircle className="text-warning text-xs" />
                      Indicadores
                    </h4>
                    <div className="space-y-2">
                      <div className="p-1.5 bg-slate-50 rounded">
                        <p className="text-[9px] text-slate-500 mb-0.5">Vendas (30d)</p>
                        <p className="text-sm font-bold text-success">
                          {formatNumber(produtoSelecionado.vendas.reduce((acc, v) => acc + v.total_vendas, 0))}
                        </p>
                      </div>
                      <div className="p-1.5 bg-slate-50 rounded">
                        <p className="text-[9px] text-slate-500 mb-0.5">Valor Estoque</p>
                        <p className="text-sm font-bold text-slate-900">
                          R$ {formatNumber(
                            produtoSelecionado.estoques.reduce((acc, e) => acc + (e.estoque * e.preco_custo), 0)
                          )}
                        </p>
                      </div>
                      <div className="p-1.5 bg-slate-50 rounded">
                        <p className="text-[9px] text-slate-500 mb-0.5">Nível Estoque</p>
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                            <div 
                              className="bg-accent rounded-full h-1.5" 
                              style={{ 
                                width: `${Math.min(100, (produtoSelecionado.estatisticas.estoque_disponivel / (produtoSelecionado.estatisticas.estoque_total || 1)) * 100)}%` 
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-700">
                            {Math.round((produtoSelecionado.estatisticas.estoque_disponivel / (produtoSelecionado.estatisticas.estoque_total || 1)) * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                  {/* Card: Estoque por Filial */}
                  <div className="p-2 border border-border rounded hover:shadow-sm transition-shadow duration-200">
                    <h4 className="text-[10px] font-semibold text-slate-900 mb-1.5">Estoque por Filial</h4>
                    <div className="flex items-end gap-2 min-h-[90px]">
                      {FILIAIS.map(filial => {
                        const estoque = produtoSelecionado.estoques.find(e => e.cod_filial === filial.cod)
                        const qtd = estoque?.estoque || 0
                        const maxEstoque = Math.max(...produtoSelecionado.estoques.map(e => e.estoque), 1)
                        const percentual = Math.min(100, (qtd / maxEstoque) * 100)
                        const altura = qtd === 0 ? 4 : Math.max(8, percentual)

                        return (
                          <div key={filial.cod} className="flex-1 flex flex-col items-center group cursor-pointer">
                            <div className="text-xs font-bold text-slate-700 mb-1 group-hover:text-accent transition-colors duration-200">{formatNumber(qtd)}</div>
                            <div className="w-5 bg-slate-100 rounded overflow-hidden h-16 flex items-end border border-slate-200">
                              <div
                                className="w-full bg-accent rounded-sm transition-all duration-300 ease-out group-hover:bg-accent-hover"
                                style={{ 
                                  height: `${altura}%`,
                                  animation: 'growUp 0.5s ease-out'
                                }}
                              />
                            </div>
                            <div className="mt-1 text-[9px] font-medium text-slate-500 text-center group-hover:text-slate-700 transition-colors duration-200">{filial.nome}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Card: Vendas por Filial */}
                  <div className="p-2 border border-border rounded hover:shadow-sm transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-[10px] font-semibold text-slate-900">Vendas por Filial</h4>
                      <div className="flex items-center gap-0.5 bg-surface border border-border rounded p-0.5">
                        <button
                          onClick={() => setPeriodoDetalhes('30')}
                          className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                            periodoDetalhes === '30' 
                              ? 'bg-accent text-white' 
                              : 'text-slate-600 hover:bg-background-subtle'
                          }`}
                        >
                          30d
                        </button>
                        <button
                          onClick={() => setPeriodoDetalhes('60')}
                          className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                            periodoDetalhes === '60' 
                              ? 'bg-accent text-white' 
                              : 'text-slate-600 hover:bg-background-subtle'
                          }`}
                        >
                          60d
                        </button>
                        <button
                          onClick={() => setPeriodoDetalhes('90')}
                          className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                            periodoDetalhes === '90' 
                              ? 'bg-accent text-white' 
                              : 'text-slate-600 hover:bg-background-subtle'
                          }`}
                        >
                          90d
                        </button>
                      </div>
                    </div>
                    <div className="flex items-end gap-2 min-h-[90px]">
                      {FILIAIS.map(filial => {
                        const venda = produtoSelecionado.vendas.find(v => v.cod_filial === filial.cod)
                        const qtd = venda?.total_vendas || 0
                        const maxVenda = Math.max(...produtoSelecionado.vendas.map(v => v.total_vendas), 1)
                        const percentual = Math.min(100, (qtd / maxVenda) * 100)
                        const altura = qtd === 0 ? 4 : Math.max(8, percentual)

                        return (
                          <div key={filial.cod} className="flex-1 flex flex-col items-center group cursor-pointer">
                            <div className="text-xs font-bold text-slate-700 mb-1 group-hover:text-emerald-600 transition-colors duration-200">{formatNumber(qtd)}</div>
                            <div className="w-5 bg-slate-100 rounded overflow-hidden h-16 flex items-end border border-slate-200">
                              <div
                                className="w-full bg-emerald-500 rounded-sm transition-all duration-300 ease-out group-hover:bg-emerald-600"
                                style={{ 
                                  height: `${altura}%`,
                                  animation: 'growUp 0.5s ease-out'
                                }}
                              />
                            </div>
                            <div className="mt-1 text-[9px] font-medium text-slate-500 text-center group-hover:text-slate-700 transition-colors duration-200">{filial.nome}</div>
                          </div>
                        )
                      })}
                    </div>
                    <div className="mt-1.5 text-[10px] text-slate-600">
                      Total: <span className="font-semibold text-success">
                        {formatNumber(produtoSelecionado.vendas.reduce((acc, v) => acc + v.total_vendas, 0))}
                      </span>
                    </div>
                  </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex justify-end">
              <button
                onClick={() => {
                  setModalAberto(false)
                  setProdutoSelecionado(null)
                }}
                className="btn btn-secondary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Análise de Vendas dos Combinados */}
      {modalAnaliseAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Análise de Vendas - Produtos Combinados
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Comparativo de vendas por filial nos últimos {periodoAnalise} dias
                </p>
              </div>
              <button
                onClick={() => {
                  setModalAnaliseAberto(false)
                  setDadosAnalise(null)
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {/* Filtro de Período */}
            <div className="px-6 py-3 border-b border-border flex items-center gap-2 flex-shrink-0">
              <span className="text-sm text-slate-600">Período:</span>
              <div className="flex items-center gap-1 bg-surface border border-border rounded-md p-1">
                <button
                  onClick={() => setPeriodoAnalise('30')}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    periodoAnalise === '30' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-slate-600 hover:bg-background-subtle'
                  }`}
                >
                  30 dias
                </button>
                <button
                  onClick={() => setPeriodoAnalise('60')}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    periodoAnalise === '60' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-slate-600 hover:bg-background-subtle'
                  }`}
                >
                  60 dias
                </button>
                <button
                  onClick={() => setPeriodoAnalise('90')}
                  className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                    periodoAnalise === '90' 
                      ? 'bg-purple-600 text-white' 
                      : 'text-slate-600 hover:bg-background-subtle'
                  }`}
                >
                  90 dias
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {loadingAnalise ? (
                <div className="flex items-center justify-center py-12">
                  <FiLoader className="animate-spin text-purple-600 text-3xl" />
                </div>
              ) : dadosAnalise && dadosAnalise.length > 0 ? (
                <div className="space-y-6">
                  {/* Tabela de Vendas por Produto e Filial */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="text-left px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200">
                            Produto
                          </th>
                          {FILIAIS.map(filial => (
                            <th key={filial.cod} className="text-center px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200">
                              {filial.nome}
                            </th>
                          ))}
                          <th className="text-center px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 bg-purple-50">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {dadosAnalise.map((produto: any, idx: number) => {
                          const vendasPorFilial: Map<string, number> = new Map<string, number>(
                            produto.vendas_por_filial.map((v: any) => [v.cod_filial as string, Number(v.total_vendas) || 0])
                          )
                          const totalProduto = produto.vendas_por_filial.reduce(
                            (acc: number, v: any) => acc + (Number(v.total_vendas) || 0), 0
                          )
                          
                          return (
                            <tr key={produto.cod_produto} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="px-3 py-2 text-xs border border-slate-200">
                                <div className="font-medium text-slate-900">{produto.cod_produto}</div>
                                <div className="text-slate-500 text-[10px] truncate max-w-xs">{produto.descricao}</div>
                              </td>
                              {FILIAIS.map(filial => {
                                const vendas = vendasPorFilial.get(filial.cod) || 0
                                const valoresVendas: number[] = Array.from(vendasPorFilial.values())
                                const maxVendas = valoresVendas.length > 0 ? Math.max(...valoresVendas) : 0
                                const isMax = vendas > 0 && vendas === maxVendas
                                
                                return (
                                  <td 
                                    key={filial.cod} 
                                    className={`text-center px-3 py-2 text-xs border border-slate-200 ${
                                      isMax ? 'bg-green-50 font-bold text-green-700' : 'text-slate-600'
                                    }`}
                                  >
                                    {vendas > 0 ? formatNumber(vendas) : '-'}
                                  </td>
                                )
                              })}
                              <td className="text-center px-3 py-2 text-xs font-bold border border-slate-200 bg-purple-50 text-purple-700">
                                {totalProduto > 0 ? formatNumber(totalProduto) : '-'}
                              </td>
                            </tr>
                          )
                        })}
                        {/* Linha de Total */}
                        <tr className="bg-slate-100 font-bold">
                          <td className="px-3 py-2 text-xs border border-slate-200">
                            TOTAL GERAL
                          </td>
                          {FILIAIS.map(filial => {
                            const totalFilial = dadosAnalise.reduce((acc: number, produto: any) => {
                              const venda = produto.vendas_por_filial.find((v: any) => v.cod_filial === filial.cod)
                              return acc + parseFloat(venda?.total_vendas || 0)
                            }, 0)
                            
                            return (
                              <td key={filial.cod} className="text-center px-3 py-2 text-xs border border-slate-200 text-slate-900">
                                {totalFilial > 0 ? formatNumber(totalFilial) : '-'}
                              </td>
                            )
                          })}
                          <td className="text-center px-3 py-2 text-xs border border-slate-200 bg-purple-100 text-purple-900">
                            {formatNumber(
                              dadosAnalise.reduce((acc: number, produto: any) => 
                                acc + produto.vendas_por_filial.reduce((sum: number, v: any) => 
                                  sum + parseFloat(v.total_vendas || 0), 0
                                ), 0
                              )
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Legenda */}
                  <div className="flex items-center gap-4 text-xs text-slate-600 bg-slate-50 p-3 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                      <span>Maior venda do produto</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-purple-50 border border-purple-200 rounded"></div>
                      <span>Total</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  Nenhuma venda registrada no período selecionado
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex justify-end flex-shrink-0">
              <button
                onClick={() => {
                  setModalAnaliseAberto(false)
                  setDadosAnalise(null)
                }}
                className="btn btn-secondary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
