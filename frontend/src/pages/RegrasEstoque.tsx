import { useState, useEffect } from 'react'
import { FiSliders, FiEdit2, FiSave, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi'
import ToastContainer, { ToastMessage } from '../components/ToastContainer'

interface RegraEstoque {
  id: number
  nome_regra: string
  descricao: string | null
  demanda_mensal_padrao: number | null
  lead_time_dias: number
  estoque_seguranca_dias: number
  percentual_seguranca: number | null
  cobertura_minima_dias: number | null
  cobertura_maxima_dias: number
  percentual_excesso_alerta: number | null
  percentual_excesso_critico: number | null
  percentual_ruptura_alerta: number | null
  percentual_ruptura_critico: number | null
  aplicar_global: boolean
  cod_filial: string | null
  cod_categoria: string | null
  ativo: boolean
  data_criacao: string
  data_atualizacao: string
  usuario_criacao: string | null
  usuario_atualizacao: string | null
}

export default function RegrasEstoque() {
  const [regras, setRegras] = useState<RegraEstoque[]>([])
  const [loading, setLoading] = useState(true)
  
  // Edição
  const [editando, setEditando] = useState<number | null>(null)
  const [formLeadTime, setFormLeadTime] = useState(0)
  const [formSeguranca, setFormSeguranca] = useState(0)
  const [formCobertura, setFormCobertura] = useState(0)
  const [formDescricao, setFormDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // Carregar regras
  const carregarRegras = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/regras-estoque')
      const data = await response.json()
      
      if (data.success) {
        setRegras(data.data)
      }
    } catch (error) {
      console.error('Erro ao carregar regras:', error)
      addToast('Erro ao carregar regras de estoque', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarRegras()
  }, [])

  // Iniciar edição
  const iniciarEdicao = (regra: RegraEstoque) => {
    setEditando(regra.id)
    setFormLeadTime(regra.lead_time_dias)
    setFormSeguranca(regra.estoque_seguranca_dias)
    setFormCobertura(regra.cobertura_maxima_dias)
    setFormDescricao(regra.descricao || '')
  }

  // Cancelar edição
  const cancelarEdicao = () => {
    setEditando(null)
  }

  // Salvar edição
  const salvarEdicao = async (id: number) => {
    setSalvando(true)
    try {
      const response = await fetch(`/api/regras-estoque/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_time_dias: formLeadTime,
          estoque_seguranca_dias: formSeguranca,
          cobertura_maxima_dias: formCobertura,
          descricao: formDescricao || null,
          usuario_atualizacao: 'SISTEMA'
        })
      })

      const data = await response.json()
      if (data.success) {
        setEditando(null)
        carregarRegras()
        addToast('Regra atualizada com sucesso', 'success')
      } else {
        addToast('Erro ao atualizar: ' + data.error, 'error')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      addToast('Erro ao salvar regra', 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="h-full flex flex-col overflow-hidden">
        {/* Info */}
        <div className="flex-shrink-0 mb-4">
          <div className="bg-info-subtle border border-info rounded-lg p-3 flex items-start gap-3">
            <FiAlertCircle className="text-info flex-shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-info-text">
              <p className="font-medium">Regras de Estoque</p>
              <p className="mt-1">
                Configure os parâmetros de lead time, estoque de segurança e cobertura máxima 
                que serão usados nos cálculos de análise de estoque.
              </p>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto">
          <div className="card">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              </div>
            ) : regras.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FiSliders size={48} className="mx-auto mb-4 opacity-50" />
                <p>Nenhuma regra de estoque configurada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Nome</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Lead Time (dias)</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Segurança (dias)</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Cobertura Máx (dias)</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Escopo</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regras.map((regra) => (
                      <tr key={regra.id} className="border-b border-border-subtle hover:bg-background-subtle">
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-900">{regra.nome_regra}</span>
                        </td>
                        <td className="py-3 px-4">
                          {editando === regra.id ? (
                            <input
                              type="text"
                              value={formDescricao}
                              onChange={(e) => setFormDescricao(e.target.value)}
                              className="input w-full text-sm"
                              placeholder="Descrição..."
                            />
                          ) : (
                            <span className="text-sm text-slate-600">{regra.descricao || '-'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {editando === regra.id ? (
                            <input
                              type="number"
                              min="0"
                              value={formLeadTime}
                              onChange={(e) => setFormLeadTime(parseInt(e.target.value) || 0)}
                              className="input w-20 text-center text-sm"
                            />
                          ) : (
                            <span className="font-mono text-slate-900">{regra.lead_time_dias}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {editando === regra.id ? (
                            <input
                              type="number"
                              min="0"
                              value={formSeguranca}
                              onChange={(e) => setFormSeguranca(parseInt(e.target.value) || 0)}
                              className="input w-20 text-center text-sm"
                            />
                          ) : (
                            <span className="font-mono text-slate-900">{regra.estoque_seguranca_dias}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {editando === regra.id ? (
                            <input
                              type="number"
                              min="0"
                              value={formCobertura}
                              onChange={(e) => setFormCobertura(parseInt(e.target.value) || 0)}
                              className="input w-20 text-center text-sm"
                            />
                          ) : (
                            <span className="font-mono text-slate-900">{regra.cobertura_maxima_dias}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {regra.aplicar_global ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-accent-subtle text-accent">
                              Global
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              {regra.cod_filial || regra.cod_categoria || 'Específico'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {regra.ativo ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-subtle text-success">
                              <FiCheck size={12} className="mr-1" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {editando === regra.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => salvarEdicao(regra.id)}
                                disabled={salvando}
                                className="p-1.5 text-success hover:bg-success-subtle rounded transition-colors"
                                title="Salvar"
                              >
                                {salvando ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-success"></div>
                                ) : (
                                  <FiSave size={16} />
                                )}
                              </button>
                              <button
                                onClick={cancelarEdicao}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                                title="Cancelar"
                              >
                                <FiX size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => iniciarEdicao(regra)}
                              className="p-1.5 text-slate-400 hover:text-accent hover:bg-accent-subtle rounded transition-colors"
                              title="Editar"
                            >
                              <FiEdit2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Legenda */}
        <div className="flex-shrink-0 mt-4">
          <div className="text-xs text-slate-500 space-y-1">
            <p><strong>Lead Time:</strong> Tempo médio de entrega do fornecedor (em dias)</p>
            <p><strong>Estoque de Segurança:</strong> Dias de estoque extra para cobrir variações de demanda</p>
            <p><strong>Cobertura Máxima:</strong> Limite máximo de dias de estoque (acima disso é considerado excesso)</p>
          </div>
        </div>
      </div>
    </>
  )
}
