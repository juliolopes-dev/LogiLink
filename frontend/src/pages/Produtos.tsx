import { useState, useEffect } from 'react'
import { FiSearch } from 'react-icons/fi'

interface EstoqueFilial {
  cod_filial: string
  estoque: number
  estoque_minimo: number
  preco_custo: number
  preco_medio: number
}

interface Produto {
  cod_produto: string
  descricao: string
  codigo_barras: string | null
  cod_grupo: string | null
  grupo_descricao: string
  ativo: string | null
  produto_bloqueado: string | null
  estoques: EstoqueFilial[] | null
}

interface Grupo {
  cod_grupo: string
  descricao: string | null
}

interface Filial {
  cod_filial: string
  nome: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

const FILIAIS_CORES: Record<string, string> = {
  '00': 'bg-filial-00',
  '01': 'bg-filial-01',
  '02': 'bg-filial-02',
  '03': 'bg-filial-03',
  '04': 'bg-filial-04',
  '05': 'bg-filial-05',
  '06': 'bg-filial-06',
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(value))
}

function getStatusEstoque(estoque: number, minimo: number): 'ok' | 'warning' | 'danger' {
  if (estoque <= 0) return 'danger'
  if (estoque <= minimo) return 'warning'
  return 'ok'
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [filiais, setFiliais] = useState<Filial[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)

  const [busca, setBusca] = useState('')
  const [filialFiltro, setFilialFiltro] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'zerado' | 'abaixo_minimo' | 'ok'>('todos')
  const [page, setPage] = useState(1)

  const [buscaDebounce, setBuscaDebounce] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounce(busca)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [busca])

  useEffect(() => {
    Promise.all([
      fetch('/api/grupos').then(res => res.json()),
      fetch('/api/filiais').then(res => res.json())
    ]).then(([gruposRes, filiaisRes]) => {
      if (gruposRes.success) setGrupos(gruposRes.data)
      if (filiaisRes.success) setFiliais(filiaisRes.data)
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '30',
      busca: buscaDebounce,
      filial: filialFiltro,
      grupo: grupoFiltro,
      status: statusFiltro
    })

    fetch(`/api/produtos?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setProdutos(data.data)
          setPagination(data.pagination)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [page, buscaDebounce, filialFiltro, grupoFiltro, statusFiltro])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Filtros - Fixo */}
      <div className="bg-white border-b border-border px-4 py-3 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Busca */}
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, descrição ou código de barras..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input w-full pl-10"
            />
          </div>

          {/* Filtro Filial */}
          <select
            value={filialFiltro}
            onChange={(e) => { setFilialFiltro(e.target.value); setPage(1) }}
            className="input min-w-[140px]"
          >
            <option value="">Todas Filiais</option>
            {filiais.map(f => (
              <option key={f.cod_filial} value={f.cod_filial}>{f.nome}</option>
            ))}
          </select>

          {/* Filtro Grupo */}
          <select
            value={grupoFiltro}
            onChange={(e) => { setGrupoFiltro(e.target.value); setPage(1) }}
            className="input min-w-[160px]"
          >
            <option value="">Todos Grupos</option>
            {grupos.map(g => (
              <option key={g.cod_grupo} value={g.cod_grupo}>{g.descricao || g.cod_grupo}</option>
            ))}
          </select>

          {/* Filtro Status */}
          <select
            value={statusFiltro}
            onChange={(e) => { setStatusFiltro(e.target.value as any); setPage(1) }}
            className="input min-w-[140px]"
          >
            <option value="todos">Todos Status</option>
            <option value="zerado">Estoque Zerado</option>
            <option value="abaixo_minimo">Abaixo Mínimo</option>
            <option value="ok">Estoque OK</option>
          </select>
        </div>
      </div>

      {/* Tabela - Scrollável */}
      <div className="flex-1 overflow-auto">
        <div className="card m-4">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Carregando...</div>
          ) : produtos.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Nenhum produto encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Código</th>
                    <th className="table-header">Descrição</th>
                    <th className="table-header">Grupo</th>
                    {filiais.map(f => (
                      <th key={f.cod_filial} className="table-header text-center min-w-[80px]">
                        <div className="flex items-center justify-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${FILIAIS_CORES[f.cod_filial]}`}></span>
                          {f.nome.substring(0, 3)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {produtos.map((produto) => (
                    <tr key={produto.cod_produto} className="hover:bg-background-subtle transition-colors">
                      <td className="table-cell">
                        <span className="font-mono text-xs text-slate-600">{produto.cod_produto}</span>
                      </td>
                      <td className="table-cell">
                        <div>
                          <span className="font-medium text-slate-900 text-sm">{produto.descricao}</span>
                          {produto.codigo_barras && (
                            <span className="block text-xs text-slate-400">{produto.codigo_barras}</span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-slate-600">{produto.grupo_descricao}</span>
                      </td>
                      {filiais.map(f => {
                        const estoque = produto.estoques?.find(e => e.cod_filial === f.cod_filial)
                        const qtd = estoque?.estoque || 0
                        const min = estoque?.estoque_minimo || 0
                        const status = getStatusEstoque(qtd, min)
                        
                        return (
                          <td key={f.cod_filial} className="table-cell text-center">
                            <span className={`text-sm font-medium ${
                              status === 'danger' ? 'text-danger' :
                              status === 'warning' ? 'text-warning' :
                              'text-slate-700'
                            }`}>
                              {formatNumber(qtd)}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Paginação - Fixo no rodapé */}
      {pagination && pagination.totalPages > 1 && (
        <div className="bg-white border-t border-border px-6 py-2 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={!pagination.hasPrev}
            className="px-3 py-1.5 text-xs font-medium rounded border border-border hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="text-xs text-slate-600">
            Página {pagination.page} de {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!pagination.hasNext}
            className="px-3 py-1.5 text-xs font-medium rounded border border-border hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  )
}
