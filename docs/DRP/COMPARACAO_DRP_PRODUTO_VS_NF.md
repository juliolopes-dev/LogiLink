# 🔄 Comparação: DRP por Produto vs DRP por NF

## Resumo Executivo

| Aspecto | DRP por Produto | DRP por NF |
|---------|----------------|------------|
| **Origem** | Estoque CD (qualquer produto) | Nota Fiscal específica |
| **Meta** | **MAIOR entre** vendas e estoque mínimo | **MAIOR entre** vendas e estoque mínimo |
| **Estoque Mínimo** | ✅ Considera sempre | ✅ Considera sempre |
| **Produtos Combinados** | Apenas se vendas = 0 | Apenas se vendas = 0 |
| **Rateio (estoque insuficiente)** | **Proporcional à necessidade** | **Por ordem de prioridade** |
| **Filtros** | Grupo, busca | Produtos da NF |
| **Limite** | 100 produtos | Todos da NF |

---

## 🎯 Cálculo da META

**Ambos usam a mesma lógica:**

```typescript
// Meta = MAIOR entre vendas e estoque mínimo
meta = Math.max(vendas_periodo, estoque_minimo)
```

**Exemplo:**
- Vendas: 10 unidades
- Estoque mínimo: 15 unidades
- **Meta: 15** ✅ (ambos respeitam estoque mínimo)

---

## 📈 Fluxo de Cálculo Completo

### DRP por Produto

```
1. Buscar produtos COM ESTOQUE NO CD
   └─ WHERE estoque > 0

2. Para cada produto:
   ├─ Buscar vendas na filial
   │  └─ Se vendas = 0 → Buscar vendas do grupo combinado
   │
   ├─ Buscar estoque atual e estoque mínimo na filial
   │
   ├─ Calcular necessidade
   │  └─ meta = max(vendas, estoque_minimo) ⭐
   │  └─ necessidade = max(0, meta - estoque_atual)
   │
   └─ Distribuir estoque CD

3. Distribuição:
   ├─ Se estoque_cd >= necessidade_total
   │  └─ Distribuição proporcional (atende 100%)
   │
   └─ Se estoque_cd < necessidade_total
      └─ Rateio PROPORCIONAL à necessidade ⭐
```

### DRP por NF

```
1. Buscar produtos DA NOTA FISCAL
   └─ Produtos específicos da NF

2. Para cada produto:
   ├─ Buscar vendas na filial
   │  └─ Se vendas = 0 → Buscar vendas do grupo combinado
   │
   ├─ Buscar estoque atual na filial
   │
   ├─ Buscar ESTOQUE MÍNIMO configurado ⭐
   │
   ├─ Calcular necessidade
   │  └─ meta = max(vendas, estoque_minimo) ⭐
   │  └─ necessidade = max(0, meta - estoque_atual)
   │
   └─ Distribuir quantidade da NF

3. Distribuição:
   ├─ estoque_distribuivel = min(qtd_nf, necessidade_total)
   │
   ├─ Se estoque_distribuivel >= necessidade_total
   │  └─ Distribuição proporcional (atende 100%)
   │
   └─ Se estoque_distribuivel < necessidade_total
      └─ Rateio por ORDEM DE PRIORIDADE ⭐
```

---

## 🔍 Diferenças Principais

### 1. **Método de Rateio (Principal Diferença)**

**DRP por Produto - Rateio Proporcional:**
```typescript
// Distribui proporcionalmente à necessidade de cada filial
for (const filial of analisePorFilial) {
  const proporcao = filial.necessidade / necessidadeTotal
  const alocacao = estoqueParaDistribuir * proporcao
  filial.alocacao_sugerida = arredondarMultiplo(alocacao, multiploVenda)
}
```

**Exemplo:**
- Estoque: 10 | Necessidade Total: 25
- SP precisa 10 (40%) → recebe 4 (40% de 10)
- RJ precisa 15 (60%) → recebe 6 (60% de 10)

**DRP por NF - Rateio por Prioridade:**
```typescript
// Distribui por ordem de prioridade até acabar o estoque
const filiaisOrdenadas = [...analisePorFilial].sort(porPrioridade)

while (estoqueRestante > 0) {
  for (const filial of filiaisOrdenadas) {
    if (filial.necessidade > filial.alocacao_sugerida) {
      const qtd = Math.min(multiploVenda, estoqueRestante, ...)
      filial.alocacao_sugerida += qtd
      estoqueRestante -= qtd
    }
  }
}
```

**Exemplo:**
- Estoque: 10 | Necessidade Total: 25
- Prioridade: Petrolina (1ª), Juazeiro (2ª)
- Petrolina precisa 8 → recebe 8
- Juazeiro precisa 17 → recebe 2 (sobrou só 2)

**Impacto:**
- **Produto:** Distribuição mais justa (todos recebem proporcionalmente)
- **NF:** Prioriza filiais estratégicas (pode deixar outras sem nada)

---

### 2. **Origem do Estoque**

**DRP por Produto:**
- Estoque disponível no CD
- Qualquer produto com estoque > 0
- Limite de 100 produtos

**DRP por NF:**
- Quantidade específica da Nota Fiscal
- Apenas produtos que estão na NF
- Sem limite de produtos

---

### 3. **Produtos Combinados**

**Ambos usam a mesma lógica:**
```typescript
// Apenas se produto não tem vendas
if (vendas === 0) {
  vendas = buscarVendasGrupoCombinado()
}
```

Mas o **DRP por NF** tem uma diferença importante:
- Usa **estoque real do produto** (não combinado)
- Apenas **vendas** são combinadas

---

### 4. **Priorização de Filiais**

**Ambos usam:**
```typescript
PRIORIDADE_FILIAIS = ['00', '01', '02', '05', '06']
// Petrolina → Juazeiro → Salgueiro → Bonfim → Picos
```

Mas aplicam diferente:
- **Produto:** Usa apenas para distribuir restante de arredondamentos (rateio é proporcional)
- **NF:** Usa para rateio completo quando estoque insuficiente

---

## 📊 Exemplo Comparativo

### Cenário:
- **Produto:** 042688
- **Estoque CD:** 20 unidades
- **Quantidade NF:** 15 unidades

**Filial Petrolina:**
- Estoque atual: 2
- Vendas 90d: 8
- Estoque mínimo: 12

### DRP por Produto:
```
Meta = max(8, 12) = 12 (estoque mínimo maior)
Necessidade = 12 - 2 = 10 unidades
✅ Distribui 10 unidades (rateio proporcional se insuficiente)
✅ Filial fica com 12 total (atinge o mínimo)
```

### DRP por NF:
```
Meta = max(8, 12) = 12 (estoque mínimo maior)
Necessidade = 12 - 2 = 10 unidades
✅ Distribui 10 unidades (rateio por prioridade se insuficiente)
✅ Filial fica com 12 total (atinge o mínimo)
```

**Diferença:** Ambos atingem o estoque mínimo, mas se houver múltiplas filiais e estoque insuficiente, o método de rateio é diferente.

---

## 🎯 Quando Usar Cada Um?

### Use DRP por Produto quando:
- ✅ Quer distribuir estoque existente no CD
- ✅ Quer analisar múltiplos produtos
- ✅ Quer distribuição justa e proporcional entre filiais
- ✅ Todas as filiais devem receber algo (se possível)

### Use DRP por NF quando:
- ✅ Recebeu uma nota fiscal para distribuir
- ✅ Quer priorizar filiais estratégicas
- ✅ Estoque muito limitado (priorizar quem mais precisa)
- ✅ Distribuição focada (algumas filiais podem não receber)

---

## � Código Atual

### DRP por Produto - Rateio Proporcional
`backend/src/services/drp/produto.service.ts:148-220`
```typescript
// Calcular meta com estoque mínimo
let meta = vendas
let usouEstoqueMinimo = false

if (estoqueMinimo > vendas) {
  meta = estoqueMinimo
  usouEstoqueMinimo = true
}

// Rateio proporcional quando insuficiente
if (estoqueParaDistribuir < necessidadeTotal) {
  for (const filial of analisePorFilial) {
    if (filial.necessidade > 0) {
      const proporcao = filial.necessidade / necessidadeTotal
      const alocacao = estoqueParaDistribuir * proporcao
      filial.alocacao_sugerida = arredondarMultiplo(alocacao, multiploVenda)
    }
  }
}
```

### DRP por NF - Rateio por Prioridade
`backend/src/routes/nf-entrada.ts:366-549`
```typescript
// Calcular meta com estoque mínimo
let meta = vendas
let usouEstoqueMinimo = false

if (estoqueMinimo > vendas) {
  meta = estoqueMinimo
  usouEstoqueMinimo = true
}

// Rateio por prioridade quando insuficiente
if (estoqueParaDistribuir < necessidadeTotal) {
  const filiaisOrdenadas = [...analisePorFilial].sort(porPrioridade)
  
  while (estoqueRestante > 0 && continuarDistribuindo) {
    for (const filial of filiaisOrdenadas) {
      if (filial.necessidade > filial.alocacao_sugerida) {
        const qtd = Math.min(multiploVenda, estoqueRestante, ...)
        filial.alocacao_sugerida += qtd
        estoqueRestante -= qtd
      }
    }
  }
}
```

---

## ✅ Status Atual

**Ambos DRPs:**
- ✅ Consideram estoque mínimo
- ✅ Usam produtos combinados quando sem vendas
- ✅ Respeitam múltiplos de venda

**Diferença principal:**
- 🔄 **Método de rateio** quando estoque insuficiente
