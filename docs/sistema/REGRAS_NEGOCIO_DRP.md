# 📋 Regras de Negócio - Sistema DRP Bezerra

## 🏢 Estrutura de Filiais

### Filiais Operacionais (Faturamento)
| Código | Nome | Participa DRP | Faturamento |
|--------|------|---------------|-------------|
| 00 | Petrolina | ✅ Sim | ✅ Sim |
| 01 | Juazeiro | ✅ Sim | ✅ Sim |
| 02 | Salgueiro | ✅ Sim | ✅ Sim |
| 05 | Bonfim | ✅ Sim | ✅ Sim |
| 06 | Picos | ✅ Sim | ✅ Sim |

### Filiais Especiais
| Código | Nome | Participa DRP | Faturamento | Observação |
|--------|------|---------------|-------------|------------|
| 03 | Garantia | ❌ Não | ❌ Não | Apenas recebe produtos em garantia |
| 04 | CD | ❌ Não | ❌ Não | Centro de Distribuição - apenas distribui |

---

## 🔄 Fluxo de Distribuição

```
FORNECEDORES
     ↓
   CD (04) ← Recebe todas as compras
     ↓
Distribui para:
  • Petrolina (00)
  • Juazeiro (01)
  • Salgueiro (02)
  • Bonfim (05)
  • Picos (06)

NÃO distribui via DRP para:
  ✗ Garantia (03) - Fluxo separado de garantias
  ✗ CD (04) - Não distribui para si mesmo
```

---

## ⚙️ Regras do Cálculo DRP

### 1. Filiais Incluídas no Cálculo
- ✅ **Petrolina (00)**
- ✅ **Juazeiro (01)**
- ✅ **Salgueiro (02)**
- ✅ **Bonfim (05)**
- ✅ **Picos (06)**

### 2. Filiais Excluídas do Cálculo
- ❌ **Garantia (03)** - Não entra no DRP
- ❌ **CD (04)** - Não entra no DRP (é a origem)

### 3. Cálculo de Meta por Filial
```
Meta = VENDAS dos últimos X dias (apenas das 5 filiais operacionais)
```

**Importante:** 
- Usar **APENAS VENDAS** (tipo_movimento = 'Vendas')
- **NÃO usar transferências** entre filiais
- **NÃO usar ajustes** de estoque
- **CD não tem faturamento**, então não tem vendas para calcular meta
- **Garantia não participa**, então suas movimentações são ignoradas

### 4. Origem do Estoque
- **Todas as compras** são feitas para o **CD (04)**
- **CD distribui** para as filiais conforme necessidade calculada pelo DRP
- **CD não vende** - apenas transfere

---

## 📊 Movimentações Consideradas

### Para Cálculo de Meta (APENAS Vendas)
```sql
SELECT SUM(quantidade) 
FROM vw_movimentacao_detalhada
WHERE descricao_tipo_movimento = 'Vendas'  -- APENAS vendas (tipo 55)
  AND cod_filial IN ('00', '01', '02', '05', '06')  -- Apenas filiais operacionais
  AND data_movimento >= [data_inicio]
```

### Movimentações IGNORADAS
```sql
-- NÃO considerar:
WHERE descricao_tipo_movimento IN (
  'Saída Transferência',      -- Tipo 64 - transferências entre filiais
  'Saída Avulsa (Ajuste)'     -- Tipo 54 - ajustes de estoque
)
-- E também NÃO considerar filiais:
WHERE cod_filial NOT IN ('03', '04')  -- Garantia e CD
```

### Tipos de Movimento na View
| Tipo | Descrição | Usar no DRP? |
|------|-----------|--------------|
| 55 | Vendas | ✅ **SIM** - Base do cálculo |
| 64 | Saída Transferência | ❌ NÃO - Movimentação interna |
| 54 | Saída Avulsa (Ajuste) | ❌ NÃO - Correção de estoque |

---

## 🎯 Casos Especiais

### Caso 1: Produto Novo
- Se não tem movimentação em nenhuma filial operacional
- Usar **estoque mínimo** como meta inicial

### Caso 2: Produto Zerado
- Se estoque = 0 em uma filial operacional
- Meta = MAX(Saída últimos X dias, Estoque Mínimo)

### Caso 3: Produto com Excesso
- Se estoque > meta em uma filial
- Necessidade = 0 (não precisa repor)
- Sugestão: Considerar transferência para outra filial

### Caso 4: CD sem Estoque
- Aplicar **rateio proporcional** entre as 5 filiais
- Calcular **déficit** para sugestão de compra

---

## 🚫 Restrições

### O que NÃO fazer:
1. ❌ Não calcular necessidade para **Garantia (03)**
2. ❌ Não calcular necessidade para **CD (04)**
3. ❌ Não usar movimentações da Garantia no cálculo de meta
4. ❌ Não usar "vendas" do CD (ele não vende)
5. ❌ Não sugerir transferências para Garantia via DRP

### O que FAZER:
1. ✅ Calcular necessidade apenas para as **5 filiais operacionais**
2. ✅ Usar apenas movimentações de **SAÍDA** das filiais operacionais
3. ✅ Buscar estoque disponível no **CD (04)**
4. ✅ Aplicar **rateio proporcional** quando CD não tem suficiente
5. ✅ Sugerir **compra** quando déficit for identificado

---

## 📈 Exemplo Prático

### Cenário:
- **Produto:** OLEO-15W40
- **Período:** 90 dias

### Cálculo:

| Filial | Saída 90d | Estoque | Meta | Necessidade |
|--------|-----------|---------|------|-------------|
| Petrolina (00) | 80 | 10 | 80 | 70 |
| Juazeiro (01) | 50 | 20 | 50 | 30 |
| Salgueiro (02) | 40 | 0 | 40 | 40 |
| Bonfim (05) | 30 | 15 | 30 | 15 |
| Picos (06) | 20 | 5 | 20 | 15 |
| **Garantia (03)** | - | - | - | **NÃO CALCULA** |
| **CD (04)** | - | 100 | - | **É A ORIGEM** |

**Necessidade Total:** 70 + 30 + 40 + 15 + 15 = **170 unidades**  
**Estoque CD:** 100 unidades  
**Déficit:** 70 unidades  
**Status:** Rateio necessário (100 / 170 = 58.8%)

---

## 🔍 Validações do Sistema

### Backend:
```typescript
// Filiais válidas para DRP
const FILIAIS_DRP = ['00', '01', '02', '05', '06']

// Filiais excluídas
const FILIAL_GARANTIA = '03'  // Não entra no DRP
const CD_FILIAL = '04'         // Origem (não destino)
```

### Frontend:
```typescript
// Apenas filiais operacionais aparecem nas opções
const FILIAIS = [
  { cod: '00', nome: 'Petrolina' },
  { cod: '01', nome: 'Juazeiro' },
  { cod: '02', nome: 'Salgueiro' },
  { cod: '05', nome: 'Bonfim' },
  { cod: '06', nome: 'Picos' }
]
// Garantia (03) não aparece nas opções
```

---

## 📝 Observações Importantes

1. **Garantia (03)** tem fluxo próprio de movimentação (entrada/saída de garantias)
2. **CD (04)** é apenas um "hub" de distribuição, não tem vendas próprias
3. O sistema DRP foca apenas nas **5 filiais operacionais** que faturam
4. Movimentações da Garantia e CD são ignoradas no cálculo de meta
5. Estoque do CD é usado como **fonte** para distribuição

---

**Versão:** 1.0  
**Data:** 26/01/2026  
**Atualizado:** Regras de negócio definidas - Garantia e CD excluídos do DRP
