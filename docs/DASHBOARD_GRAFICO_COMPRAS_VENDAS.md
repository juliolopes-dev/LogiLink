# Dashboard - Gráfico de Compras e Vendas

## 📊 Visão Geral

O dashboard do **LogiLink** possui um gráfico de barras que exibe o comparativo de valores de compras e vendas dos últimos 6 meses, permitindo análise visual do desempenho financeiro da empresa.

---

## 🔍 Origem dos Dados

### **COMPRAS (Barras Amarelas - #F5AD00)**

#### Tabela Fonte
- **Tabela**: `auditoria_integracao.auditoria_nf_entrada_juazeiro`
- **Tipo**: Tabela física com dados de todas as filiais

#### Campos Utilizados
- **Data**: `data_entrada` (data que a NF entrou no estoque)
- **Valor**: `quantidade * preco_custo`
- **Período**: Últimos 6 meses a partir do mês atual

#### Filiais Incluídas
A tabela `auditoria_nf_entrada_juazeiro` contém dados de **todas as filiais**:
- **00** - Petrolina
- **01** - Juazeiro
- **02** - Salgueiro
- **04** - (Nova filial)
- **05** - Bonfim
- **06** - Picos

#### Por que usar apenas esta tabela?

**Fluxo de dados das NFs:**
1. Todas as Notas Fiscais de Entrada são **lançadas inicialmente em Juazeiro**
2. Os dados ficam registrados na tabela `auditoria_nf_entrada_juazeiro`
3. Posteriormente, as NFs **passam pelo sistema offline** e são replicadas para as tabelas das outras filiais:
   - `auditoria_nf_entrada_petrolina`
   - `auditoria_nf_entrada_salgueiro`
   - `auditoria_nf_entrada_bonfim`
   - `auditoria_nf_entrada_picos`

**Problema de duplicação:**
- Se usássemos todas as tabelas (ou a view `Movimentacao_DRP`), a mesma NF seria contada múltiplas vezes
- Exemplo: NF 27528 aparece nas filiais 00, 01 e 06 → seria contada 3 vezes

**Solução:**
- Usar **apenas** `auditoria_nf_entrada_juazeiro` como fonte única
- Esta tabela já contém os dados de todas as filiais (campo `cod_filial`)
- Evita duplicação e garante valores corretos

---

### **VENDAS (Barras Cinza Escuras - #252525)**

#### Tabela Fonte
- **View**: `auditoria_integracao.Movimentacao_DRP`
- **Tipo**: View que faz UNION ALL das tabelas de movimentação de todas as filiais

#### Campos Utilizados
- **Data**: `data_movimento`
- **Valor**: `quantidade * valor_venda`
- **Filtro**: `tipo_movimento = '55'` (Vendas)
- **Período**: Últimos 6 meses a partir do mês atual

#### Filiais Incluídas
A view `Movimentacao_DRP` une dados de:
- `auditoria_mov_petrolina`
- `auditoria_mov_juazeiro`
- `auditoria_mov_salgueiro`
- `auditoria_mov_bonfim`
- `auditoria_mov_picos`

---

## 📋 Estrutura da Query

```sql
WITH meses AS (
  -- Gera os últimos 6 meses com labels em português
  SELECT 
    TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + (n || ' months')::INTERVAL), 'YYYY-MM') as mes,
    CASE 
      WHEN EXTRACT(MONTH FROM ...) = 1 THEN 'Jan'
      WHEN EXTRACT(MONTH FROM ...) = 2 THEN 'Fev'
      -- ... outros meses
    END || '/' || TO_CHAR(..., 'YY') as mes_label
  FROM generate_series(0, 5) n
),
vendas_mes AS (
  -- Soma valores de vendas por mês
  SELECT 
    TO_CHAR(DATE_TRUNC('month', data_movimento), 'YYYY-MM') as mes,
    SUM(quantidade) as total_vendas,
    SUM(quantidade * valor_venda) as valor_vendas
  FROM auditoria_integracao."Movimentacao_DRP"
  WHERE 
    tipo_movimento = '55'
    AND data_movimento >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
    AND data_movimento < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY TO_CHAR(DATE_TRUNC('month', data_movimento), 'YYYY-MM')
),
compras_mes AS (
  -- Soma valores de compras por mês
  SELECT 
    TO_CHAR(DATE_TRUNC('month', data_entrada), 'YYYY-MM') as mes,
    SUM(quantidade) as total_compras,
    SUM(quantidade * preco_custo) as valor_compras
  FROM auditoria_integracao.auditoria_nf_entrada_juazeiro
  WHERE 
    data_entrada >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
    AND data_entrada < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY TO_CHAR(DATE_TRUNC('month', data_entrada), 'YYYY-MM')
)
SELECT 
  m.mes,
  m.mes_label,
  COALESCE(v.valor_vendas, 0) as total_vendas,
  COALESCE(c.valor_compras, 0) as total_compras
FROM meses m
LEFT JOIN vendas_mes v ON m.mes = v.mes
LEFT JOIN compras_mes c ON m.mes = c.mes
ORDER BY m.mes
```

---

## 🎨 Características do Gráfico

### Dimensões
- **Altura**: 210px (reduzida em 30% para interface compacta)
- **Largura**: 100% (responsivo)
- **Largura das barras**: 35px

### Cores
- **Compras**: #F5AD00 (Amarelo Bezerra)
- **Vendas**: #252525 (Cinza escuro)

### Formatação
- **Eixo X**: Meses em português (Jan/26, Fev/26, etc.)
- **Eixo Y**: Valores formatados com separador de milhares
- **Tooltip**: Mostra valores formatados em R$ com detalhes

### Componentes (Recharts)
- `ResponsiveContainer`: Container responsivo
- `BarChart`: Gráfico de barras
- `CartesianGrid`: Grid de fundo
- `XAxis`: Eixo horizontal (meses)
- `YAxis`: Eixo vertical (valores)
- `Tooltip`: Informações ao passar o mouse
- `Legend`: Legenda (Compras / Vendas)
- `Bar`: Barras de dados

---

## 📂 Arquivos Relacionados

### Backend
- **Rota**: `backend/src/routes/dashboard.ts`
- **Endpoint**: `GET /api/dashboard/compras-vendas`
- **Registro**: `backend/src/routes/index.ts`
- **Servidor**: `backend/src/server.ts`

### Frontend
- **Componente**: `frontend/src/App.tsx` (seção Dashboard)
- **Biblioteca**: Recharts
- **Imports**: `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, `ResponsiveContainer`

---

## 🔄 Fluxo de Dados Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. NF é lançada no sistema                                 │
│    └─> Vai para: auditoria_nf_entrada_juazeiro             │
│        (com cod_filial da filial de origem)                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Sistema offline replica dados                           │
│    └─> Copia para tabelas de cada filial:                  │
│        - auditoria_nf_entrada_petrolina                     │
│        - auditoria_nf_entrada_salgueiro                     │
│        - auditoria_nf_entrada_bonfim                        │
│        - auditoria_nf_entrada_picos                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Dashboard consulta dados                                │
│    └─> COMPRAS: auditoria_nf_entrada_juazeiro (fonte única)│
│    └─> VENDAS: Movimentacao_DRP (todas as filiais)         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Gráfico exibe valores                                   │
│    └─> Barras amarelas: Valores de compras (R$)            │
│    └─> Barras cinzas: Valores de vendas (R$)               │
│    └─> Últimos 6 meses                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Exemplo de Dados (Janeiro/2026)

### Compras
- **Fonte**: `auditoria_nf_entrada_juazeiro`
- **Total de linhas**: 8.201 registros
- **Total de NFs**: 249 notas fiscais
- **Quantidade**: 64.375 unidades
- **Valor**: R$ 1.920.077,03
- **Filiais**: 6 filiais (00, 01, 02, 04, 05, 06)

### Vendas
- **Fonte**: `Movimentacao_DRP`
- **Tipo movimento**: '55' (Vendas)
- **Valor**: (calculado pela view)

---

## ⚠️ Observações Importantes

### Duplicação de NFs
- ❌ **NÃO usar** a view `Movimentacao_DRP` para compras
- ❌ **NÃO fazer** UNION de todas as tabelas de NF entrada
- ✅ **USAR** apenas `auditoria_nf_entrada_juazeiro` para compras

### Motivo
A mesma NF aparece em múltiplas tabelas de filiais após o processo de replicação offline. Se usarmos todas as tabelas, a mesma compra seria contada 2, 3 ou mais vezes.

### Exemplo de Duplicação
```
NF 27528 (25/08/2023, Fornecedor 000177):
- Aparece em: auditoria_nf_entrada_petrolina (filial 00)
- Aparece em: auditoria_nf_entrada_juazeiro (filial 01)
- Aparece em: auditoria_nf_entrada_picos (filial 06)

Se usássemos todas as tabelas:
- Valor real: R$ 10.000
- Valor contado: R$ 30.000 (3x duplicado) ❌

Usando apenas Juazeiro:
- Valor contado: R$ 10.000 (correto) ✅
```

---

## 🔧 Manutenção

### Para adicionar novos meses
O gráfico automaticamente ajusta para mostrar os últimos 6 meses a partir da data atual. Não é necessário manutenção manual.

### Para alterar período
Modificar o intervalo em ambas as queries:
```sql
-- Alterar de 5 meses para outro valor
CURRENT_DATE - INTERVAL '5 months'
```

### Para adicionar novas métricas
1. Adicionar campos na query SQL
2. Adicionar novos `<Bar>` no componente React
3. Escolher cores apropriadas da paleta Bezerra

---

## 📝 Histórico de Alterações

### 2026-02-01
- ✅ Criado gráfico de compras e vendas
- ✅ Implementado backend com endpoint `/api/dashboard/compras-vendas`
- ✅ Integrado Recharts no frontend
- ✅ Ajustado para usar valores monetários ao invés de quantidades
- ✅ Corrigido problema de duplicação usando apenas tabela de Juazeiro
- ✅ Traduzido meses para português (Jan, Fev, Mar, etc.)
- ✅ Reduzido tamanho do gráfico em 30% para interface compacta
