import { useState, useEffect } from 'react'
import { FiPackage, FiTruck, FiAlertTriangle, FiAlertCircle } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts'
import Sidebar from './components/Sidebar'
import Tooltip from './components/Tooltip'
import SKUs from './pages/SKUs'
import AnaliseDRP from './pages/AnaliseDRP'
import GerenciarCombinados from './pages/GerenciarCombinados'
import Configuracoes from './pages/Configuracoes'
import EstoqueMinimoConfig from './pages/EstoqueMinimoConfig'
import NotificationManager from './components/NotificationManager'

interface EstoqueResumo {
  cod_filial: string
  total_skus: string
  estoque_total: string
  skus_zerados: string
  skus_abaixo_minimo: string
}

interface TotaisGerais {
  total_skus_unicos: string
  total_zerados: string
  total_abaixo_minimo: string
}

interface ApiResponse {
  success: boolean
  data?: EstoqueResumo[]
  totais?: TotaisGerais
  error?: string
}

interface DadosComprasVendas {
  mes: string
  mes_label: string
  total_vendas: number
  valor_vendas: number
  total_compras: number
  valor_compras: number
}

const FILIAIS: Record<string, { nome: string; cor: string }> = {
  '00': { nome: 'Petrolina', cor: 'bg-filial-00' },
  '01': { nome: 'Juazeiro', cor: 'bg-filial-01' },
  '02': { nome: 'Salgueiro', cor: 'bg-filial-02' },
  '03': { nome: 'Garantia', cor: 'bg-filial-03' }, // Apenas garantias (não entra no DRP)
  '04': { nome: 'CD', cor: 'bg-filial-04' }, // Centro de Distribuição (sem faturamento)
  '05': { nome: 'Bonfim', cor: 'bg-filial-05' },
  '06': { nome: 'Picos', cor: 'bg-filial-06' },
}

function formatNumber(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('pt-BR').format(Math.round(num))
}

type Page = 'dashboard' | 'produtos' | 'drp' | 'combinados' | 'sugestoes' | 'relatorios' | 'configuracoes' | 'estoque-minimo'

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [estoqueResumo, setEstoqueResumo] = useState<EstoqueResumo[]>([])
  const [totaisGerais, setTotaisGerais] = useState<TotaisGerais | null>(null)
  const [dadosGrafico, setDadosGrafico] = useState<DadosComprasVendas[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroAtivo, setFiltroAtivo] = useState<'S' | 'N' | 'todos'>('S')

  useEffect(() => {
    setLoading(true)
    const ativoParam = filtroAtivo === 'todos' ? '?ativo=todos' : `?ativo=${filtroAtivo}`
    
    Promise.all([
      fetch(`/api/estoque/resumo${ativoParam}`).then(res => res.json()),
      fetch('/api/dashboard/compras-vendas').then(res => res.json())
    ])
      .then(([estoque, grafico]: [ApiResponse, any]) => {
        if (estoque.success && estoque.data) {
          setEstoqueResumo(estoque.data)
        }
        if (estoque.totais) {
          console.log('Totais recebidos:', estoque.totais)
          setTotaisGerais(estoque.totais)
        }
        if (grafico.success && grafico.data) {
          setDadosGrafico(grafico.data)
        }
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [filtroAtivo])

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 ml-64 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-surface border-b border-border flex-shrink-0">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {currentPage === 'dashboard' && 'Dashboard'}
                {currentPage === 'produtos' && 'SKUs'}
                {currentPage === 'drp' && 'Análise DRP'}
                {currentPage === 'combinados' && 'Produtos Combinados'}
                {currentPage === 'sugestoes' && 'Sugestões de Compra'}
                {currentPage === 'relatorios' && 'Relatórios'}
                {currentPage === 'configuracoes' && 'Configurações'}
                {currentPage === 'estoque-minimo' && 'Estoque Mínimo'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <NotificationManager />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={currentPage === 'produtos' || currentPage === 'drp' || currentPage === 'combinados' || currentPage === 'configuracoes' || currentPage === 'estoque-minimo' ? 'flex-1 overflow-hidden' : 'px-4 py-4 flex-1 overflow-auto'}>
        {currentPage === 'produtos' ? (
          <SKUs />
        ) : currentPage === 'drp' ? (
          <AnaliseDRP />
        ) : currentPage === 'combinados' ? (
          <GerenciarCombinados />
        ) : currentPage === 'configuracoes' ? (
          <div className="px-4 py-4 h-full overflow-hidden">
            <Configuracoes />
          </div>
        ) : currentPage === 'estoque-minimo' ? (
          <div className="h-full overflow-auto">
            <EstoqueMinimoConfig />
          </div>
        ) : (
          <>
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
          <div className="card">
            <div className="flex items-center gap-2.5">
              <div className="bg-accent-subtle p-2 rounded-md">
                <FiPackage className="text-accent text-base" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Total SKUs</p>
                  <Tooltip content="Quantidade total de produtos cadastrados no sistema" />
                </div>
                <p className="text-xl font-semibold text-slate-900 whitespace-nowrap">
                  {loading ? '--' : formatNumber(totaisGerais?.total_skus_unicos || '0')}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2.5">
              <div className="bg-success-subtle p-2 rounded-md">
                <FiTruck className="text-success text-base" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Filiais Ativas</p>
                  <Tooltip content="Número de filiais com estoque cadastrado" />
                </div>
                <p className="text-xl font-semibold text-slate-900">{estoqueResumo.length || 7}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2.5">
              <div className="bg-danger-subtle p-2 rounded-md">
                <FiAlertCircle className="text-danger text-base" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Estoque Zerado</p>
                  <Tooltip content="Produtos sem estoque em nenhuma filial" />
                </div>
                <p className="text-xl font-semibold text-danger">
                  {loading ? '--' : formatNumber(totaisGerais?.total_zerados || '0')}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-2.5">
              <div className="bg-warning-subtle p-2 rounded-md">
                <FiAlertTriangle className="text-warning text-base" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Abaixo Mínimo</p>
                  <Tooltip content="Produtos com estoque abaixo do mínimo configurado" />
                </div>
                <p className="text-xl font-semibold text-warning">
                  {loading ? '--' : formatNumber(totaisGerais?.total_abaixo_minimo || '0')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de Compras e Vendas */}
        <div className="card mb-3">
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-slate-900">Compras e Vendas - Últimos 6 Meses</h2>
            <p className="text-xs text-slate-500 mt-0.5">Comparativo de valores de compras e vendas por mês (R$)</p>
          </div>
          
          {loading ? (
            <div className="py-12 text-center text-slate-500">Carregando dados...</div>
          ) : dadosGrafico.length === 0 ? (
            <div className="py-12 text-center text-slate-500">Nenhum dado disponível</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={dadosGrafico} margin={{ top: 5, right: 20, left: 10, bottom: 5 }} barSize={35}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="mes_label" 
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#d1d5db' }}
                />
                <YAxis 
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#d1d5db' }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number | undefined) => value ? formatNumber(value) : '0'}
                  labelStyle={{ color: '#252525', fontWeight: 600 }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="rect"
                />
                <Bar 
                  dataKey="total_compras" 
                  name="Compras" 
                  fill="#f5ad00" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="total_vendas" 
                  name="Vendas" 
                  fill="#252525" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tabela de Estoque por Filial */}
        <div className="card p-0 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Estoque por Filial</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Produtos:</span>
              <div className="flex items-center gap-1 bg-surface border border-border rounded-md p-0.5">
                <button
                  onClick={() => setFiltroAtivo('S')}
                  className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                    filtroAtivo === 'S' 
                      ? 'bg-accent text-white' 
                      : 'text-slate-600 hover:bg-background-subtle'
                  }`}
                >
                  Ativos
                </button>
                <button
                  onClick={() => setFiltroAtivo('N')}
                  className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                    filtroAtivo === 'N' 
                      ? 'bg-accent text-white' 
                      : 'text-slate-600 hover:bg-background-subtle'
                  }`}
                >
                  Inativos
                </button>
                <button
                  onClick={() => setFiltroAtivo('todos')}
                  className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                    filtroAtivo === 'todos' 
                      ? 'bg-accent text-white' 
                      : 'text-slate-600 hover:bg-background-subtle'
                  }`}
                >
                  Todos
                </button>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-slate-500">Carregando dados...</div>
          ) : estoqueResumo.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum dado disponível</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Filial</th>
                    <th className="table-header text-right">
                      <div className="flex items-center justify-end gap-1">
                        SKUs
                        <Tooltip content="Quantidade de produtos diferentes com estoque > 0" />
                      </div>
                    </th>
                    <th className="table-header text-right">
                      <div className="flex items-center justify-end gap-1">
                        Estoque Total
                        <Tooltip content="Soma das quantidades de todos os produtos em estoque" />
                      </div>
                    </th>
                    <th className="table-header text-right">
                      <div className="flex items-center justify-end gap-1">
                        Zerados
                        <Tooltip content="SKUs sem estoque (quantidade = 0)" />
                      </div>
                    </th>
                    <th className="table-header text-right">
                      <div className="flex items-center justify-end gap-1">
                        Abaixo Mínimo
                        <Tooltip content="SKUs com estoque > 0 mas ≤ estoque mínimo" />
                      </div>
                    </th>
                    <th className="table-header text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {estoqueResumo.map((filial) => {
                    const info = FILIAIS[filial.cod_filial] || { nome: `Filial ${filial.cod_filial}`, cor: 'bg-slate-500' }
                    const zerados = parseInt(filial.skus_zerados || '0')
                    const abaixoMinimo = parseInt(filial.skus_abaixo_minimo || '0')
                    const status = zerados > 100 ? 'danger' : abaixoMinimo > 50 ? 'warning' : 'success'
                    
                    return (
                      <tr key={filial.cod_filial} className="hover:bg-background-subtle transition-colors">
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${info.cor}`}></span>
                            <span className="font-medium text-slate-900">{info.nome}</span>
                            <span className="text-slate-400 text-xs">({filial.cod_filial})</span>
                          </div>
                        </td>
                        <td className="table-cell text-right font-medium">
                          {formatNumber(filial.total_skus)}
                        </td>
                        <td className="table-cell text-right">
                          {formatNumber(filial.estoque_total)}
                        </td>
                        <td className="table-cell text-right">
                          <span className={zerados > 0 ? 'text-danger font-medium' : 'text-slate-400'}>
                            {formatNumber(zerados)}
                          </span>
                        </td>
                        <td className="table-cell text-right">
                          <span className={abaixoMinimo > 0 ? 'text-warning font-medium' : 'text-slate-400'}>
                            {formatNumber(abaixoMinimo)}
                          </span>
                        </td>
                        <td className="table-cell text-center">
                          <span className={`badge badge-${status}`}>
                            {status === 'danger' ? 'Crítico' : status === 'warning' ? 'Atenção' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}
      </main>
      </div>
    </div>
  )
}

export default App
