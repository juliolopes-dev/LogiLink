import { useState, useEffect, useRef } from 'react'
import { FiRefreshCw, FiCheckCircle, FiAlertCircle, FiInfo, FiClock } from 'react-icons/fi'

interface JobStatus {
  id: string
  status: 'idle' | 'running' | 'completed' | 'error'
  total_produtos: number
  processados: number
  sucesso: number
  erros: number
  produtos_erro: string[]
  inicio: string | null
  fim: string | null
  mensagem: string
  tempo_estimado_restante: string | null
}

export default function EstoqueMinimoConfig() {
  const [job, setJob] = useState<JobStatus | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Buscar status ao montar o componente
  useEffect(() => {
    buscarProgresso()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const buscarProgresso = async () => {
    try {
      const response = await fetch('/api/estoque-minimo/dinamico/progresso')
      const data = await response.json()
      if (data.success) {
        setJob(data.data)
        // Se está rodando, continuar polling
        if (data.data.status === 'running' && !intervalRef.current) {
          iniciarPolling()
        }
        // Se terminou, parar polling
        if (data.data.status !== 'running' && intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    } catch (error) {
      console.error('Erro ao buscar progresso:', error)
    }
  }

  const iniciarPolling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(buscarProgresso, 2000)
  }

  const calcularTodosProdutos = async () => {
    if (!confirm('Deseja calcular o estoque mínimo de TODOS os produtos? O processo roda em background.')) {
      return
    }

    setErro(null)

    try {
      const response = await fetch('/api/estoque-minimo/dinamico/calcular-todos', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        setJob(data.data)
        iniciarPolling()
      } else {
        setErro(data.message || 'Erro ao iniciar cálculo')
      }
    } catch (error: any) {
      setErro(error.message || 'Erro ao conectar com o servidor')
    }
  }

  const percentual = job && job.total_produtos > 0 
    ? Math.round((job.processados / job.total_produtos) * 100) 
    : 0

  const isRunning = job?.status === 'running'
  const isCompleted = job?.status === 'completed'
  const isError = job?.status === 'error'

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl space-y-4">
        {/* Card de Informações */}
        <div className="bg-info-subtle border border-info rounded-md p-4">
          <div className="flex items-start gap-3">
            <FiInfo className="text-info text-xl mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-info-text mb-2">Como funciona o cálculo?</h3>
              <ul className="text-sm text-info-text space-y-1">
                <li>• Analisa vendas dos últimos 180 dias (6 meses)</li>
                <li>• Inclui produtos com pelo menos 1 venda no período</li>
                <li>• Classifica produtos em ABC (Pareto 80/20)</li>
                <li>• Considera tendências e sazonalidade</li>
                <li>• Lead time de 30 dias + buffer por classe</li>
                <li>• Classe A: Fator 2.0 | Classe B: Fator 1.5 | Classe C: Fator 1.2</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Card de Ação */}
        <div className="bg-surface border border-border rounded-md p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Cálculo de Estoque Mínimo</h2>
          
          <p className="text-slate-600 mb-6">
            Execute o cálculo de estoque mínimo para todos os produtos ativos.
            O processo roda em background e você pode acompanhar o progresso em tempo real.
          </p>

          <button
            onClick={calcularTodosProdutos}
            disabled={isRunning}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-md font-medium text-sm
              transition-all duration-200
              ${isRunning 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-accent hover:bg-accent-hover active:scale-95'
              }
              text-white
            `}
          >
            <FiRefreshCw className={`text-base ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Calculando em background...' : 'Calcular Todos os Produtos'}
          </button>
        </div>

        {/* Barra de Progresso */}
        {isRunning && job && (
          <div className="bg-surface border border-border rounded-md p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <FiRefreshCw className="animate-spin text-accent" />
                Processando...
              </h3>
              <span className="text-sm font-bold text-accent">{percentual}%</span>
            </div>

            {/* Barra de progresso */}
            <div className="w-full bg-slate-200 rounded-full h-3 mb-4">
              <div 
                className="bg-accent h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${percentual}%` }}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-background-subtle rounded-md p-3">
                <p className="text-slate-500">Produtos</p>
                <p className="font-bold text-slate-900">{job.processados.toLocaleString()} / {job.total_produtos.toLocaleString()}</p>
              </div>
              <div className="bg-success-subtle rounded-md p-3">
                <p className="text-success">Sucesso</p>
                <p className="font-bold text-success-text">{job.sucesso.toLocaleString()}</p>
              </div>
              <div className="bg-danger-subtle rounded-md p-3">
                <p className="text-danger">Erros</p>
                <p className="font-bold text-danger-text">{job.erros}</p>
              </div>
              <div className="bg-info-subtle rounded-md p-3">
                <p className="text-info flex items-center gap-1"><FiClock /> Restante</p>
                <p className="font-bold text-info-text">{job.tempo_estimado_restante || '...'}</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-3">{job.mensagem}</p>
          </div>
        )}

        {/* Resultado Concluído */}
        {isCompleted && job && (
          <div className="bg-surface border border-border rounded-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <FiCheckCircle className="text-success text-2xl" />
              <h2 className="text-lg font-semibold text-slate-900">Cálculo Concluído!</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-info-subtle p-4 rounded-md border border-info">
                <p className="text-sm text-info font-medium">Total de Produtos</p>
                <p className="text-2xl font-bold text-info-text">{job.total_produtos.toLocaleString()}</p>
              </div>

              <div className="bg-success-subtle p-4 rounded-md border border-success">
                <p className="text-sm text-success font-medium">Sucesso</p>
                <p className="text-2xl font-bold text-success-text">{job.sucesso.toLocaleString()}</p>
                <p className="text-xs text-success-text">
                  {job.total_produtos > 0 ? ((job.sucesso / job.total_produtos) * 100).toFixed(1) : 0}%
                </p>
              </div>

              <div className="bg-danger-subtle p-4 rounded-md border border-danger">
                <p className="text-sm text-danger font-medium">Erros</p>
                <p className="text-2xl font-bold text-danger-text">{job.erros}</p>
              </div>
            </div>

            {job.produtos_erro && job.produtos_erro.length > 0 && (
              <div className="mt-4 p-4 bg-danger-subtle border border-danger rounded-md">
                <p className="text-sm font-medium text-danger-text mb-2">
                  Produtos com erro (primeiros 50):
                </p>
                <div className="flex flex-wrap gap-2">
                  {job.produtos_erro.map((cod) => (
                    <span key={cod} className="px-2 py-1 bg-danger-subtle text-danger-text text-xs rounded-full border border-danger">
                      {cod}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm text-slate-600">{job.mensagem}</p>
            </div>
          </div>
        )}

        {/* Erro do Job */}
        {isError && job && (
          <div className="bg-danger-subtle border border-danger rounded-md p-4">
            <div className="flex items-start gap-2">
              <FiAlertCircle className="text-danger text-xl mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-danger-text">Erro no processamento</p>
                <p className="text-sm text-danger-text mt-1">{job.mensagem}</p>
              </div>
            </div>
          </div>
        )}

        {/* Erro de conexão */}
        {erro && (
          <div className="bg-danger-subtle border border-danger rounded-md p-4">
            <div className="flex items-start gap-2">
              <FiAlertCircle className="text-danger text-xl mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-danger-text">Erro ao conectar</p>
                <p className="text-sm text-danger-text mt-1">{erro}</p>
              </div>
            </div>
          </div>
        )}

        {/* Informações Adicionais */}
        <div className="bg-background-subtle border border-border rounded-md p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Próximos Passos</h3>
          <ul className="text-sm text-slate-600 space-y-2">
            <li>• Após o cálculo, o estoque mínimo será usado automaticamente no DRP</li>
            <li>• Você pode recalcular produtos individuais quando necessário</li>
            <li>• Recomenda-se recalcular todos os produtos mensalmente</li>
            <li>• Produtos com vendas muito baixas podem ter estoque mínimo = 1</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
