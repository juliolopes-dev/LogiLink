# 📦 Estoque Mínimo Dinâmico

Sistema de cálculo automático de estoque mínimo por filial, utilizando classificação ABC (Pareto) e análise de tendências.

---

## 📋 Visão Geral

### Objetivo
Calcular automaticamente o estoque mínimo ideal para cada produto **por filial**, considerando:
- Histórico de vendas (180 dias)
- Classificação ABC (Pareto 80/20)
- Tendências de crescimento/queda
- Sazonalidade
- Lead time do fornecedor (30 dias)

### Benefícios
- ✅ Redução de rupturas em produtos críticos (Classe A)
- ✅ Menos capital parado em produtos de baixo giro (Classe C)
- ✅ Estoque otimizado para cada realidade de filial
- ✅ Recálculo automático mensal
- ✅ Histórico de alterações para auditoria

---

## 📐 Fórmula de Cálculo

```typescript
EstoqueMinimo = 
  MediaVendasDiarias 
  × (LeadTime + BufferDias[ClasseABC])
  × FatorSeguranca[ClasseABC]
  × FatorTendencia
  × FatorSazonal
```

### Parâmetros Fixos

| Parâmetro | Valor | Descrição |
|-----------|-------|-----------|
| **Janela de Análise** | 180 dias | Período para calcular média de vendas |
| **Lead Time** | 30 dias | Tempo de reposição do fornecedor |
| **Período Tendência** | 90 dias | Comparação: últimos 90 dias vs 90 dias anteriores |

---

## 🎯 Classificação ABC (Pareto)

### Conceito
A Lei de Pareto (80/20) aplicada ao estoque:
- **20% dos produtos** geram **80% do faturamento** → Classe A
- **30% dos produtos** geram **15% do faturamento** → Classe B
- **50% dos produtos** geram **5% do faturamento** → Classe C

### Cálculo da Classificação

```typescript
// Algoritmo de classificação ABC por filial
function classificarProdutoABC(cod_produto: string, cod_filial: string): 'A' | 'B' | 'C' {
  // 1. Calcular faturamento do produto na filial (últimos 180 dias)
  const faturamentoProduto = vendas_periodo * preco_venda
  
  // 2. Calcular faturamento total da filial
  const faturamentoTotal = soma(todos_produtos_filial)
  
  // 3. Ordenar produtos por faturamento (maior para menor)
  // 4. Calcular percentual acumulado
  
  if (percentualAcumulado <= 80) {
    return 'A' // Top 20% que geram 80% do faturamento
  } else if (percentualAcumulado <= 95) {
    return 'B' // Próximos 30% que geram 15% do faturamento
  } else {
    return 'C' // Últimos 50% que geram 5% do faturamento
  }
}
```

### Parâmetros por Classe

| Classe | % Produtos | % Faturamento | Fator Segurança | Buffer Dias | Prioridade |
|--------|-----------|---------------|-----------------|-------------|------------|
| **A** | 20% | 80% | 2.0 | +5 dias | 🔴 Máxima |
| **B** | 30% | 15% | 1.5 | +3 dias | 🟡 Média |
| **C** | 50% | 5% | 1.2 | 0 dias | 🟢 Baixa |

### Significado dos Parâmetros

**Fator de Segurança:**
- Classe A (2.0): Nunca pode faltar, margem alta
- Classe B (1.5): Ruptura ocasional tolerável
- Classe C (1.2): Priorizar redução de capital

**Buffer Dias (adicional ao lead time):**
- Classe A (+5): Proteção extra contra atrasos
- Classe B (+3): Proteção moderada
- Classe C (0): Sem proteção extra

---

## 📊 Componentes do Cálculo

### 1. Média de Vendas Diárias

```typescript
// Janela móvel de 180 dias (6 meses)
MediaVendasDiarias = SomaVendas(ultimos_180_dias) / 180
```

**Por que 180 dias?**
- Captura sazonalidade
- Suaviza picos e vales
- Representa melhor o comportamento do produto

### 2. Lead Time Total

```typescript
// Lead time base + buffer por classe
LeadTimeTotal = {
  'A': 30 + 5 = 35 dias,  // Produtos críticos
  'B': 30 + 3 = 33 dias,  // Produtos médios
  'C': 30 + 0 = 30 dias   // Produtos baixo giro
}
```

### 3. Fator de Tendência

Detecta se o produto está crescendo ou caindo nas vendas.

```typescript
// Comparar últimos 90 dias com 90 dias anteriores
VendasRecentes = Vendas(dia_1 a dia_90)
VendasAntigas = Vendas(dia_91 a dia_180)

FatorTendencia = VendasRecentes / VendasAntigas

// Limitar entre 0.5 e 2.0 (evitar extremos)
FatorTendencia = Math.max(0.5, Math.min(2.0, FatorTendencia))
```

**Interpretação:**
- `1.0` = Estável
- `1.5` = Crescendo 50%
- `0.7` = Caindo 30%

### 4. Fator Sazonal

Ajusta para meses de alta ou baixa demanda.

```typescript
// Usar histórico do mesmo mês do ano anterior
VendasMesAtual = Vendas(mes_atual, ano_anterior)
MediaMensal = Vendas(12_meses, ano_anterior) / 12

FatorSazonal = VendasMesAtual / MediaMensal

// Limitar entre 0.5 e 2.0
FatorSazonal = Math.max(0.5, Math.min(2.0, FatorSazonal))
```

**Exemplo Auto Peças:**
- Dezembro (férias): 1.3 (alta)
- Janeiro (pós-férias): 0.8 (baixa)
- Junho (São João): 1.2 (alta regional)

---

## 🔧 Exemplo Prático Completo

### Produto: Filtro de Óleo XYZ - Petrolina (Classe A)

**Dados:**
- Vendas últimos 180 dias: 1.800 unidades
- Vendas últimos 90 dias: 1.000 unidades
- Vendas 90-180 dias atrás: 800 unidades
- Mês atual: Dezembro
- Vendas dezembro ano passado: 180 unidades
- Média mensal ano passado: 150 unidades

**Cálculo:**

```typescript
// 1. Média diária
MediaVendasDiarias = 1800 / 180 = 10 unidades/dia

// 2. Lead time total (Classe A)
LeadTimeTotal = 30 + 5 = 35 dias

// 3. Fator segurança (Classe A)
FatorSeguranca = 2.0

// 4. Fator tendência
FatorTendencia = 1000 / 800 = 1.25 (crescendo 25%)

// 5. Fator sazonal (dezembro é alto)
FatorSazonal = 180 / 150 = 1.2

// RESULTADO:
EstoqueMinimo = 10 × 35 × 2.0 × 1.25 × 1.2
EstoqueMinimo = 1.050 unidades
```

### Mesmo Produto em Salgueiro (Classe C)

**Dados:**
- Vendas últimos 180 dias: 180 unidades (10x menos que Petrolina)

**Cálculo:**

```typescript
// 1. Média diária
MediaVendasDiarias = 180 / 180 = 1 unidade/dia

// 2. Lead time total (Classe C)
LeadTimeTotal = 30 + 0 = 30 dias

// 3. Fator segurança (Classe C)
FatorSeguranca = 1.2

// 4. Fator tendência (mesmo)
FatorTendencia = 1.25

// 5. Fator sazonal (mesmo)
FatorSazonal = 1.2

// RESULTADO:
EstoqueMinimo = 1 × 30 × 1.2 × 1.25 × 1.2
EstoqueMinimo = 54 unidades
```

### Comparação

| Filial | Classe | Vendas/dia | Estoque Mínimo |
|--------|--------|-----------|----------------|
| **Petrolina** | A | 10 | **1.050** |
| **Salgueiro** | C | 1 | **54** |

---

## 🗄️ Estrutura de Dados

### Tabela: estoque_minimo

```sql
CREATE TABLE estoque_minimo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_produto VARCHAR(20) NOT NULL,
  cod_filial VARCHAR(2) NOT NULL,
  
  -- Resultado do cálculo
  estoque_minimo_calculado INTEGER NOT NULL,
  estoque_minimo_manual INTEGER,
  estoque_minimo_ativo INTEGER NOT NULL,
  
  -- Dados do cálculo
  media_vendas_diarias DECIMAL(10,4),
  lead_time_dias INTEGER DEFAULT 30,
  buffer_dias INTEGER,
  fator_seguranca DECIMAL(5,2),
  fator_tendencia DECIMAL(5,2),
  fator_sazonal DECIMAL(5,2),
  classe_abc CHAR(1),
  
  -- Vendas usadas no cálculo
  vendas_180_dias INTEGER,
  vendas_90_dias INTEGER,
  vendas_90_180_dias INTEGER,
  
  -- Metadados
  data_calculo TIMESTAMP DEFAULT NOW(),
  data_proxima_atualizacao TIMESTAMP,
  metodo VARCHAR(20) DEFAULT 'automatico',
  usuario_ajuste VARCHAR(100),
  observacao TEXT,
  
  -- Constraints
  UNIQUE(cod_produto, cod_filial),
  CHECK (classe_abc IN ('A', 'B', 'C')),
  CHECK (metodo IN ('automatico', 'manual', 'ajustado'))
);

-- Índices
CREATE INDEX idx_estoque_minimo_produto ON estoque_minimo(cod_produto);
CREATE INDEX idx_estoque_minimo_filial ON estoque_minimo(cod_filial);
CREATE INDEX idx_estoque_minimo_classe ON estoque_minimo(classe_abc);
CREATE INDEX idx_estoque_minimo_data ON estoque_minimo(data_calculo);
```

### Tabela: estoque_minimo_historico

```sql
CREATE TABLE estoque_minimo_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cod_produto VARCHAR(20) NOT NULL,
  cod_filial VARCHAR(2) NOT NULL,
  
  -- Valores
  estoque_minimo_anterior INTEGER,
  estoque_minimo_novo INTEGER NOT NULL,
  variacao_percentual DECIMAL(10,2),
  
  -- Dados do cálculo
  media_vendas_diarias DECIMAL(10,4),
  fator_tendencia DECIMAL(5,2),
  fator_sazonal DECIMAL(5,2),
  classe_abc CHAR(1),
  
  -- Metadados
  data_calculo TIMESTAMP DEFAULT NOW(),
  metodo VARCHAR(20),
  usuario VARCHAR(100),
  observacao TEXT
);

-- Índices
CREATE INDEX idx_estoque_minimo_hist_produto ON estoque_minimo_historico(cod_produto);
CREATE INDEX idx_estoque_minimo_hist_filial ON estoque_minimo_historico(cod_filial);
CREATE INDEX idx_estoque_minimo_hist_data ON estoque_minimo_historico(data_calculo);
```

---

## 🔄 Fluxo de Recálculo

### Job Mensal Automático

```
Execução: Todo dia 1 do mês às 02:00 (horário de baixo uso)

Fluxo:
1. Buscar todos os produtos ativos
2. Para cada produto:
   a. Para cada filial:
      - Buscar vendas (180 dias)
      - Classificar ABC
      - Calcular tendência
      - Calcular sazonalidade
      - Aplicar fórmula
      - Salvar resultado
      - Salvar histórico
3. Gerar relatório de alterações significativas (>50%)
4. Enviar notificação se houver alertas
```

### Recálculo Manual (Sob Demanda)

```
Gatilhos:
- Usuário solicita recálculo de um produto
- Mudança significativa detectada (vendas subiram/caíram muito)
- Novo produto cadastrado (após 30 dias de vendas)
```

---

## 📡 API Endpoints

### GET /api/estoque-minimo/:cod_produto/:cod_filial

Retorna o estoque mínimo de um produto em uma filial.

**Response:**
```json
{
  "success": true,
  "data": {
    "cod_produto": "12345",
    "cod_filial": "00",
    "estoque_minimo_ativo": 1050,
    "estoque_minimo_calculado": 1050,
    "estoque_minimo_manual": null,
    "classe_abc": "A",
    "media_vendas_diarias": 10.0,
    "fator_tendencia": 1.25,
    "fator_sazonal": 1.2,
    "data_calculo": "2026-02-01T02:00:00Z",
    "metodo": "automatico"
  }
}
```

### GET /api/estoque-minimo/filial/:cod_filial

Lista todos os estoques mínimos de uma filial.

**Query params:**
- `classe_abc`: Filtrar por classe (A, B, C)
- `abaixo_minimo`: true/false
- `page`, `limit`: Paginação

### POST /api/estoque-minimo/recalcular

Recalcula estoque mínimo de um ou mais produtos.

**Request:**
```json
{
  "cod_produto": "12345",
  "cod_filial": "00"  // Opcional: se não informar, recalcula todas as filiais
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cod_produto": "12345",
    "filiais": [
      {
        "cod_filial": "00",
        "estoque_minimo_anterior": 800,
        "estoque_minimo_novo": 1050,
        "variacao_percentual": 31.25,
        "classe_abc": "A"
      }
    ]
  }
}
```

### PUT /api/estoque-minimo/ajustar

Ajusta manualmente o estoque mínimo.

**Request:**
```json
{
  "cod_produto": "12345",
  "cod_filial": "00",
  "estoque_minimo_manual": 1200,
  "observacao": "Ajustado para campanha de fim de ano"
}
```

### GET /api/estoque-minimo/historico/:cod_produto/:cod_filial

Retorna histórico de alterações do estoque mínimo.

### POST /api/estoque-minimo/recalcular-todos

Recalcula todos os produtos (job manual).

**Request:**
```json
{
  "filial": "00",  // Opcional: se não informar, recalcula todas
  "classe_abc": "A"  // Opcional: filtrar por classe
}
```

---

## 📊 Dashboard de Análise

### Visão Geral

```
📊 ESTOQUE MÍNIMO - DASHBOARD

Última atualização: 01/02/2026 02:00

┌─────────────────────────────────────────────────────┐
│ RESUMO GERAL                                        │
├─────────────────────────────────────────────────────┤
│ Total de produtos: 1.234                            │
│ Produtos com estoque abaixo do mínimo: 87 (7%)     │
│ Produtos Classe A abaixo do mínimo: 12 ⚠️          │
│ Capital em estoque mínimo: R$ 2.3M                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ DISTRIBUIÇÃO ABC                                    │
├─────────────────────────────────────────────────────┤
│ Classe A: 247 produtos (20%) - R$ 1.84M (80%)      │
│ Classe B: 370 produtos (30%) - R$ 345K (15%)       │
│ Classe C: 617 produtos (50%) - R$ 115K (5%)        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ALERTAS CRÍTICOS                                    │
├─────────────────────────────────────────────────────┤
│ 🔴 12 produtos Classe A abaixo do mínimo           │
│ 🟡 23 produtos Classe B abaixo do mínimo           │
│ 🟢 52 produtos Classe C abaixo do mínimo           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ MAIORES VARIAÇÕES (último recálculo)               │
├─────────────────────────────────────────────────────┤
│ Filtro 123: 100 → 420 (+320%) ⬆️ Tendência alta   │
│ Vela 456: 200 → 80 (-60%) ⬇️ Queda nas vendas     │
│ Óleo 789: 150 → 180 (+20%) ➡️ Estável             │
└─────────────────────────────────────────────────────┘
```

---

## 🔗 Integração com DRP

O estoque mínimo calculado é usado no DRP para determinar a necessidade de cada filial:

```typescript
// No cálculo do DRP
const estoqueMinimo = await buscarEstoqueMinimoFilial(cod_produto, cod_filial)
const estoqueAtual = await buscarEstoqueAtual(cod_produto, cod_filial)

// Necessidade = Estoque Mínimo - Estoque Atual
const necessidade = Math.max(0, estoqueMinimo - estoqueAtual)
```

---

## ⚙️ Configurações

### Parâmetros Configuráveis

```typescript
const CONFIG_ESTOQUE_MINIMO = {
  // Janela de análise
  JANELA_VENDAS_DIAS: 180,
  JANELA_TENDENCIA_DIAS: 90,
  
  // Lead time
  LEAD_TIME_PADRAO: 30,
  
  // Parâmetros por classe
  CLASSE_A: {
    fator_seguranca: 2.0,
    buffer_dias: 5,
    frequencia_recalculo: 'quinzenal'
  },
  CLASSE_B: {
    fator_seguranca: 1.5,
    buffer_dias: 3,
    frequencia_recalculo: 'mensal'
  },
  CLASSE_C: {
    fator_seguranca: 1.2,
    buffer_dias: 0,
    frequencia_recalculo: 'mensal'
  },
  
  // Limites
  FATOR_TENDENCIA_MIN: 0.5,
  FATOR_TENDENCIA_MAX: 2.0,
  FATOR_SAZONAL_MIN: 0.5,
  FATOR_SAZONAL_MAX: 2.0,
  
  // Alertas
  VARIACAO_ALERTA_PERCENTUAL: 50
}
```

---

## 📝 Casos Especiais

### 1. Produto Novo (sem histórico)

```typescript
if (vendas_180_dias === 0) {
  // Usar estimativa do fornecedor ou média de produtos similares
  estoqueMinimo = estimativa_inicial || 5
  metodo = 'estimativa'
}
```

### 2. Produto com Vendas Esporádicas

```typescript
if (mediaVendasDiarias < 0.1) {
  // Estoque mínimo = 1 unidade (manter disponibilidade mínima)
  estoqueMinimo = 1
}
```

### 3. Produto Descontinuado

```typescript
if (produto.status === 'descontinuado') {
  // Não recalcular, manter estoque mínimo = 0
  estoqueMinimo = 0
}
```

### 4. Filial sem Vendas do Produto

```typescript
if (vendas_filial === 0 && vendas_outras_filiais > 0) {
  // Usar 30% da média de outras filiais como referência
  mediaVendasDiarias = mediaOutrasFiliais * 0.3
}
```

---

## 📅 Cronograma de Recálculo

| Classe | Frequência | Dia/Hora |
|--------|-----------|----------|
| **A** | Quinzenal | Dias 1 e 15, 02:00 |
| **B** | Mensal | Dia 1, 02:00 |
| **C** | Mensal | Dia 1, 02:00 |

---

## 🔒 Auditoria

Todas as alterações são registradas no histórico:
- Recálculos automáticos
- Ajustes manuais
- Mudanças de classe ABC
- Variações significativas

---

*Documentação criada em: 05/Fevereiro/2026*
*Última atualização: 05/Fevereiro/2026*
