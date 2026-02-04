# LogiLink - Design System

## Direction
**Personality**: Data & Analysis + Precision & Density
**Product Type**: Dashboard/Admin para gerentes de compras (DRP/Compras)
**Emotional Job**: Confiança, Eficiência, Clareza nos dados
**Brand**: LogiLink - Sistema DRP/Compras Bezerra Autopeças

## Color Foundation

### Base (Bezerra Neutral)
```css
--background: #f1f2f3;        /* Bezerra light gray */
--background-subtle: #e8e9ea; /* Bezerra subtle gray */
--surface: #ffffff;           /* white */
--surface-elevated: #ffffff;  /* white */
--border: #d1d5db;            /* gray-300 */
--border-subtle: #e5e7eb;     /* gray-200 */
```

### Text
```css
--text-primary: #252525;      /* Bezerra dark gray */
--text-secondary: #4b5563;    /* gray-600 */
--text-tertiary: #9ca3af;     /* gray-400 */
--text-inverse: #ffffff;      /* white */
```

### Accent (Amarelo Bezerra - Identidade da Marca)
```css
--accent: #f5ad00;            /* Bezerra yellow */
--accent-hover: #d99800;      /* Bezerra yellow dark */
--accent-subtle: #fef3cd;     /* yellow-50 */
--accent-text: #252525;       /* Bezerra dark gray */
```

### Secondary (Cinza Bezerra)
```css
--secondary: #252525;         /* Bezerra dark gray */
--secondary-hover: #1a1a1a;   /* Bezerra darker gray */
```

### Semantic Colors
```css
/* Success - Verde para estoque OK */
--success: #16a34a;           /* green-600 */
--success-subtle: #f0fdf4;    /* green-50 */
--success-text: #166534;      /* green-800 */

/* Warning - Amarelo para estoque baixo */
--warning: #d97706;           /* amber-600 */
--warning-subtle: #fffbeb;    /* amber-50 */
--warning-text: #92400e;      /* amber-800 */

/* Danger - Vermelho para estoque crítico/zerado */
--danger: #dc2626;            /* red-600 */
--danger-subtle: #fef2f2;     /* red-50 */
--danger-text: #991b1b;       /* red-800 */

/* Info - Azul para informações */
--info: #0284c7;              /* sky-600 */
--info-subtle: #f0f9ff;       /* sky-50 */
--info-text: #075985;         /* sky-800 */
```

## Spacing (4px Grid)
```css
--space-1: 4px;   /* micro */
--space-2: 8px;   /* tight */
--space-3: 12px;  /* standard */
--space-4: 16px;  /* comfortable */
--space-5: 20px;  /* section */
--space-6: 24px;  /* generous */
--space-8: 32px;  /* major */
--space-10: 40px; /* page */
--space-12: 48px; /* hero */
```

## Border Radius (Sharp - Technical)
```css
--radius-sm: 4px;   /* buttons, inputs */
--radius-md: 6px;   /* cards, modals */
--radius-lg: 8px;   /* containers */
--radius-full: 9999px; /* badges, pills */
```

## Depth Strategy: Borders-only (Flat)
```css
--shadow-none: none;
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
--border-default: 1px solid var(--border);
--border-subtle: 1px solid var(--border-subtle);
```

## Typography
**Font Family**: Blinker (fallback: system-ui)
**Approach**: Clean, modern, aligned with Bezerra brand

```css
/* Headings */
--text-xs: 0.75rem;    /* 12px - labels, badges */
--text-sm: 0.875rem;   /* 14px - body small, table cells */
--text-base: 1rem;     /* 16px - body */
--text-lg: 1.125rem;   /* 18px - subheadings */
--text-xl: 1.25rem;    /* 20px - section titles */
--text-2xl: 1.5rem;    /* 24px - page titles */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

## Component Patterns

### Button
```css
/* Primary */
height: 36px;
padding: 0 16px;
font-size: 14px;
font-weight: 500;
border-radius: 6px;
background: var(--accent);
color: white;

/* Secondary */
background: transparent;
border: 1px solid var(--border);
color: var(--text-primary);

/* Ghost */
background: transparent;
border: none;
color: var(--text-secondary);
```

### Card
```css
background: var(--surface);
border: 1px solid var(--border);
border-radius: 8px;
padding: 16px;
```

### Input
```css
height: 36px;
padding: 0 12px;
font-size: 14px;
border: 1px solid var(--border);
border-radius: 6px;
background: var(--surface);
```

### Table
```css
/* Header */
background: var(--background-subtle);
font-size: 12px;
font-weight: 600;
text-transform: uppercase;
letter-spacing: 0.05em;
color: var(--text-secondary);
padding: 12px 16px;

/* Cell */
font-size: 14px;
padding: 12px 16px;
border-bottom: 1px solid var(--border-subtle);
```

### Badge/Status
```css
/* Base */
font-size: 12px;
font-weight: 500;
padding: 2px 8px;
border-radius: 9999px;

/* Variants */
.badge-success { background: var(--success-subtle); color: var(--success-text); }
.badge-warning { background: var(--warning-subtle); color: var(--warning-text); }
.badge-danger { background: var(--danger-subtle); color: var(--danger-text); }
.badge-info { background: var(--info-subtle); color: var(--info-text); }
```

## Layout Patterns

### Sidebar Navigation
- Width: 256px (w-64)
- Background: white (surface)
- Logo: Fundo cinza escuro (#252525) com ícone amarelo (#f5ad00)
- Título: "LogiLink" em slate-900
- Subtítulo: "SISTEMA DRP/COMPRAS" em slate-500
- Items: 40px height, 12px padding horizontal
- Active state: bg-accent-subtle text-accent
- Hover state: bg-background-subtle

### Page Layout
```css
/* Container */
max-width: 1440px;
padding: 24px;

/* Page Header */
margin-bottom: 24px;

/* Content Grid */
gap: 16px;
```

### Data Table Layout
- Sticky header
- Alternating row colors (subtle)
- Hover state on rows
- Fixed first column for large tables

## Filial Colors (Identificação Visual)
```css
--filial-00: #3b82f6; /* Petrolina - Blue */
--filial-01: #10b981; /* Juazeiro - Emerald */
--filial-02: #f59e0b; /* Salgueiro - Amber */
--filial-03: #8b5cf6; /* Garantia - Violet */
--filial-04: #6366f1; /* CD - Indigo */
--filial-05: #ec4899; /* Bonfim - Pink */
--filial-06: #14b8a6; /* Picos - Teal */
```

## Icons
**Library**: React Icons (Feather Icons - Fi)
**Size**: 16px (sm), 20px (md), 24px (lg)
**Stroke**: 1.5px

## Charts (Recharts)

### Gráfico de Barras Compostas
```jsx
<ComposedChart barGap={2} barCategoryGap="20%">
  <Bar maxBarSize={20} radius={[2, 2, 0, 0]} />
</ComposedChart>
```

### Cores dos Gráficos
```css
--chart-entradas: #3b82f6;  /* blue-500 */
--chart-vendas: #ef4444;    /* red-500 */
--chart-tendencia: #dc2626; /* red-600 */
```

### Tooltip
```css
background: white;
border: 1px solid #e5e7eb;
border-radius: 4px;
font-size: 10px;
```

## Barras Verticais (Filiais)

### Estrutura
```jsx
<div className="flex-1 flex flex-col items-center group cursor-pointer">
  <div className="text-xs font-bold text-slate-700 mb-1">{valor}</div>
  <div className="w-5 bg-slate-100 rounded overflow-hidden h-16 flex items-end border border-slate-200">
    <div className="w-full bg-blue-500 rounded-sm" style={{ height: `${altura}%` }} />
  </div>
  <div className="mt-1 text-[9px] font-medium text-slate-500">{nome}</div>
</div>
```

### Dimensões
```css
/* Largura da barra */
width: 20px; /* w-5 - igual ao maxBarSize do Recharts */

/* Altura do container */
height: 64px; /* h-16 */

/* Altura mínima do container pai */
min-height: 90px;
```

### Cores por Tipo
```css
/* Estoque */
--bar-estoque: #3b82f6;       /* blue-500 */
--bar-estoque-hover: #2563eb; /* blue-600 */

/* Vendas */
--bar-vendas: #10b981;        /* emerald-500 */
--bar-vendas-hover: #059669;  /* emerald-600 */
```

## Animações

### Keyframes (index.css)
```css
/* Barras crescendo de baixo para cima */
@keyframes growUp {
  from { height: 0%; opacity: 0.5; }
  to { opacity: 1; }
}

/* Fade in com movimento */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Pulso suave */
@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}
```

### Uso
```jsx
/* Barras verticais */
style={{ animation: 'growUp 0.5s ease-out' }}

/* Container do modal */
style={{ animation: 'fadeIn 0.3s ease-out' }}
```

### Hover Effects

#### Padrão de Hover para Itens de Lista/Menu
```css
/* Efeito completo: fundo cinza + movimento */
hover:bg-background-subtle hover:translate-x-1
transition-all duration-200

/* Classes Tailwind */
className="transition-all duration-200 hover:bg-background-subtle hover:translate-x-1"
```

#### Padrão de Hover para Cards
```css
/* Efeito sutil com sombra */
hover:shadow-sm hover:border-accent/30
transition-all duration-200

/* Classes Tailwind */
className="transition-all duration-200 hover:shadow-sm hover:border-accent/30"
```

#### Padrão de Hover para Linhas de Tabela
```css
/* Efeito de destaque sutil */
hover:bg-background-subtle

/* Classes Tailwind */
className="hover:bg-background-subtle transition-colors"
```

#### Padrão de Hover para Botões Secundários/Ghost
```css
/* Efeito com fundo sutil */
hover:bg-background-subtle
transition-all duration-200

/* Classes Tailwind */
className="transition-all duration-200 hover:bg-background-subtle"
```

#### Padrão de Hover para Ícones de Ação
```css
/* Efeito de cor + fundo */
hover:text-accent hover:bg-accent-subtle
transition-colors duration-200

/* Classes Tailwind */
className="p-1.5 rounded transition-colors duration-200 hover:text-accent hover:bg-accent-subtle"
```

#### Regras Gerais de Hover
1. **Sempre usar transição**: `transition-all duration-200` ou `transition-colors duration-200`
2. **Duração padrão**: 200ms (rápido mas perceptível)
3. **Cor de fundo hover padrão**: `background-subtle` (#e8e9ea - cinza claro)
4. **Cor de fundo hover destaque**: `accent-subtle` (#fef3cd - amarelo claro) - usar apenas em ícones de ação
5. **Movimento opcional**: `translate-x-1` para itens de menu/lista
6. **Estado ativo**: `bg-accent text-white` ou `bg-accent-subtle text-accent`

#### Exemplos de Uso
```jsx
{/* Item de menu lateral */}
<button className="w-full text-left px-2.5 py-2 rounded-md transition-all duration-200 
  hover:bg-background-subtle hover:translate-x-1">
  <FiPackage /> Múltiplos de Venda
</button>

{/* Card clicável */}
<div className="card cursor-pointer transition-all duration-200 
  hover:shadow-sm hover:border-accent/30">
  Conteúdo do card
</div>

{/* Linha de tabela */}
<tr className="hover:bg-background-subtle transition-colors">
  <td>Dados</td>
</tr>

{/* Botão de ação (ícone) */}
<button className="p-1.5 rounded transition-colors duration-200 
  text-slate-400 hover:text-accent hover:bg-accent-subtle">
  <FiEdit2 size={16} />
</button>
```

## Modal de Detalhes

### Dimensões
```css
/* Container */
max-width: 95vw;
max-height: 95vh;

/* Conteúdo */
max-height: calc(95vh - 120px);
padding: 24px horizontal, 12px vertical;
```

### Layout Grid
```css
/* Cards superiores - 6 colunas */
grid-cols-6 gap-2

/* Gráfico + Indicadores - 3 colunas */
grid-cols-3 gap-2
/* Gráfico ocupa 2 colunas: lg:col-span-2 */

/* Barras de filiais - 2 colunas */
grid-cols-2 gap-2
```

### Cards de Estatísticas
```css
/* Tamanho compacto */
padding: 8px; /* p-2 */
border-radius: 4px;

/* Título */
font-size: 9px;
font-weight: 500;
margin-bottom: 2px;

/* Valor */
font-size: 16px; /* text-base */
font-weight: 700;
```

### Filtros de Período em Cards
**Regra**: Filtros de período devem aparecer apenas em cards que mostram dados variáveis por tempo.

**Onde usar**:
- ✅ "Vendas por Filial" - dados mudam conforme período
- ❌ "Histórico: Entradas vs Vendas" - sempre mostra 12 meses fixos

**Estrutura**:
```jsx
<div className="flex items-center justify-between mb-1.5">
  <h4 className="text-[10px] font-semibold text-slate-900">Título do Card</h4>
  <div className="flex items-center gap-0.5 bg-surface border border-border rounded p-0.5">
    <button className="px-1.5 py-0.5 text-[9px] font-medium rounded">30d</button>
    <button className="px-1.5 py-0.5 text-[9px] font-medium rounded">60d</button>
    <button className="px-1.5 py-0.5 text-[9px] font-medium rounded">90d</button>
  </div>
</div>
```

## Paginação (Padrão Global)

### Estrutura de Layout
**IMPORTANTE**: Todas as páginas com paginação devem seguir este padrão:

```jsx
<div className="h-full flex flex-col overflow-hidden">
  {/* Header/Filtros - Fixo */}
  <div className="flex-shrink-0">
    {/* Conteúdo do header */}
  </div>

  {/* Conteúdo - Scrollável */}
  <div className="flex-1 overflow-auto">
    {/* Tabela ou lista de itens */}
  </div>

  {/* Paginação - Fixo no rodapé */}
  {totalPages > 1 && (
    <div className="bg-white border-t border-border px-6 py-2 flex items-center justify-between flex-shrink-0">
      {/* Botões de paginação */}
    </div>
  )}
</div>
```

### Componente de Paginação
```jsx
<div className="bg-white border-t border-border px-6 py-2 flex items-center justify-between flex-shrink-0">
  <button
    onClick={() => setPage(p => Math.max(1, p - 1))}
    disabled={page === 1}
    className="px-3 py-1.5 text-xs font-medium rounded border border-border hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Anterior
  </button>
  <span className="text-xs text-slate-600">
    Página {page} de {totalPages}
  </span>
  <button
    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
    disabled={page === totalPages}
    className="px-3 py-1.5 text-xs font-medium rounded border border-border hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    Próxima
  </button>
</div>
```

### Regras de Paginação
1. **Sempre fixa**: A paginação deve estar FORA do container scrollável
2. **Posição**: Sempre no rodapé da página (flex-shrink-0)
3. **Visibilidade**: Só aparece quando `totalPages > 1`
4. **Estilo consistente**:
   - Background: branco
   - Border superior: border-t border-border
   - Padding: px-6 py-2
   - Texto: text-xs (12px)
   - Botões: px-3 py-1.5
5. **Estados**:
   - Disabled quando na primeira/última página
   - Hover: bg-slate-50
   - Cursor: not-allowed quando disabled

### Variações
**Com ícones** (opcional):
```jsx
<button className="flex items-center gap-2 ...">
  <FiChevronLeft size={14} /> Anterior
</button>
```

**Com informações extras** (opcional):
```jsx
<span className="text-xs text-slate-600">
  Página {page} de {totalPages} 
  <span className="text-slate-400">({total} itens)</span>
</span>
```
