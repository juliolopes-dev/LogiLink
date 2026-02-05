import { useState, useEffect } from 'react'
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiCheck, FiAlertCircle, FiPackage, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

interface GrupoCombinado {
  id: number
  cod_grupo: string
  descricao: string
  ativo: boolean
  observacao: string | null
  total_produtos: number
  created_at: string
  updated_at: string
}

interface Produto {
  cod_produto: string
  descricao: string
  referencia_fabricante: string
  estoque_total?: number
  estoque_disponivel?: number
  grupos?: Array<{
    cod_grupo: string
    descricao: string
    ativo: boolean
  }>
}

export default function GerenciarCombinados() {
  const [grupos, setGrupos] = useState<GrupoCombinado[]>([])
  const [grupoSelecionado, setGrupoSelecionado] = useState<GrupoCombinado | null>(null)
  const [produtosGrupo, setProdutosGrupo] = useState<Produto[]>([])
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<Produto[]>([])
  
  const [loading, setLoading] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalProdutos, setModalProdutos] = useState(false)
  const [modoEdicao, setModoEdicao] = useState(false)
  
  const [buscaProduto, setBuscaProduto] = useState('')
  const [buscaGrupo, setBuscaGrupo] = useState('')
  const [resultadosBuscaProduto, setResultadosBuscaProduto] = useState<Produto[]>([])
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [filtroAtivo, setFiltroAtivo] = useState<'todos' | 'ativos' | 'inativos'>('ativos')
  
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  const [formGrupo, setFormGrupo] = useState({
    cod_grupo: '',
    descricao: '',
    observacao: ''
  })

  const API_URL = import.meta.env.VITE_API_URL || '/api'

  useEffect(() => {
    setPage(1)
    carregarGrupos(1)
  }, [filtroAtivo])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      carregarGrupos(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [buscaGrupo])

  const carregarGrupos = async (pageNum: number = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroAtivo === 'ativos') params.append('ativo', 'true')
      if (filtroAtivo === 'inativos') params.append('ativo', 'false')
      if (buscaGrupo) params.append('busca', buscaGrupo)
      params.append('page', pageNum.toString())
      params.append('limit', '50')

      const response = await fetch(`${API_URL}/combinados?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setGrupos(data.data)
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages)
          setTotal(data.pagination.total)
          setPage(data.pagination.page)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error)
      alert('Erro ao carregar grupos combinados')
    } finally {
      setLoading(false)
    }
  }

  const carregarProdutosGrupo = async (codGrupo: string) => {
    try {
      const response = await fetch(`${API_URL}/combinados/${codGrupo}/produtos`)
      const data = await response.json()
      
      if (data.success) {
        setProdutosGrupo(data.data)
      }
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    }
  }

  const buscarProdutosDisponiveis = async (codGrupo: string, busca: string) => {
    try {
      const params = new URLSearchParams()
      if (busca) params.append('busca', busca)

      const response = await fetch(`${API_URL}/combinados/${codGrupo}/produtos-disponiveis?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setProdutosDisponiveis(data.data)
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
    }
  }

  const abrirModalNovo = async () => {
    // Buscar o próximo código de grupo
    try {
      const response = await fetch(`${API_URL}/combinados/proximo-codigo`)
      const data = await response.json()
      
      if (data.success && data.proximo_codigo) {
        setFormGrupo({ cod_grupo: data.proximo_codigo, descricao: '', observacao: '' })
      } else {
        setFormGrupo({ cod_grupo: 'SYSCOMB1', descricao: '', observacao: '' })
      }
    } catch (error) {
      console.error('Erro ao gerar próximo código:', error)
      setFormGrupo({ cod_grupo: 'SYSCOMB1', descricao: '', observacao: '' })
    }
    
    setModoEdicao(false)
    setModalAberto(true)
  }

  const abrirModalEdicao = (grupo: GrupoCombinado) => {
    setFormGrupo({
      cod_grupo: grupo.cod_grupo,
      descricao: grupo.descricao,
      observacao: grupo.observacao || ''
    })
    setGrupoSelecionado(grupo)
    setModoEdicao(true)
    setModalAberto(true)
  }

  const salvarGrupo = async () => {
    if (!formGrupo.cod_grupo || !formGrupo.descricao) {
      alert('Código e descrição são obrigatórios')
      return
    }

    setLoading(true)
    try {
      const url = modoEdicao 
        ? `${API_URL}/combinados/${formGrupo.cod_grupo}`
        : `${API_URL}/combinados`
      
      const method = modoEdicao ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formGrupo)
      })

      const data = await response.json()

      if (data.success) {
        alert(modoEdicao ? 'Grupo atualizado com sucesso!' : 'Grupo criado com sucesso!')
        setModalAberto(false)
        carregarGrupos()
      } else {
        alert(data.error || 'Erro ao salvar grupo')
      }
    } catch (error) {
      console.error('Erro ao salvar grupo:', error)
      alert('Erro ao salvar grupo')
    } finally {
      setLoading(false)
    }
  }

  const toggleAtivo = async (grupo: GrupoCombinado) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/combinados/${grupo.cod_grupo}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !grupo.ativo })
      })

      const data = await response.json()

      if (data.success) {
        carregarGrupos()
      } else {
        alert(data.error || 'Erro ao atualizar status')
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status')
    } finally {
      setLoading(false)
    }
  }

  const deletarGrupo = async (grupo: GrupoCombinado) => {
    if (!confirm(`Tem certeza que deseja deletar o grupo "${grupo.descricao}"?\nTodos os produtos serão removidos do grupo.`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/combinados/${grupo.cod_grupo}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        alert('Grupo deletado com sucesso!')
        carregarGrupos()
      } else {
        alert(data.error || 'Erro ao deletar grupo')
      }
    } catch (error) {
      console.error('Erro ao deletar grupo:', error)
      alert('Erro ao deletar grupo')
    } finally {
      setLoading(false)
    }
  }

  const abrirModalProdutos = async (grupo: GrupoCombinado) => {
    setGrupoSelecionado(grupo)
    await carregarProdutosGrupo(grupo.cod_grupo)
    await buscarProdutosDisponiveis(grupo.cod_grupo, '')
    setModalProdutos(true)
  }

  const adicionarProduto = async (codProduto: string) => {
    if (!grupoSelecionado) return

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/combinados/${grupoSelecionado.cod_grupo}/produtos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cod_produto: codProduto })
      })

      const data = await response.json()

      if (data.success) {
        await carregarProdutosGrupo(grupoSelecionado.cod_grupo)
        await buscarProdutosDisponiveis(grupoSelecionado.cod_grupo, buscaProduto)
        carregarGrupos()
      } else {
        alert(data.error || 'Erro ao adicionar produto')
      }
    } catch (error) {
      console.error('Erro ao adicionar produto:', error)
      alert('Erro ao adicionar produto')
    } finally {
      setLoading(false)
    }
  }

  const removerProduto = async (codProduto: string) => {
    if (!grupoSelecionado) return

    if (!confirm('Tem certeza que deseja remover este produto do grupo?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `${API_URL}/combinados/${grupoSelecionado.cod_grupo}/produtos/${codProduto}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (data.success) {
        await carregarProdutosGrupo(grupoSelecionado.cod_grupo)
        await buscarProdutosDisponiveis(grupoSelecionado.cod_grupo, buscaProduto)
        carregarGrupos()
      } else {
        alert(data.error || 'Erro ao remover produto')
      }
    } catch (error) {
      console.error('Erro ao remover produto:', error)
      alert('Erro ao remover produto')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (grupoSelecionado && modalProdutos) {
      const timer = setTimeout(() => {
        buscarProdutosDisponiveis(grupoSelecionado.cod_grupo, buscaProduto)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [buscaProduto])

  // Buscar produtos por código/referência na barra de busca principal
  const buscarProdutoPorCodigo = async (termo: string) => {
    if (!termo || termo.trim().length < 2) {
      setResultadosBuscaProduto([])
      setMostrarResultados(false)
      return
    }

    try {
      const response = await fetch(`${API_URL}/combinados/buscar-produto?busca=${encodeURIComponent(termo)}`)
      const data = await response.json()

      if (data.success) {
        setResultadosBuscaProduto(data.data)
        setMostrarResultados(true)
      }
    } catch (error) {
      console.error('Erro ao buscar produto:', error)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      buscarProdutoPorCodigo(buscaGrupo)
    }, 500)
    return () => clearTimeout(timer)
  }, [buscaGrupo])

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Filtros e Busca - Fixo */}
      <div className="px-4 py-3 border-b border-border bg-surface flex-shrink-0">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltroAtivo('todos')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                filtroAtivo === 'todos'
                  ? 'bg-accent text-white'
                  : 'text-slate-600 hover:bg-background-subtle'
              }`}
            >
              Todos ({total})
            </button>
            <button
              onClick={() => setFiltroAtivo('ativos')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                filtroAtivo === 'ativos'
                  ? 'bg-accent text-white'
                  : 'text-slate-600 hover:bg-background-subtle'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setFiltroAtivo('inativos')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                filtroAtivo === 'inativos'
                  ? 'bg-accent text-white'
                  : 'text-slate-600 hover:bg-background-subtle'
              }`}
            >
              Inativos
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 min-w-[300px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar produto por código, referência ou descrição..."
                value={buscaGrupo}
                onChange={e => setBuscaGrupo(e.target.value)}
                onFocus={() => buscaGrupo.length >= 2 && setMostrarResultados(true)}
                onBlur={() => setTimeout(() => setMostrarResultados(false), 200)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
              />
              
              {/* Dropdown de resultados */}
              {mostrarResultados && resultadosBuscaProduto.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-md shadow-lg max-h-96 overflow-y-auto z-50">
                  {resultadosBuscaProduto.map(produto => (
                    <div
                      key={produto.cod_produto}
                      className="p-3 hover:bg-background-subtle border-b border-border-subtle last:border-b-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-slate-900">{produto.cod_produto}</span>
                            <span className="text-xs text-slate-500">|</span>
                            <span className="text-xs text-slate-600">{produto.referencia_fabricante}</span>
                          </div>
                          <p className="text-xs text-slate-700 mb-2">{produto.descricao}</p>
                          
                          {produto.grupos && produto.grupos.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {produto.grupos.map((grupo, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded ${
                                    grupo.ativo
                                      ? 'bg-accent-subtle text-accent-text'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {grupo.cod_grupo} - {grupo.descricao}
                                  {!grupo.ativo && ' (Inativo)'}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Não está em nenhum grupo</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button 
              className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-md hover:bg-accent-hover transition-colors text-xs font-medium whitespace-nowrap"
              onClick={abrirModalNovo}
            >
              <FiPlus /> Novo Grupo
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-500">Carregando...</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {!loading && grupos.map(grupo => (
          <div key={grupo.id} className={`card p-3 ${
            !grupo.ativo ? 'opacity-60 bg-slate-50' : ''
          }`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 truncate">{grupo.descricao}</h3>
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-accent-subtle text-accent rounded">
                  {grupo.cod_grupo}
                </span>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => toggleAtivo(grupo)}
                  title={grupo.ativo ? 'Desativar' : 'Ativar'}
                  className="p-1.5 hover:bg-background-subtle rounded transition-colors text-slate-600"
                >
                  {grupo.ativo ? <FiCheck size={16} /> : <FiX size={16} />}
                </button>
                <button
                  onClick={() => abrirModalEdicao(grupo)}
                  title="Editar"
                  className="p-1.5 hover:bg-background-subtle rounded transition-colors text-slate-600"
                >
                  <FiEdit2 size={16} />
                </button>
                <button
                  onClick={() => deletarGrupo(grupo)}
                  title="Deletar"
                  className="p-1.5 hover:bg-danger-subtle rounded transition-colors text-danger"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </div>

            {grupo.observacao && (
              <p className="text-sm text-slate-600 mb-3 line-clamp-2">{grupo.observacao}</p>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="flex items-center gap-1.5 text-sm text-slate-600">
                <FiPackage size={14} />
                {grupo.total_produtos} produto{grupo.total_produtos !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => abrirModalProdutos(grupo)}
                className="px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent-subtle rounded transition-colors"
              >
                Gerenciar
              </button>
            </div>
          </div>
        ))}

        {!loading && grupos.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <FiAlertCircle size={48} className="text-slate-300 mb-4" />
            <p className="text-slate-600 mb-4">Nenhum grupo combinado encontrado</p>
            <button 
              onClick={abrirModalNovo}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-md hover:bg-accent/90 transition-colors text-sm font-medium"
            >
              <FiPlus /> Criar Primeiro Grupo
            </button>
          </div>
        )}
        </div>

      </div>

      {/* Paginação - Fixo no rodapé */}
      {totalPages > 1 && (
        <div className="bg-white border-t border-border px-6 py-2 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => carregarGrupos(page - 1)}
            disabled={page === 1}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-surface border border-border rounded hover:bg-background-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiChevronLeft size={14} /> Anterior
          </button>
          <span className="text-xs text-slate-600 font-medium">
            Página {page} de {totalPages} <span className="text-slate-400">({total} grupos)</span>
          </span>
          <button
            onClick={() => carregarGrupos(page + 1)}
            disabled={page === totalPages}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-surface border border-border rounded hover:bg-background-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próxima <FiChevronRight size={14} />
          </button>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModalAberto(false)}>
          <div className="bg-surface rounded-lg w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{modoEdicao ? 'Editar Grupo' : 'Novo Grupo'}</h2>
              <button onClick={() => setModalAberto(false)} className="p-1 hover:bg-background-subtle rounded transition-colors">
                <FiX size={20} className="text-slate-600" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Código do Grupo *</label>
                <input
                  type="text"
                  value={formGrupo.cod_grupo}
                  onChange={e => setFormGrupo({ ...formGrupo, cod_grupo: e.target.value })}
                  disabled={modoEdicao}
                  placeholder="Ex: COMB001"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição *</label>
                <input
                  type="text"
                  value={formGrupo.descricao}
                  onChange={e => setFormGrupo({ ...formGrupo, descricao: e.target.value })}
                  placeholder="Ex: Alternadores 12V"
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observação</label>
                <textarea
                  value={formGrupo.observacao}
                  onChange={e => setFormGrupo({ ...formGrupo, observacao: e.target.value })}
                  placeholder="Informações adicionais sobre o grupo"
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button 
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-surface border border-border rounded-md hover:bg-background-subtle transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={salvarGrupo} 
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-accent rounded-md hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalProdutos && grupoSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModalProdutos(false)}>
          <div className="bg-surface rounded-lg w-full max-w-5xl max-h-[90vh] shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Produtos do Grupo</h2>
                <p className="text-sm text-slate-500 mt-0.5">{grupoSelecionado.descricao}</p>
              </div>
              <button onClick={() => setModalProdutos(false)} className="p-1 hover:bg-background-subtle rounded transition-colors">
                <FiX size={20} className="text-slate-600" />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-900">Produtos no Grupo ({produtosGrupo.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto border border-border rounded-lg p-2">
                  {produtosGrupo.map(produto => (
                    <div key={produto.cod_produto} className="flex items-center justify-between p-3 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-accent">{produto.cod_produto}</div>
                        <div className="text-sm text-slate-700 truncate">{produto.descricao}</div>
                        <div className="text-xs text-slate-500">Ref: {produto.referencia_fabricante}</div>
                      </div>
                      <button
                        onClick={() => removerProduto(produto.cod_produto)}
                        title="Remover"
                        className="p-1.5 hover:bg-danger-subtle rounded transition-colors text-danger ml-2"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {produtosGrupo.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      Nenhum produto adicionado ainda
                    </div>
                  )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-900">Adicionar Produtos</h3>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Buscar por código, descrição ou referência..."
                      value={buscaProduto}
                      onChange={e => setBuscaProduto(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                    />
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto border border-border rounded-lg p-2">
                  {produtosDisponiveis.map(produto => (
                    <div key={produto.cod_produto} className="flex items-center justify-between p-3 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-accent">{produto.cod_produto}</div>
                        <div className="text-sm text-slate-700 truncate">{produto.descricao}</div>
                        <div className="text-xs text-slate-500">Ref: {produto.referencia_fabricante} | Estoque: {produto.estoque_disponivel}</div>
                      </div>
                      <button
                        onClick={() => adicionarProduto(produto.cod_produto)}
                        title="Adicionar"
                        className="p-1.5 hover:bg-success-subtle rounded transition-colors text-success ml-2"
                      >
                        <FiPlus size={16} />
                      </button>
                    </div>
                  ))}
                  {produtosDisponiveis.length === 0 && buscaProduto && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      Nenhum produto encontrado
                    </div>
                  )}
                  {produtosDisponiveis.length === 0 && !buscaProduto && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      Digite para buscar produtos
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
