# 📊 Frequência de Saída - Sistema DRP

## O que é Frequência de Saída?

**Frequência de Saída** é um indicador que mede **com que frequência um produto teve movimentação (vendas)** em um determinado período. 

Diferente de analisar a *quantidade* vendida, a frequência analisa a *regularidade* das vendas, ajudando a classificar produtos por padrão de giro.

---

## 📈 Como é Calculada

### Fórmula

```
1. Contar dias com saída
   dias_com_saida = COUNT(DISTINCT data_movimento)
   
2. Calcular percentual
   percentual = (dias_com_saida / periodo_dias) × 100
   
3. Classificar frequência
   ≥ 70% → Frequência ALTA
   40-69% → Frequência MÉDIA
   < 40%  → Frequência BAIXA
   0%     → Sem Saída
```

### Exemplo Prático (90 dias)

**Produto A - Filtro de Óleo:**
- Teve saída em **80 dias** de 90
- Percentual: 88.9%
- **Frequência: Alta** 🟢
- *Interpretação:* Produto gira quase todo dia, alta demanda consistente

**Produto B - Amortecedor:**
- Teve saída em **45 dias** de 90
- Percentual: 50%
- **Frequência: Média** 🟡
- *Interpretação:* Produto gira dia sim, dia não, demanda moderada

**Produto C - Peça Rara:**
- Teve saída em **10 dias** de 90
- Percentual: 11.1%
- **Frequência: Baixa** 🔴
- *Interpretação:* Produto gira raramente, demanda esporádica

---

## 🎯 Classificação

| Frequência | Percentual | Ícone | Descrição |
|------------|-----------|-------|-----------|
| **Alta** | ≥ 70% | 🟢 | Produto gira quase todo dia. Alta rotatividade. |
| **Média** | 40-69% | 🟡 | Produto gira alguns dias. Rotatividade moderada. |
| **Baixa** | < 40% | 🔴 | Produto gira raramente. Baixa rotatividade. |
| **Sem Saída** | 0% | ⚪ | Produto sem movimentação no período. |
| **Sem Dados** | - | ⚫ | Dados insuficientes para análise. |

---

## 💡 Aplicações Práticas

### 1. **Gestão de Estoque**

| Frequência | Estoque Recomendado | Dias de Cobertura |
|------------|---------------------|-------------------|
| Alta 🟢 | Menor | 7 dias (1 semana) |
| Média 🟡 | Médio | 14 dias (2 semanas) |
| Baixa 🔴 | Maior | 21 dias (3 semanas) |

**Por quê?**
- Produtos de **alta frequência** giram rápido → pode trabalhar com estoque menor
- Produtos de **baixa frequência** giram devagar → precisa mais estoque de segurança

### 2. **DRP (Distribuição)**

```
Produto com Frequência Alta:
├── Prioridade na distribuição ✅
├── Pode enviar quantidades menores mais vezes
└── Menor risco de ruptura

Produto com Frequência Baixa:
├── Avaliar necessidade de distribuir ⚠️
├── Se distribuir, enviar quantidade maior de uma vez
└── Maior risco de estoque parado
```

### 3. **Compras**

| Frequência | Estratégia de Compra |
|------------|---------------------|
| Alta 🟢 | Compras frequentes, lotes menores (JIT possível) |
| Média 🟡 | Compras regulares, lotes médios |
| Baixa 🔴 | Compras esporádicas, avaliar se vale manter |

### 4. **Curva ABC + Frequência**

Combinar **valor** (Curva ABC) com **frequência** para decisões mais inteligentes:

| Curva | Frequência | Ação Recomendada |
|-------|-----------|------------------|
| A | Alta 🟢 | **Prioridade máxima** - Manter sempre em estoque |
| A | Baixa 🔴 | **Atenção** - Alto valor mas giro lento, avaliar |
| C | Alta 🟢 | **Manter** - Baixo valor mas gira bem |
| C | Baixa 🔴 | **Avaliar descontinuar** - Baixo valor e giro lento |

---

## 🔧 Uso no Sistema

### Backend - Função Utilitária

```typescript
import { calcularFrequenciaSaida } from '../utils/frequencia-saida'

// Calcular para um produto em uma filial
const resultado = await calcularFrequenciaSaida('042688', '00', 90)
console.log(resultado)
// {
//   frequencia: 'Alta',
//   dias_com_saida: 75,
//   periodo_dias: 90,
//   percentual_dias: 83.3
// }

// Calcular em lote (múltiplos produtos/filiais)
const resultados = await calcularFrequenciaSaidaLote([
  { cod_produto: '042688', cod_filial: '00' },
  { cod_produto: '042688', cod_filial: '01' }
], 90)

const freq = resultados.get('042688:00')
```

### Funções Auxiliares

```typescript
// Dias de cobertura recomendados
const dias = getDiasCoberturaPorFrequencia('Alta') // 7

// Calcular estoque mínimo
const estoque_minimo = media_diaria * dias

// Ícone para UI
const icone = getIconeFrequencia('Alta') // '🟢'

// Descrição detalhada
const desc = getDescricaoFrequencia('Alta')
// "Produto com alta frequência de saída..."
```

---

## 📊 Onde Aparece no Sistema

### 1. **Exportação XLSX do DRP**
Coluna "Frequência Saída" mostra a classificação para cada produto/filial

### 2. **Análise de Estoque** (futuro)
Filtrar produtos por frequência de saída

### 3. **Sugestão de Compras** (futuro)
Ajustar ponto de pedido baseado na frequência

### 4. **Dashboard** (futuro)
Gráficos de distribuição de produtos por frequência

---

## 🎓 Diferença: Frequência vs Quantidade

| Métrica | O que mede | Exemplo |
|---------|-----------|---------|
| **Quantidade Vendida** | Volume total | Vendeu 100 unidades |
| **Frequência de Saída** | Regularidade | Vendeu em 80 de 90 dias |

**Cenário:**
- Produto A: Vendeu 100 unidades em 10 dias (10 un/dia quando vende)
- Produto B: Vendeu 100 unidades em 80 dias (1.25 un/dia quando vende)

**Análise:**
- **Quantidade:** Ambos venderam 100 (igual)
- **Frequência:** 
  - Produto A: Baixa (11% dos dias) 🔴
  - Produto B: Alta (88% dos dias) 🟢

**Decisão:**
- Produto A: Demanda concentrada, pode não precisar manter sempre
- Produto B: Demanda constante, precisa manter sempre em estoque

---

## 📝 Notas Técnicas

### Período Recomendado
- **90 dias** (padrão) - Boa amostra, equilibra sazonalidade
- **180 dias** - Para produtos de giro muito lento
- **30 dias** - Para análises de curto prazo

### Considerações
- Produtos novos (< 30 dias) podem ter "Sem Dados"
- Sazonalidade pode afetar a classificação
- Combinar com outras métricas para decisões mais completas

### Performance
- Função otimizada com `COUNT(DISTINCT date)`
- Versão em lote para processar múltiplos produtos
- Cache pode ser implementado para relatórios frequentes

---

## 🚀 Roadmap

- [ ] Adicionar frequência na tela de Análise de Estoque
- [ ] Criar filtro por frequência no DRP
- [ ] Dashboard com distribuição de frequências
- [ ] Alertas para produtos que mudaram de frequência
- [ ] Integração com sistema de compras
- [ ] Análise de tendência (frequência aumentando/diminuindo)

---

## 📚 Referências

- Código: `backend/src/utils/frequencia-saida.ts`
- Uso: `backend/src/routes/nf-entrada.ts` (exportação XLSX)
- Documentação DRP: `docs/DRP/README.md`
