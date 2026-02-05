# Cálculo DRP por Produto

## 📋 Visão Geral

O **Cálculo DRP por Produto** calcula a distribuição de produtos de uma filial de origem para as demais filiais com base em:
- Estoque disponível na filial de origem (CD ou qualquer outra filial)
- Histórico de vendas de cada filial destino
- Necessidade calculada (meta - estoque atual)
- Múltiplos de venda configurados
- Produtos combinados (quando não há histórico individual)

## 🎯 Objetivo

Sugerir alocações de produtos da filial de origem para as filiais destino, priorizando quem mais vende e garantindo distribuição proporcional quando o estoque é limitado.

## ⚙️ Funcionamento

### Processamento de Produtos
- **Processa TODOS os produtos** da filial de origem que tenham estoque > 0
- **Sem limite de quantidade** - analisa todos os produtos disponíveis
- **Filial de origem dinâmica** - pode ser CD (04) ou qualquer outra filial (00, 01, 02, 05, 06)
- **Cálculo completo** - backend calcula TODOS os produtos de uma vez (sem paginação no cálculo)
- **Paginação local** - frontend recebe todos os produtos e faz paginação localmente (100 produtos por página)

## 📡 API

### Endpoint

```
POST /api/drp/calcular
```

### Request Body

```typescript
{
  periodo_dias: number          // Período em dias para análise (7-365)
  filial_origem?: string        // Filial origem (padrão: '04' - CD)
                                // Pode ser: '00' (Petrolina), '01' (Juazeiro), 
                                // '02' (Salgueiro), '04' (CD), '05' (Bonfim), '06' (Picos)
  filtros?: {
    grupo?: string              // Filtrar por grupo de produtos
    fornecedor?: string         // Filtrar por fornecedor
    status?: string             // Filtrar por status
    busca?: string              // Busca por código ou descrição
    filiais?: string[]          // Filiais destino (padrão: todas exceto origem e Garantia)
  }
}
```

### Response

**IMPORTANTE:** O backend retorna **TODOS os produtos calculados** de uma vez. A paginação é feita localmente no frontend.

```typescript
{
  success: boolean
  resumo: {
    total_produtos: number
    produtos_com_necessidade: number
    produtos_sem_necessidade: number
    valor_total_estoque: number
  }
  produtos: {
    cod_produto: string
    descricao: string
    grupo: string
    cod_grupo_combinado: string | null
    estoque_cd: number
    necessidade_total: number
    deficit: number
    status: 'ok' | 'rateio' | 'deficit'
    proporcao_atendimento: number
    filiais: [
      {
        cod_filial: string
        nome: string
        estoque_atual: number
        saida_periodo: number
        meta: number
        necessidade: number
        alocacao_sugerida: number
        media_vendas?: number
        desvio_padrao?: number
        coeficiente_variacao?: number
        tem_pico?: boolean
      }
    ]
  }[]
}
```

**Observações:**
- O array `produtos` contém **TODOS os produtos** calculados (não há paginação no backend)
- O frontend armazena todos os produtos e faz paginação local (100 itens por página)
- Navegação entre páginas é instantânea (não requer nova chamada à API)
- Cache local mantém os resultados até nova consulta

## 🔧 Regras de Negócio

### 1. Filiais Consideradas

- **Incluídas**: 00 (Petrolina), 01 (Juazeiro), 02 (Salgueiro), 05 (Bonfim), 06 (Picos)
- **Excluídas**: 03 (Garantia), 04 (CD - apenas distribui)

### 2. Cálculo de Necessidade (Prioridade)

O cálculo da **meta** segue a mesma lógica do DRP por NF:

**Prioridade 1 - Vendas:**
```
Se vendas_periodo > 0:
  meta_base = vendas_periodo
```

**Prioridade 2 - Produtos Combinados:**
```
Se vendas_periodo = 0 E tem grupo combinado:
  meta_base = vendas_grupo_combinado
  flag: usou_combinado = true
```

**Prioridade 3 - Estoque Mínimo:**
```
meta = Math.max(meta_base, estoque_minimo)

Se estoque_minimo > meta_base:
  flag: usou_estoque_minimo = true
```

**Cálculo final:**
```
necessidade = Math.max(0, meta - estoque_atual - estoque_combinado)
```

### 3. Produtos Combinados

Quando um produto não tem vendas no período, o sistema busca vendas de produtos do mesmo grupo combinado (produtos similares de outras marcas).

**IMPORTANTE:** O sistema também considera o **estoque de produtos combinados** ao calcular a necessidade. Se a filial já tem um produto similar em estoque, a necessidade é reduzida ou eliminada.

**Exemplo:**
- Produto A (Marca X) - sem vendas, estoque: 0
- Produto B (Marca Y) - 10 vendas, estoque na filial: 8
- Produto C (Marca Z) - 5 vendas, estoque na filial: 0
- Grupo combinado: 15 vendas totais, 8 em estoque

**Cálculo:**
- Meta do Produto A: 15 unidades (vendas do grupo)
- Estoque total: 0 (Produto A) + 8 (combinados) = 8
- **Necessidade: 15 - 8 = 7** (considera estoque de combinados)
- Flag: `usou_combinado = true`

**Vantagem:** Evita duplicação de estoque de produtos similares

**Sugestão de Produtos Combinados:**

Quando há déficit (estoque do CD insuficiente) e o produto pertence a um grupo combinado, o sistema **sugere produtos equivalentes** disponíveis no CD para completar a necessidade.

**Exemplo:**
- Produto A (Marca X): estoque CD = 5, necessidade = 15, déficit = 10
- Produto B (Marca Y - combinado): estoque CD = 20
- Produto C (Marca Z - combinado): estoque CD = 8

**Sistema sugere:**
- Distribuir 5 unidades do Produto A
- **Produtos combinados disponíveis para completar:**
  - Produto B: 20 unidades disponíveis
  - Produto C: 8 unidades disponíveis

### 4. Arredondamento por Múltiplo

Cada produto pode ter um `multiplo_venda` configurado em `Produto_Config_DRP`:

```typescript
multiplo_venda = 1  → sem arredondamento
multiplo_venda = 6  → arredonda para múltiplos de 6 (ex: 7 → 12)
multiplo_venda = 12 → arredonda para múltiplos de 12 (ex: 15 → 24)
```

**Função:**
```typescript
arredondarMultiplo(valor: number, multiplo: number): number {
  if (multiplo <= 1) return Math.round(valor)
  return Math.ceil(valor / multiplo) * multiplo
}
```

### 5. Status de Distribuição

- **`ok`**: Estoque CD >= necessidade total (atende 100%)
- **`rateio`**: Estoque CD < necessidade total (distribui proporcionalmente)
- **`deficit`**: Estoque CD = 0 (não pode distribuir)

### 6. Distribuição quando Estoque Insuficiente (Rateio)

Quando o estoque do CD é menor que a necessidade total, a distribuição é **proporcional à necessidade de cada filial**:

```typescript
// Cada filial recebe proporcionalmente à sua necessidade
for (const filial of analisePorFilial) {
  if (filial.necessidade > 0) {
    const proporcao = filial.necessidade / necessidadeTotal
    const alocacao = estoqueParaDistribuir * proporcao
    filial.alocacao_sugerida = arredondarMultiplo(alocacao, multiploVenda)
  }
}
```

**Exemplo:**
- Estoque CD: 30 unidades
- Necessidade Total: 50 unidades
- Petrolina precisa: 20 (40%) → recebe 12 (40% de 30)
- Juazeiro precisa: 15 (30%) → recebe 9 (30% de 30)
- Salgueiro precisa: 15 (30%) → recebe 9 (30% de 30)

**Vantagem:** Distribuição justa - todas as filiais recebem proporcionalmente ao que precisam.

## 📊 Exemplos

### Exemplo 1: Estoque Suficiente

**Request:**
```json
{
  "periodo_dias": 90,
  "filial_origem": "04",
  "filtros": {
    "busca": "052680"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "cod_produto": "052680",
      "descricao": "VELA NGK",
      "grupo": "VELAS",
      "cod_grupo_combinado": null,
      "estoque_cd": 120,
      "necessidade_total": 100,
      "deficit": 0,
      "status": "ok",
      "proporcao_atendimento": 1.0,
      "filiais": [
        {
          "cod_filial": "00",
          "nome": "Petrolina",
          "estoque_atual": 10,
          "saida_periodo": 50,
          "meta": 50,
          "necessidade": 40,
          "alocacao_sugerida": 40
        },
        {
          "cod_filial": "01",
          "nome": "Juazeiro",
          "estoque_atual": 5,
          "saida_periodo": 30,
          "meta": 30,
          "necessidade": 25,
          "alocacao_sugerida": 25
        }
      ]
    }
  ]
}
```

### Exemplo 2: Estoque Insuficiente (Rateio)

**Cenário:**
- Estoque CD: 60
- Necessidade total: 100
- Petrolina precisa: 40
- Juazeiro precisa: 60

**Distribuição proporcional:**
- Petrolina: (40/100) * 60 = 24
- Juazeiro: (60/100) * 60 = 36

### Exemplo 3: Produto com Combinados

**Cenário:**
- Produto A: sem vendas no período
- Grupo combinado: A, B, C
- Vendas B: 60, Vendas C: 40
- Estoque B: 10, Estoque C: 5

**Cálculo:**
- Meta produto A = 100 (vendas do grupo)
- Estoque combinado = 15
- Necessidade = 100 - 15 = 85

## 🚨 Limitações

1. **Período mínimo**: 7 dias
2. **Período máximo**: 365 dias
3. **Filiais fixas**: não permite criar novas filiais dinamicamente
4. **Produtos inativos**: não são considerados
5. **Estoque negativo**: tratado como zero

## 🐛 Troubleshooting

### Produto não aparece no DRP

**Possíveis causas:**
- Produto inativo (`ativo = 'N'`)
- Sem estoque no CD
- Filtros aplicados (grupo, fornecedor, busca)
- Filial não está na lista de destinos

### Alocação sugerida = 0

**Possíveis causas:**
- Filial já tem estoque suficiente
- Sem vendas no período (e sem combinados)
- Estoque CD zerado

### Valores muito altos

**Possíveis causas:**
- Período muito longo (ex: 365 dias)
- Picos de venda não tratados
- Múltiplo de venda alto (ex: 100)

## 🔗 Relacionamentos

- **Tabelas principais:**
  - `auditoria_integracao.auditoria_produtos_drp` (produtos)
  - `auditoria_integracao.Estoque_DRP` (estoque)
  - `auditoria_integracao.Movimentacao_DRP` (vendas)
  - `public.Produto_Config_DRP` (múltiplos)
  - `public.Produtos_Combinado_DRP` (combinados)
  - `public.Grupo_Combinado_DRP` (grupos de combinados)

- **Documentação relacionada:**
  - [Produtos Combinados](./COMBINADOS.md)
  - [Múltiplos de Venda](./MULTIPLOS_VENDA.md)
  - [DRP por NF](./DRP_NF.md)
