interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className = "", showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg 
        viewBox="0 0 40 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-10 h-10 shadow-sm"
      >
        {/* Fundo com gradiente sutil */}
        <rect width="40" height="40" rx="10" fill="#252525" />
        
        {/* Elementos Gráficos - Fluxo e Conexão */}
        {/* Caminho 1: Amarelo (Accent) - Representa o fluxo de entrada/estoque */}
        <path 
          d="M12 12V22C12 25.3137 14.6863 28 18 28H28" 
          stroke="#F5AD00" 
          strokeWidth="4" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        
        {/* Caminho 2: Branco - Representa a estrutura/base */}
        <path 
          d="M28 28V18C28 14.6863 25.3137 12 22 12H12" 
          stroke="white" 
          strokeWidth="4" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          strokeOpacity="0.9"
        />
        
        {/* Pontos de conexão */}
        <circle cx="28" cy="12" r="3" fill="#F5AD00" />
        <circle cx="12" cy="28" r="3" fill="white" />
      </svg>
      
      {showText && (
        <div className="flex flex-col justify-center">
          <h1 className="text-lg font-bold text-slate-900 leading-none tracking-tight">LogiLink</h1>
          <span className="text-xs font-medium text-slate-500 tracking-wide mt-0.5">DRP & Compras</span>
        </div>
      )}
    </div>
  );
}
