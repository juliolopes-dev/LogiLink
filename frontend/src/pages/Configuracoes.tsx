import { useState } from 'react'
import { FiSettings, FiPackage, FiSliders, FiDatabase, FiUsers, FiTruck } from 'react-icons/fi'
import ConfiguracaoProdutos from './ConfiguracaoProdutos'
import RegrasEstoque from './RegrasEstoque'

type ConfigItem = 'multiplos' | 'regras' | 'filiais' | 'usuarios' | 'integracao'

interface MenuItem {
  id: ConfigItem
  nome: string
  descricao: string
  icone: React.ReactNode
  disponivel: boolean
}

const menuItems: MenuItem[] = [
  {
    id: 'multiplos',
    nome: 'Múltiplos de Venda',
    descricao: 'Defina múltiplos para arredondamento no DRP',
    icone: <FiPackage size={20} />,
    disponivel: true
  },
  {
    id: 'regras',
    nome: 'Regras de Estoque',
    descricao: 'Configure lead time, segurança e cobertura',
    icone: <FiSliders size={20} />,
    disponivel: true
  },
  {
    id: 'filiais',
    nome: 'Filiais',
    descricao: 'Gerencie as filiais do sistema',
    icone: <FiTruck size={20} />,
    disponivel: false
  },
  {
    id: 'usuarios',
    nome: 'Usuários',
    descricao: 'Gerencie usuários e permissões',
    icone: <FiUsers size={20} />,
    disponivel: false
  },
  {
    id: 'integracao',
    nome: 'Integração',
    descricao: 'Configure sincronização de dados',
    icone: <FiDatabase size={20} />,
    disponivel: false
  }
]

export default function Configuracoes() {
  const [itemAtivo, setItemAtivo] = useState<ConfigItem>('multiplos')

  const itemSelecionado = menuItems.find(m => m.id === itemAtivo)

  return (
    <div className="h-full flex gap-4 overflow-hidden">
      {/* Menu lateral compacto */}
      <div className="w-56 flex-shrink-0 flex flex-col border-r border-border pr-4">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
          <FiSettings className="text-accent" size={18} />
          <h1 className="text-sm font-semibold text-slate-900">Configurações</h1>
        </div>

        {/* Lista de configurações */}
        <div className="flex-1 overflow-auto space-y-0.5">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.disponivel && setItemAtivo(item.id)}
              disabled={!item.disponivel}
              className={`w-full text-left px-2.5 py-2 rounded-md transition-all duration-200 flex items-center gap-2 ${
                itemAtivo === item.id
                  ? 'bg-accent text-white shadow-sm'
                  : item.disponivel
                    ? 'hover:bg-background-subtle hover:translate-x-1 text-slate-700'
                    : 'opacity-40 cursor-not-allowed text-slate-400'
              }`}
            >
              <div className={`flex-shrink-0 transition-colors ${itemAtivo === item.id ? 'text-white' : item.disponivel ? 'text-accent' : 'text-slate-400'}`}>
                {item.icone}
              </div>
              <span className={`flex-1 text-sm font-medium truncate ${itemAtivo === item.id ? 'text-white' : ''}`}>
                {item.nome}
              </span>
              {!item.disponivel && (
                <span className="text-[10px] bg-slate-200 text-slate-500 px-1 py-0.5 rounded">
                  Breve
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header do conteúdo */}
        <div className="flex-shrink-0 mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="text-accent">
              {itemSelecionado?.icone}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{itemSelecionado?.nome}</h2>
              <p className="text-sm text-slate-500">{itemSelecionado?.descricao}</p>
            </div>
          </div>
        </div>

        {/* Conteúdo da configuração */}
        <div className="flex-1 overflow-hidden">
          {itemAtivo === 'multiplos' && <ConfiguracaoProdutos />}
          {itemAtivo === 'regras' && <RegrasEstoque />}
        </div>
      </div>
    </div>
  )
}
