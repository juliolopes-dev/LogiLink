# Múltiplos de Venda - DRP

## 📋 Visão Geral

Sistema de configuração de múltiplos de venda para arredondamento automático nas sugestões de distribuição do DRP.

## 🎯 Objetivo

Garantir que as sugestões de quantidade respeitem os múltiplos de venda dos produtos (ex: vendidos em caixas de 4, pares, dúzias, etc).

## 🗄️ Banco de Dados

### Tabela: `Produto_Config_DRP`

**Schema:** `auditoria_integracao`

```sql
CREATE TABLE auditoria_integracao."Produto_Config_DRP" (
  cod_produto VARCHAR(20) PRIMARY KEY,
  multiplo_venda INTEGER NOT NULL DEFAULT 1,
  observacao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Campos:**
- `cod_produto`: Código do produto (chave primária)
- `multiplo_venda`: Múltiplo para arredondamento (padrão: 1)
- `observacao`: Observação opcional (ex: "Vendido em caixas de 4")
- `ativo`: Se a configuração está ativa
- `created_at`: Data de criação
- `updated_at`: Data da última atualização

## 🔧 Implementação

### Backend

#### Endpoints

**1. Listar Configurações**
```
GET /api/produto-config?q=termo_busca
```

**2. Criar/Atualizar Configuração**
```
POST /api/produto-config
Body: {
  cod_produto: string,
  multiplo_venda: number,
  observacao?: string,
  ativo?: boolean
}
```

**3. Salvar Múltiplos Produtos**
```
POST /api/produto-config/batch
Body: {
  produtos: string[],
  multiplo_venda: number,
  observacao?: string,
  ativo?: boolean
}
```

**4. Atualizar Múltiplo**
```
PATCH /api/produto-config/:cod_produto/multiplo
Body: { multiplo_venda: number }
```

**5. Deletar Configuração**
```
DELETE /api/produto-config/:cod_produto
```

#### Lógica de Arredondamento

```typescript
const arredondarMultiplo = (valor: number, multiplo: number): number => {
  if (multiplo <= 1) return Math.round(valor)
  return Math.ceil(valor / multiplo) * multiplo
}
```

**Exemplos:**
- `arredondarMultiplo(9, 4)` → 12
- `arredondarMultiplo(13, 4)` → 16
- `arredondarMultiplo(5, 1)` → 5

### DRPs que Usam Múltiplos

#### 1. DRP por Produto (`/api/drp/calcular`)
- Busca `multiplo_venda` via LEFT JOIN
- Aplica arredondamento nas alocações sugeridas
- Produtos sem configuração usam múltiplo = 1

#### 2. DRP por NF (`/api/nf-entrada/cd/calcular-drp`)
- Busca `multiplo_venda` para cada produto da NF
- Aplica arredondamento nas alocações
- Distribui por múltiplos quando estoque insuficiente
- Produtos sem configuração usam múltiplo = 1

## 🎨 Frontend

### Painel de Configuração

**Localização:** Menu → Configurações

**Funcionalidades:**
- ✅ Busca de produtos (sem limite)
- ✅ Seleção múltipla com checkboxes
- ✅ Botão "Selecionar Todos"
- ✅ Edição inline (clique no número)
- ✅ Notificações toast
- ✅ Salvamento em lote otimizado

### Como Usar

1. **Configurar produtos:**
   - Acesse Menu → Configurações
   - Busque produtos (ex: "disco de freio")
   - Selecione um ou vários produtos
   - Defina o múltiplo de venda
   - Adicione observação (opcional)
   - Salvar

2. **Editar múltiplo:**
   - Clique no número do múltiplo na tabela
   - Digite o novo valor
   - Clique no ✓ para salvar

3. **Remover configuração:**
   - Clique no ícone de lixeira
   - Confirme a remoção
   - Produto volta a usar múltiplo = 1

## 📊 Exemplos de Uso

### Exemplo 1: Velas (vendidas em caixas de 4)

**Configuração:**
- Produto: 052680
- Múltiplo: 4
- Observação: "Vendido em caixas de 4"

**Resultado no DRP:**
- Sugestão original: 9 unidades
- Sugestão arredondada: 12 unidades (3 caixas)

### Exemplo 2: Discos de Freio (vendidos aos pares)

**Configuração:**
- Produtos: Todos os discos de freio
- Múltiplo: 2
- Observação: "Vendido em pares"

**Resultado no DRP:**
- Sugestão original: 7 unidades
- Sugestão arredondada: 8 unidades (4 pares)

## ⚠️ Observações Importantes

1. **Produtos sem configuração:** Continuam funcionando normalmente (múltiplo = 1)
2. **Arredondamento sempre para cima:** Garante que a necessidade seja atendida
3. **Performance:** Salvamento em lote usa 1 query única (otimizado)
4. **Validação:** Múltiplo mínimo = 1

## 🔄 Migração

Para criar a tabela em produção:

```bash
cd backend
npx tsx scripts/criar-tabela-produto-config-drp.ts
```

## 📝 Histórico

- **2026-02-02:** Implementação inicial
  - Tabela `Produto_Config_DRP`
  - Painel de configuração
  - Integração com 3 tipos de DRP
  - Seleção múltipla e salvamento em lote
  - Sistema de notificações toast
