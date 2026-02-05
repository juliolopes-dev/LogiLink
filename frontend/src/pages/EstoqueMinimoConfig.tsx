import { useState } from 'react'
import { FiRefreshCw, FiCheckCircle, FiAlertCircle, FiInfo } from 'react-icons/fi'

interface ResultadoCalculo {
  total_produtos: number
  sucesso: number
  erros: number
  produtos_erro?: string[]
}

export default function EstoqueMinimoConfig() {
  const [calculando, setCalculando] = useState(false)
  const [resultado, setResultado] = useState<ResultadoCalculo | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const calcularTodosProdutos = async () => {
    if (!confirm('Deseja calcular o estoque mínimo de TODOS os produtos? Este processo pode levar alguns minutos.')) {
      return
    }

    setCalculando(true)
    setErro(null)
    setResultado(null)

    try {
      const response = await fetch('/api/estoque-minimo/dinamico/calcular-todos', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        setResultado(data.data)
      } else {
        setErro(data.error || 'Erro ao calcular estoque mínimo')
      }
    } catch (error: any) {
      setErro(error.message || 'Erro ao conectar com o servidor')
    } finally {
      setCalculando(false)
    }
  }

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
              <li>• Classifica produtos em ABC (Pareto 80/20)</li>
              <li>• Considera tendências e sazonalidade</li>
              <li>• Lead time de 30 dias + buffer por classe</li>
              <li>• Classe A: Fator 2.0 (nunca pode faltar)</li>
              <li>• Classe B: Fator 1.5 (ruptura ocasional tolerável)</li>
              <li>• Classe C: Fator 1.2 (priorizar redução de capital)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Card de Ação */}
      <div className="bg-surface border border-border rounded-md p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Cálculo Inicial</h2>
        
        <p className="text-slate-600 mb-6">
          Execute o cálculo inicial de estoque mínimo para todos os produtos ativos.
          Este processo irá analisar o histórico de vendas e calcular o estoque mínimo
          ideal para cada produto em cada filial.
        </p>

        <button
          onClick={calcularTodosProdutos}
          disabled={calculando}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-md font-medium text-sm
            transition-all duration-200
            ${calculando 
              ? 'bg-slate-400 cursor-not-allowed' 
              : 'bg-accent hover:bg-accent-hover active:scale-95'
            }
            text-white
          `}
        >
          <FiRefreshCw className={`text-base ${calculando ? 'animate-spin' : ''}`} />
          {calculando ? 'Calculando...' : 'Calcular Todos os Produtos'}
        </button>

        {calculando && (
          <div className="mt-4 p-4 bg-warning-subtle border border-warning rounded-md">
            <p className="text-warning-text text-sm">
              ⏳ Processando... Este processo pode levar alguns minutos dependendo da quantidade de produtos.
            </p>
          </div>
        )}
      </div>

      {/* Resultado do Cálculo */}
      {resultado && (
        <div className="bg-surface border border-border rounded-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <FiCheckCircle className="text-success text-2xl" />
            <h2 className="text-lg font-semibold text-slate-900">Cálculo Concluído!</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-info-subtle p-4 rounded-md border border-info">
              <p className="text-sm text-info font-medium">Total de Produtos</p>
              <p className="text-2xl font-bold text-info-text">{resultado.total_produtos}</p>
            </div>

            <div className="bg-success-subtle p-4 rounded-md border border-success">
              <p className="text-sm text-success font-medium">Sucesso</p>
              <p className="text-2xl font-bold text-success-text">{resultado.sucesso}</p>
              <p className="text-xs text-success-text">
                {((resultado.sucesso / resultado.total_produtos) * 100).toFixed(1)}%
              </p>
            </div>

            <div className="bg-danger-subtle p-4 rounded-md border border-danger">
              <p className="text-sm text-danger font-medium">Erros</p>
              <p className="text-2xl font-bold text-danger-text">{resultado.erros}</p>
              {resultado.erros > 0 && (
                <p className="text-xs text-danger-text">
                  {((resultado.erros / resultado.total_produtos) * 100).toFixed(1)}%
                </p>
              )}
            </div>
          </div>

          {resultado.produtos_erro && resultado.produtos_erro.length > 0 && (
            <div className="mt-4 p-4 bg-danger-subtle border border-danger rounded-md">
              <p className="text-sm font-medium text-danger-text mb-2">
                Produtos com erro (primeiros 10):
              </p>
              <div className="flex flex-wrap gap-2">
                {resultado.produtos_erro.map((cod) => (
                  <span key={cod} className="px-2 py-1 bg-danger-subtle text-danger-text text-xs rounded-full border border-danger">
                    {cod}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-slate-600">
              ✅ O estoque mínimo foi calculado e salvo no banco de dados.
              Você pode visualizar os resultados na análise de DRP.
            </p>
          </div>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="bg-danger-subtle border border-danger rounded-md p-4">
          <div className="flex items-start gap-2">
            <FiAlertCircle className="text-danger text-xl mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-danger-text">Erro ao calcular</p>
              <p className="text-sm text-danger-text mt-1">{erro}</p>
            </div>
          </div>
        </div>
      )}

      {/* Informações Adicionais */}
      <div className="bg-background-subtle border border-border rounded-md p-4">
        <h3 className="font-semibold text-slate-900 mb-3">Próximos Passos</h3>
        <ul className="text-sm text-slate-600 space-y-2">
          <li>• Após o cálculo inicial, o estoque mínimo será usado automaticamente no DRP</li>
          <li>• Você pode recalcular produtos individuais quando necessário</li>
          <li>• Recomenda-se recalcular todos os produtos mensalmente</li>
          <li>• Produtos com vendas muito baixas podem ter estoque mínimo = 1</li>
        </ul>
      </div>
      </div>
    </div>
  )
}
