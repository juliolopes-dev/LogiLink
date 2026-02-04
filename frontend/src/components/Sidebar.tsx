import { FiHome, FiPackage, FiTrendingUp, FiShoppingCart, FiFileText, FiSettings, FiLayers } from 'react-icons/fi'

type Page = 'dashboard' | 'produtos' | 'drp' | 'combinados' | 'sugestoes' | 'relatorios' | 'configuracoes'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const menuItems: Array<{ id: Page; icon: typeof FiHome; label: string }> = [
  { id: 'dashboard', icon: FiHome, label: 'Dashboard' },
  { id: 'produtos', icon: FiPackage, label: 'SKUs' },
  { id: 'drp', icon: FiTrendingUp, label: 'Análise DRP' },
  { id: 'combinados', icon: FiLayers, label: 'Produtos Combinados' },
  { id: 'sugestoes', icon: FiShoppingCart, label: 'Sugestões de Compra' },
  { id: 'relatorios', icon: FiFileText, label: 'Relatórios' },
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 bg-surface border-r border-border flex flex-col h-screen fixed left-0 top-0">
      {/* Logo/Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="bg-secondary p-2 rounded-md">
            <FiPackage className="text-accent text-xl" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900">LogiLink</h1>
            <p className="text-[10px] text-slate-500">SISTEMA DRP/COMPRAS</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-accent-subtle text-accent'
                  : 'text-slate-600 hover:bg-background-subtle'
              }`}
            >
              <Icon className="text-lg" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <button
          onClick={() => onNavigate('configuracoes')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
            currentPage === 'configuracoes'
              ? 'bg-accent-subtle text-accent'
              : 'text-slate-600 hover:bg-background-subtle'
          }`}
        >
          <FiSettings className="text-lg" />
          Configurações
        </button>
      </div>
    </aside>
  )
}
