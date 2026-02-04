import { useState, useEffect } from 'react'
import { FiSettings, FiSearch, FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiPackage, FiCheck } from 'react-icons/fi'
import ToastContainer, { ToastMessage } from '../components/ToastContainer'

interface ProdutoConfig {
  cod_produto: string
  descricao: string
  referencia_fabricante: string
  grupo: string
  multiplo_venda: number
  observacao: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

interface ProdutoBusca {
  cod_produto: string
  descricao: string
  referencia_fabricante: string
  grupo_descricao: string
  estoque_cd: string
}

export default function ConfiguracaoProdutos() {
  const [configs, setConfigs] = useState<ProdutoConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  
  // Modal de adicionar/editar
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<ProdutoConfig | null>(null)
  
  // Busca de produto para adicionar
  const [buscaProduto, setBuscaProduto] = useState('')
  const [sugestoesProdutos, setSugestoesProdutos] = useState<ProdutoBusca[]>([])
  const [buscandoProdutos, setBuscandoProdutos] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoBusca | null>(null)
  const [produtosSelecionados, setProdutosSelecionados] = useState<ProdutoBusca[]>([])
  
  // Form
  const [formMultiplo, setFormMultiplo] = useState(1)
  const [formObservacao, setFormObservacao] = useState('')
  const [formAtivo, setFormAtivo] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Edição inline
  const [editandoInline, setEditandoInline] = useState<string | null>(null)
  const [valorInline, setValorInline] = useState<number>(1)

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // Carregar configurações
  const carregarConfigs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (busca) params.append('q', busca)
      
      const response = await fetch(`/api/produto-config?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setConfigs(data.data)
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarConfigs()
  }, [])

  // Buscar com debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      carregarConfigs()
    }, 300)
    return () => clearTimeout(timer)
  }, [busca])

  // Buscar produtos para adicionar
  useEffect(() => {
    if (buscaProduto.length < 2) {
      setSugestoesProdutos([])
      return
    }

    setBuscandoProdutos(true)
    const timer = setTimeout(() => {
      fetch(`/api/produtos/buscar?q=${encodeURIComponent(buscaProduto)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setSugestoesProdutos(data.data)
          }
          setBuscandoProdutos(false)
        })
        .catch(() => setBuscandoProdutos(false))
    }, 300)

    return () => clearTimeout(timer)
  }, [buscaProduto])

  // Abrir modal para adicionar
  const abrirModalAdicionar = () => {
    setEditando(null)
    setProdutoSelecionado(null)
    setProdutosSelecionados([])
    setBuscaProduto('')
    setFormMultiplo(1)
    setFormObservacao('')
    setFormAtivo(true)
    setModalAberto(true)
  }

  // Abrir modal para editar
  const abrirModalEditar = (config: ProdutoConfig) => {
    setEditando(config)
    setProdutoSelecionado({
      cod_produto: config.cod_produto,
      descricao: config.descricao,
      referencia_fabricante: config.referencia_fabricante,
      grupo_descricao: config.grupo,
      estoque_cd: '0'
    })
    setFormMultiplo(config.multiplo_venda)
    setFormObservacao(config.observacao || '')
    setFormAtivo(config.ativo)
    setModalAberto(true)
  }

  // Selecionar/deselecionar produto da busca (múltipla seleção)
  const toggleProduto = (produto: ProdutoBusca) => {
    const jaExiste = produtosSelecionados.some(p => p.cod_produto === produto.cod_produto)
    if (jaExiste) {
      setProdutosSelecionados(produtosSelecionados.filter(p => p.cod_produto !== produto.cod_produto))
    } else {
      setProdutosSelecionados([...produtosSelecionados, produto])
    }
  }

  // Remover produto da seleção
  const removerProduto = (cod_produto: string) => {
    setProdutosSelecionados(produtosSelecionados.filter(p => p.cod_produto !== cod_produto))
  }

  // Salvar configuração (único ou múltiplos)
  const salvarConfig = async () => {
    // Modo edição (único produto)
    if (editando && produtoSelecionado) {
      setSalvando(true)
      try {
        const response = await fetch('/api/produto-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cod_produto: produtoSelecionado.cod_produto,
            multiplo_venda: formMultiplo,
            observacao: formObservacao || null,
            ativo: formAtivo
          })
        })

        const data = await response.json()
        if (data.success) {
          setModalAberto(false)
          carregarConfigs()
          addToast('Configuração salva com sucesso', 'success')
        } else {
          addToast('Erro ao salvar: ' + data.error, 'error')
        }
      } catch (error) {
        console.error('Erro ao salvar:', error)
        addToast('Erro ao salvar configuração', 'error')
      } finally {
        setSalvando(false)
      }
      return
    }

    // Modo adicionar (múltiplos produtos)
    if (produtosSelecionados.length === 0) return

    setSalvando(true)
    try {
      const response = await fetch('/api/produto-config/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produtos: produtosSelecionados.map(p => p.cod_produto),
          multiplo_venda: formMultiplo,
          observacao: formObservacao || null,
          ativo: formAtivo
        })
      })

      const data = await response.json()
      if (data.success) {
        setModalAberto(false)
        carregarConfigs()
        addToast(data.message, 'success')
      } else {
        addToast('Erro ao salvar: ' + data.error, 'error')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      addToast('Erro ao salvar configuração', 'error')
    } finally {
      setSalvando(false)
    }
  }

  // Deletar configuração
  const deletarConfig = async (cod_produto: string) => {
    if (!confirm('Deseja remover esta configuração? O produto voltará a usar múltiplo padrão (1).')) {
      return
    }

    try {
      const response = await fetch(`/api/produto-config/${cod_produto}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        carregarConfigs()
        addToast('Configuração removida com sucesso', 'success')
      } else {
        addToast('Erro ao deletar: ' + data.error, 'error')
      }
    } catch (error) {
      console.error('Erro ao deletar:', error)
      addToast('Erro ao deletar configuração', 'error')
    }
  }

  // Salvar edição inline
  const salvarInline = async (cod_produto: string) => {
    try {
      const response = await fetch(`/api/produto-config/${cod_produto}/multiplo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multiplo_venda: valorInline })
      })

      const data = await response.json()
      if (data.success) {
        setEditandoInline(null)
        carregarConfigs()
        addToast('Múltiplo atualizado com sucesso', 'success')
      } else {
        addToast('Erro ao atualizar: ' + data.error, 'error')
      }
    } catch (error) {
      console.error('Erro ao atualizar:', error)
    }
  }

  // Iniciar edição inline
  const iniciarEdicaoInline = (config: ProdutoConfig) => {
    setEditandoInline(config.cod_produto)
    setValorInline(config.multiplo_venda)
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-accent-subtle p-2.5 rounded-md">
              <FiSettings className="text-accent text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Configuração de Produtos</h1>
              <p className="text-sm text-slate-500">Defina múltiplos de venda para arredondamento no DRP</p>
            </div>
          </div>
          <button
            onClick={abrirModalAdicionar}
            className="btn btn-primary flex items-center gap-2"
          >
            <FiPlus size={16} />
            Adicionar Produto
          </button>
        </div>

        {/* Busca */}
        <div className="card">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por código ou descrição..."
              className="input w-full pl-10"
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto card p-0">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : configs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500">
            <FiPackage size={32} className="mb-2 text-slate-300" />
            <p>Nenhuma configuração encontrada</p>
            <p className="text-xs">Clique em "Adicionar Produto" para configurar um múltiplo de venda</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-background-subtle">
                <th className="table-header">Produto</th>
                <th className="table-header">Grupo</th>
                <th className="table-header text-center">Múltiplo</th>
                <th className="table-header">Observação</th>
                <th className="table-header text-center">Status</th>
                <th className="table-header text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr key={config.cod_produto} className="hover:bg-background-subtle transition-colors">
                  <td className="table-cell">
                    <div>
                      <span className="font-mono font-semibold text-slate-900">{config.cod_produto}</span>
                      <p className="text-xs text-slate-500 truncate max-w-xs">{config.descricao}</p>
                    </div>
                  </td>
                  <td className="table-cell text-slate-600">{config.grupo}</td>
                  <td className="table-cell text-center">
                    {editandoInline === config.cod_produto ? (
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min="1"
                          value={valorInline}
                          onChange={(e) => setValorInline(parseInt(e.target.value) || 1)}
                          className="input w-16 text-center text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') salvarInline(config.cod_produto)
                            if (e.key === 'Escape') setEditandoInline(null)
                          }}
                        />
                        <button
                          onClick={() => salvarInline(config.cod_produto)}
                          className="p-1 text-success hover:bg-success-subtle rounded"
                          title="Salvar"
                        >
                          <FiCheck size={14} />
                        </button>
                        <button
                          onClick={() => setEditandoInline(null)}
                          className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                          title="Cancelar"
                        >
                          <FiX size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => iniciarEdicaoInline(config)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-accent-subtle text-accent font-bold rounded-full hover:bg-accent/20 transition-colors"
                        title="Clique para editar"
                      >
                        {config.multiplo_venda}
                        <FiEdit2 size={12} />
                      </button>
                    )}
                  </td>
                  <td className="table-cell text-slate-500 text-sm">
                    {config.observacao || '-'}
                  </td>
                  <td className="table-cell text-center">
                    <span className={`badge ${config.ativo ? 'badge-success' : 'badge-danger'}`}>
                      {config.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="table-cell text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => abrirModalEditar(config)}
                        className="p-1.5 text-slate-400 hover:text-accent hover:bg-accent-subtle rounded transition-colors"
                        title="Editar"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button
                        onClick={() => deletarConfig(config.cod_produto)}
                        className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger-subtle rounded transition-colors"
                        title="Remover"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info */}
      <div className="flex-shrink-0 mt-4 text-xs text-slate-500">
        <p>
          <strong>Múltiplo de venda:</strong> O DRP arredondará as sugestões para o próximo múltiplo configurado.
          Ex: múltiplo 4 → sugestões serão 4, 8, 12, 16...
        </p>
      </div>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-slate-900">
                {editando ? 'Editar Configuração' : 'Adicionar Configuração'}
              </h2>
              <button
                onClick={() => setModalAberto(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Modo edição - produto único */}
              {editando && produtoSelecionado && (
                <div className="bg-background-subtle rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-semibold text-slate-900">{produtoSelecionado.cod_produto}</span>
                  </div>
                  <p className="text-sm text-slate-600">{produtoSelecionado.descricao}</p>
                  <p className="text-xs text-slate-500">{produtoSelecionado.grupo_descricao}</p>
                </div>
              )}

              {/* Modo adicionar - busca e seleção múltipla */}
              {!editando && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Buscar Produtos <span className="text-slate-400 font-normal">(clique para selecionar vários)</span>
                  </label>
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={buscaProduto}
                      onChange={(e) => setBuscaProduto(e.target.value)}
                      placeholder="Digite código ou descrição..."
                      className="input w-full pl-10"
                      autoFocus
                    />
                    {buscandoProdutos && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent"></div>
                      </div>
                    )}
                  </div>

                  {/* Sugestões com checkbox */}
                  {sugestoesProdutos.length > 0 && (
                    <>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-slate-500">{sugestoesProdutos.length} produto(s) encontrado(s)</span>
                        <button
                          onClick={() => {
                            const novos = sugestoesProdutos.filter(p => !produtosSelecionados.some(s => s.cod_produto === p.cod_produto))
                            setProdutosSelecionados([...produtosSelecionados, ...novos])
                          }}
                          className="text-xs font-medium text-accent hover:text-accent-hover"
                        >
                          Selecionar Todos
                        </button>
                      </div>
                      <div className="mt-1 border border-border rounded-lg max-h-72 overflow-y-auto">
                      {sugestoesProdutos.map((produto) => {
                        const selecionado = produtosSelecionados.some(p => p.cod_produto === produto.cod_produto)
                        return (
                          <button
                            key={produto.cod_produto}
                            onClick={() => toggleProduto(produto)}
                            className={`w-full px-3 py-2 text-left border-b border-border-subtle last:border-b-0 transition-colors ${
                              selecionado ? 'bg-accent-subtle' : 'hover:bg-background-subtle'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                selecionado ? 'bg-accent border-accent' : 'border-slate-300'
                              }`}>
                                {selecionado && <FiCheck size={12} className="text-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-semibold text-slate-900">{produto.cod_produto}</span>
                                  <span className="text-xs text-slate-500">{produto.grupo_descricao}</span>
                                </div>
                                <p className="text-sm text-slate-600 truncate">{produto.descricao}</p>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                      </div>
                    </>
                  )}

                  {/* Produtos selecionados */}
                  {produtosSelecionados.length > 0 && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Produtos selecionados ({produtosSelecionados.length})
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {produtosSelecionados.map((produto) => (
                          <div
                            key={produto.cod_produto}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-accent-subtle text-accent rounded-full text-xs font-medium"
                          >
                            <span>{produto.cod_produto}</span>
                            <button
                              onClick={() => removerProduto(produto.cod_produto)}
                              className="hover:text-danger"
                            >
                              <FiX size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Múltiplo de venda - aparece quando tem produtos selecionados ou está editando */}
              {(produtosSelecionados.length > 0 || editando) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Múltiplo de Venda
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={formMultiplo}
                        onChange={(e) => setFormMultiplo(parseInt(e.target.value) || 1)}
                        className="input w-24 text-center"
                      />
                      <span className="text-sm text-slate-500">
                        Sugestões serão múltiplos de {formMultiplo} ({formMultiplo}, {formMultiplo * 2}, {formMultiplo * 3}...)
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Observação (opcional)
                    </label>
                    <input
                      type="text"
                      value={formObservacao}
                      onChange={(e) => setFormObservacao(e.target.value)}
                      placeholder="Ex: Vendido em caixas de 4"
                      className="input w-full"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ativo"
                      checked={formAtivo}
                      onChange={(e) => setFormAtivo(e.target.checked)}
                      className="w-4 h-4 text-accent border-border rounded focus:ring-accent"
                    />
                    <label htmlFor="ativo" className="text-sm text-slate-700">
                      Configuração ativa
                    </label>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-background-subtle rounded-b-lg">
              <button
                onClick={() => setModalAberto(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={salvarConfig}
                disabled={(editando ? !produtoSelecionado : produtosSelecionados.length === 0) || salvando}
                className="btn btn-primary flex items-center gap-2"
              >
                {salvando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <FiSave size={16} />
                    {editando ? 'Salvar' : `Salvar ${produtosSelecionados.length} produto(s)`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
