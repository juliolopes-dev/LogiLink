# 📦 DRP por Nota Fiscal (NF) - Documentação Completa

## 📋 Visão Geral

O **DRP por NF** é uma funcionalidade que calcula automaticamente a distribuição de produtos recém-chegados no Centro de Distribuição através de uma Nota Fiscal de Entrada.

**Diferença chave:** Distribui a **quantidade da NF**, não o estoque total do CD.

### 🎯 Quando Usar

- ✅ Recebimento de compra no CD
- ✅ Planejamento de distribuição antes da NF chegar
- ✅ Auditoria de distribuições anteriores
- ✅ Otimização de transferências entre filiais

---

## 📡 API

### Endpoint Principal

```
POST /api/nf-entrada/cd/calcular-drp
```

### Request Body

```typescript
{
  numero_nota: string           // Número da NF (obrigatório)
  periodo_dias?: number         // Período para análise (padrão: 90 dias)
  filiais?: string[]            // Filiais destino (padrão: todas)
}
```

### Response

```typescript
{
  success: boolean
  data: [
    {
      cod_produto: string
      descricao: string
      referencia_fabricante: string
      grupo_descricao: string
      qtd_nf: number
      estoque_cd: number
      necessidade_total: number
      deficit: number
      status: 'ok' | 'rateio' | 'deficit'
      proporcao_atendimento: number
      grupo_combinado: string | null
      produtos_combinados: number
      filiais: [
        {
          cod_filial: string
          nome: string
          estoque_atual: number
          vendas_periodo: number
          meta: number
          necessidade: number
          alocacao_sugerida: number
          usou_combinado: boolean
        }
      ]
    }
  ]
}
```

### Outros Endpoints

```
POST /api/nf-entrada/cd/gerar-pedidos    # Gerar pedidos de transferência
POST /api/nf-entrada/cd/exportar-xlsx    # Exportar análise em Excel
```

---

## Fluxo do Cálculo (atualizado)

```
┌─────────────────────────────────────────────────────────────────┐
│                    NF CHEGA NO CD                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PARA CADA PRODUTO DA NF                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│            1. CALCULAR META POR FILIAL                          │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ PRIORIDADE DE CÁLCULO:                                  │   │
│   │                                                         │   │
│   │ 1. Tem vendas próprias no período?                      │   │
│   │    SIM → Meta = Vendas do período                       │   │
│   │    NÃO → Continua para próxima prioridade               │   │
│   │                                                         │   │
│   │ 2. Pertence a grupo combinado?                          │   │
│   │    SIM → Meta = Vendas do grupo combinado (por filial)  │   │
│   │    NÃO → Continua para próxima prioridade               │   │
│   │                                                         │   │
│   │ 3. Tem estoque mínimo configurado?                      │   │
│   │    SIM → Meta = Estoque mínimo                          │   │
│   │    NÃO → Sem sugestão (produto novo)                    │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│            2. CALCULAR NECESSIDADE POR FILIAL                   │
│                                                                 │
│         Necessidade = Meta - Estoque Atual da Filial            │
│         (Se negativo, necessidade = 0)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│            3. DISTRIBUIR ESTOQUE DA NF (estoque do CD, filial 04) │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Estoque distribuível = min(qtd da NF, Necessidade Total)│   │
│   │ (sobra fica no CD)                                       │   │
│   │ Se estoque distribuível >= Necessidade Total:            │   │
│   │    → Distribuição PROPORCIONAL                           │   │
│   │ Caso contrário:                                          │   │
│   │    → Distribuição por PRIORIDADE                         │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│            4. VERIFICAR COMBINADOS DISPONÍVEIS                  │
│                                                                 │
│   Se há déficit e produto pertence a grupo combinado,           │
│   buscar outros produtos do grupo com estoque no CD             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tipos de Cálculo da Meta

### 1. 🟢 Vendas Próprias (Prioridade 1)
**Quando:** Produto tem histórico de vendas no período configurado.

**Cálculo:**
```
Meta = Soma das vendas no período (tipo_movimento = '55')
Necessidade = Meta - Estoque Atual
```

**Exemplo:**
- Período: 90 dias
- Vendas Petrolina: 10 unidades
- Estoque atual: 3 unidades
- Meta Petrolina: 10 unidades
- Necessidade: 7 unidades

**Importante:** NÃO considera estoque de produtos combinados no cálculo.

---

### 2. � Produtos Combinados (Prioridade 2)
**Quando:** Produto SEM vendas próprias, MAS pertence a um grupo combinado com outros produtos que têm vendas.

**Cálculo:**
```
Meta = Soma das vendas de TODOS os produtos do grupo combinado (por filial)
Necessidade = Meta - Estoque Atual (apenas do produto principal)
```

**Exemplo:**
- Produto A (Marca X) - 0 vendas, estoque: 0
- Produto B (Marca Y) - 10 vendas em Petrolina
- Produto C (Marca Z) - 5 vendas em Petrolina
- **Meta do Produto A em Petrolina: 15 unidades** (soma do grupo naquela filial)
- **Estoque: 0** (apenas do produto A)
- **Necessidade: 15 - 0 = 15** ✅

**Observação importante:**
- Usa vendas do grupo combinado como meta
- **NÃO considera** estoque de produtos combinados
- Vendas são somadas **por filial** (não o total de todas filiais)
- Cada filial tem seu cálculo independente

---

### 3. 🟡 Estoque Mínimo (Prioridade 3 - Último Recurso)
**Quando:** Produto SEM vendas próprias E SEM vendas de combinados.

#### **Cenário A: Tem estoque mínimo configurado**

**Cálculo:**
```
Meta = Estoque mínimo configurado para a filial
Necessidade = Meta - Estoque Atual
```

**Exemplo:**
- Vendas próprias: 0
- Vendas do grupo: 0
- Estoque mínimo: 2
- Estoque atual: 0
- Meta: 2 unidades
- Necessidade: 2 unidades

#### **Cenário B: NÃO tem estoque mínimo configurado** ⭐ (NOVO)

**Quando:** Nenhuma filial tem estoque mínimo configurado para o produto.

**Cálculo:**
```
Distribuir 1 unidade por filial seguindo ordem de prioridade:
1. Petrolina (00)
2. Juazeiro (01)
3. Salgueiro (02)
4. Bonfim (05)
5. Picos (06)

Regras:
- Só distribui se filial tem estoque_atual = 0
- Para quando acabar o estoque da NF
- Marca como "usou_estoque_minimo: true"
```

**Exemplo:**
```
Produto 142672:
- Qtd NF: 2
- Vendas: 0 (todas filiais)
- Combinados: 0
- Estoque mínimo: 0 (não configurado)
- Estoque atual: 0 (todas filiais)

Distribuição:
- Petrolina: 1 unidade ✅ (prioridade 1)
- Juazeiro: 1 unidade ✅ (prioridade 2)
- Salgueiro: 0 (sem estoque restante)
- Bonfim: 0
- Picos: 0
```

**Vantagens:**
- ✅ Produtos sem configuração não ficam parados no CD
- ✅ Filiais prioritárias são atendidas primeiro
- ✅ Garante distribuição mínima mesmo sem histórico

**Importante:** Esta é uma solução de fallback. O ideal é configurar estoque mínimo para produtos estratégicos.

---

### 4. ⚪ Sem Histórico (Prioridade 4)
**Quando:** Produto não tem vendas, não tem estoque mínimo e não pertence a grupo combinado.

**Resultado:** Não é possível sugerir distribuição. Produto aparece sem sugestão.

---

## Tipos de Distribuição

### 1. ✅ Distribuição Proporcional
**Quando:** Estoque distribuível (min(qtd da NF, necessidade total)) é **suficiente** para atender todas as necessidades. Qualquer sobra fica no CD.

**Cálculo:**
```
Estoque Distribuível = min(Qtd NF, Necessidade Total)
Alocação Filial = (Necessidade Filial / Necessidade Total) × Estoque Distribuível
```

**Exemplo:**
- Estoque Distribuível: 20 unidades (Qtd NF 20, Necessidade Total 20)
- Necessidade Petrolina: 10
- Necessidade Juazeiro: 5
- Necessidade Salgueiro: 5
- Necessidade Total: 20

Resultado:
- Petrolina: (10/20) × 20 = 10 unidades
- Juazeiro: (5/20) × 20 = 5 unidades
- Salgueiro: (5/20) × 20 = 5 unidades

**Status:** OK ✅

---

### 2. ⚠️ Distribuição por Prioridade (Rateio)
**Quando:** Estoque distribuível (min(qtd da NF, necessidade total)) é **insuficiente** para atender todas as necessidades. A sobra não distribuída permanece no CD.

**Método:** Rateio por **ordem de prioridade** (diferente do DRP por Produto que usa rateio proporcional).

**Prioridade de Filiais:**
| Ordem | Filial | Código |
|-------|--------|--------|
| 1º | Petrolina | 00 |
| 2º | Juazeiro | 01 |
| 3º | Salgueiro | 02 |
| 4º | Bonfim | 05 |
| 5º | Picos | 06 |

**Algoritmo:**
```typescript
1. Ordenar filiais por prioridade
2. Distribuir múltiplo de venda por vez para cada filial
3. Seguir ordem de prioridade (Pet → Jua → Sal → Bon → Pic)
4. Continuar rodadas até acabar o estoque
5. Filiais com maior prioridade são atendidas primeiro
```

**Vantagem:** Garante que filiais estratégicas sejam atendidas primeiro.
**Desvantagem:** Filiais com menor prioridade podem não receber nada.

**Exemplo 1 - Chegou 1 unidade:**
- Estoque CD: 1 unidade
- Necessidade: Pet=1, Jua=1, Sal=1, Bon=1, Pic=1

Resultado:
- Petrolina: 1 unidade ✅ (prioridade 1)
- Juazeiro: 0 unidades ❌
- Salgueiro: 0 unidades ❌
- Bonfim: 0 unidades ❌
- Picos: 0 unidades ❌

**Exemplo 2 - Chegaram 3 unidades:**
- Estoque CD: 3 unidades
- Necessidade: Pet=2, Jua=2, Sal=2, Bon=2, Pic=2

Resultado (distribui 1 por vez em ordem):
- Rodada 1: Pet=1, Jua=0, Sal=0, Bon=0, Pic=0 (restam 2)
- Rodada 2: Pet=1, Jua=1, Sal=0, Bon=0, Pic=0 (restam 1)
- Rodada 3: Pet=1, Jua=1, Sal=1, Bon=0, Pic=0 (restam 0)

Final:
- Petrolina: 1 unidade ✅
- Juazeiro: 1 unidade ✅
- Salgueiro: 1 unidade ✅
- Bonfim: 0 unidades ❌
- Picos: 0 unidades ❌

**Exemplo 3 - Chegaram 6 unidades:**
- Estoque CD: 6 unidades
- Necessidade: Pet=2, Jua=1, Sal=1, Bon=1, Pic=1

Resultado:
- Rodada 1: Pet=1, Jua=1, Sal=1, Bon=1, Pic=1 (restam 1)
- Rodada 2: Pet=2, Jua=1, Sal=1, Bon=1, Pic=1 (restam 0)

Final:
- Petrolina: 2 unidades ✅ (recebeu mais por ter maior necessidade)
- Juazeiro: 1 unidade ✅
- Salgueiro: 1 unidade ✅
- Bonfim: 1 unidade ✅
- Picos: 1 unidade ✅

**Status:** Rateio ⚠️ ou Déficit 🔴

---

### 3. 🔴 Déficit com Sugestão de Combinados
**Quando:** Há déficit E o produto pertence a um grupo combinado E há outros produtos do grupo com estoque no CD.

**Comportamento:**
- Mostra linha amarela abaixo do produto
- Lista produtos equivalentes disponíveis no CD
- Permite ao usuário decidir se quer complementar com outro produto do grupo

**Exemplo:**
```
Produto 042665 - Cilindro Mestre Corsa
Déficit: 11 unidades

⚠️ Sugestão de Complemento:
Produtos equivalentes disponíveis no CD:
- 098234 (Cilindro Mestre Corsa - Marca B): 8 un
- 087123 (Cilindro Mestre Corsa - Marca C): 5 un
```

---

## Status dos Produtos

| Status | Cor | Significado |
|--------|-----|-------------|
| ✅ OK | Verde | Estoque suficiente para atender todas as necessidades |
| ⚠️ Rateio | Amarelo | Estoque parcial, distribuído proporcionalmente |
| 🔴 Déficit | Vermelho | Estoque insuficiente, há falta de produtos |

---

## Badges de Base do Cálculo

| Badge | Significado | Tooltip |
|-------|-------------|---------|
| 🟢 Vendas | Histórico de vendas | "Cálculo baseado no histórico de vendas do próprio produto no período" |
| � Comb. | Combinado | "Produto sem vendas próprias. Usando vendas do grupo combinado (por filial)" |
| � Est.Mín | Estoque mínimo | "Produto sem vendas e sem combinados. Usando estoque mínimo configurado como meta" |
| ⚪ S/Hist | Sem histórico | "Produto novo sem histórico. Não é possível sugerir distribuição" |

---

## Parâmetros do Cálculo

| Parâmetro | Valor Padrão | Descrição |
|-----------|--------------|-----------|
| `periodo_dias` | 90 | Período em dias para análise de vendas |
| `tipo_movimento` | '55' | Código de venda no sistema |
| `CD_FILIAL` | '04' | Código do Centro de Distribuição |

---

## Exemplo Completo

### Cenário:
- NF 483250 chegou no CD com 3 produtos
- Período de análise: 90 dias

### Produto 1: 042688 (Atuador de Embreagem)
- Qtd NF: 11
- Estoque CD: 11
- Vendas Petrolina: 2, Juazeiro: 0, Salgueiro: 1, Bonfim: 1, Picos: 0
- Necessidade Total: 4
- **Distribuição:** Proporcional (estoque suficiente)
- **Status:** OK ✅
- **Base:** Vendas 🟢

### Produto 2: 121422 (Alternador MT Part)
- Qtd NF: 1
- Estoque CD: 1
- Vendas: 0 em todas as filiais
- Estoque Mínimo: 1 (Petrolina)
- Necessidade Total: 5 (1 por filial)
- **Distribuição:** Por prioridade (estoque insuficiente)
- Petrolina recebe: 1 unidade
- Demais: 0 unidades
- **Status:** Déficit 🔴
- **Base:** Est.Mín 🟡

### Produto 3: 044344 (Cilindro Aux Embreagem)
- Qtd NF: 5
- Estoque CD: 5
- Vendas próprias: 0
- Pertence ao grupo SYSCOMB50
- Vendas do grupo combinado: Petrolina: 1, Juazeiro: 1, Salgueiro: 1, Bonfim: 1, Picos: 0
- Necessidade Total: 4
- **Distribuição:** Proporcional (estoque suficiente)
- **Status:** OK ✅
- **Base:** Comb. 🔵

---

## Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `backend/src/routes/nf-entrada.ts` | Endpoints e lógica de cálculo |
| `frontend/src/pages/AnaliseDRP.tsx` | Interface de análise |
| `docs/COMBINADOS.md` | Documentação sobre grupos combinados |

---

## Observações Recentes (regras aplicadas)

- **Prioridade de cálculo atualizada:** 1) Vendas próprias, 2) Produtos combinados, 3) Estoque mínimo (último recurso).
- **Produtos sem estoque mínimo:** Quando não há vendas, combinados nem estoque mínimo configurado, o sistema distribui 1 unidade por filial seguindo prioridade (Pet > Jua > Sal > Bon > Pic), apenas para filiais com estoque = 0.
- Estoque distribuível na NF: `min(qtd_nf, necessidade_total)`. O excedente permanece no CD.
- Estoque do CD (filial 04): não desconta quantidade bloqueada na leitura da NF.
- Estoque das filiais: considera o bloqueado como “a caminho” (não subtrai quantidade_bloqueada) ao calcular necessidade.
- Distribuição proporcional/rateio usam o estoque distribuível (não “torram” a NF inteira se a necessidade for menor).
- Rateio: continua respeitando prioridade de filiais (Pet > Jua > Sal > Bon > Pic).
- Tooltips no frontend explicam motivo de sugestão zero por filial (vendas período, estoque, meta, necessidade, sugestão, motivo).
- Combos/combinados: quando há déficit e produto pertence a grupo combinado, são listados equivalentes com estoque no CD para complementação manual.

---

## Consultas SQL Utilizadas

### Buscar NFs do CD
```sql
SELECT DISTINCT numero_nota, cod_fornecedor, COUNT(*) as total_itens
FROM auditoria_integracao."NF_Entrada_DRP"
WHERE cod_filial = '04'
  AND numero_nota ILIKE '%{busca}%'
GROUP BY numero_nota, cod_fornecedor
ORDER BY numero_nota DESC
LIMIT 20
```

### Buscar Vendas do Período
```sql
SELECT COALESCE(SUM(quantidade), 0) as vendas
FROM auditoria_integracao."Movimentacao_DRP"
WHERE cod_produto = $1
  AND cod_filial = $2
  AND tipo_movimento = '55'
  AND data_movimento >= CURRENT_DATE - INTERVAL '{periodo} days'
```

### Buscar Combinados Disponíveis
```sql
SELECT e.cod_produto, p.descricao, 
       COALESCE(e.estoque - COALESCE(e.quantidade_bloqueada, 0), 0) as estoque_disponivel
FROM auditoria_integracao."Estoque_DRP" e
JOIN auditoria_integracao.auditoria_produtos_drp p ON e.cod_produto = p.cod_produto
WHERE e.cod_produto = ANY($1)
  AND e.cod_filial = '04'
  AND e.estoque > COALESCE(e.quantidade_bloqueada, 0)
ORDER BY e.estoque DESC
```

---

## ⚙️ Configurações

### Parâmetros Disponíveis

| Parâmetro | Padrão | Descrição |
|-----------|--------|----------|
| `periodo_dias` | 90 | Período de análise de vendas |
| `filiais` | Todas | Filiais destino da distribuição |

### Configurações por Produto

- **Múltiplo de venda**: Define arredondamento (ex: caixas de 12)
- **Estoque mínimo**: Quantidade mínima por filial
- **Grupos combinados**: Produtos equivalentes

> **Configurar:** Menu Produtos Combinados e Configuração DRP

---

## 🚨 Limitações

1. **NF deve existir** no sistema
2. **Apenas CD** (filial 04)
3. **Não gera pedidos** automaticamente (use endpoint separado)
4. **Produtos inativos** não são considerados

---

## 🐛 Troubleshooting

### NF não encontrada

**Erro:**
```json
{
  "success": false,
  "error": "Nota fiscal não encontrada no CD"
}
```

**Causas:**
- NF não existe
- NF não é do CD (filial != 04)
- NF ainda não sincronizada

### Alocação = 0 para todas filiais

**Possíveis causas:**
- Filiais já têm estoque suficiente
- Sem vendas no período (e sem combinados)
- Quantidade NF = 0

### Soma das alocações != quantidade NF

**Esperado**: pode sobrar no CD se necessidade total < quantidade NF

**Exemplo:**
- NF: 100
- Necessidade total: 60
- Distribuído: 60
- Sobra no CD: 40

---

## 🔄 DRP por NF vs DRP por Produto

| Aspecto | DRP por NF | DRP por Produto |
|---------|------------|----------------|
| **Origem** | Quantidade da NF | Estoque total do CD |
| **Quando usar** | Recebimento de compra | Redistribuição de estoque |
| **Volume** | Qtd NF | Estoque disponível |
| **Objetivo** | Distribuir recebimento | Otimizar estoque |
| **Sobra** | Fica no CD | Fica no CD |





*Documentação atualizada em: 04/Fevereiro/2026*
