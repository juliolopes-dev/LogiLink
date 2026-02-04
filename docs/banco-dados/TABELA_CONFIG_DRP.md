# 📋 Tabela de Configuração DRP

## 🎯 Objetivo

Tabela separada para armazenar configurações personalizadas do cálculo DRP **sem alterar as tabelas originais** que são importadas de outro sistema.

---

## 📊 Estrutura da Tabela: `config_drp`

### Colunas:

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| `id` | SERIAL | NOT NULL | Chave primária (auto-incremento) |
| `cod_produto` | VARCHAR(20) | NOT NULL | Código do produto (referência para `dim_produto`) |
| `cod_filial` | VARCHAR(2) | NULL | Código da filial (NULL = aplica para todas) |
| `estoque_minimo_custom` | DECIMAL(15,3) | NULL | Estoque mínimo personalizado |
| `dias_cobertura_custom` | INTEGER | NULL | Dias de cobertura personalizados |
| `meta_manual` | DECIMAL(15,3) | NULL | Meta de estoque definida manualmente |
| `ativo` | BOOLEAN | NOT NULL | Se a configuração está ativa (default: true) |
| `observacao` | TEXT | NULL | Observações sobre a configuração |
| `data_criacao` | TIMESTAMP | NOT NULL | Data de criação do registro |
| `data_atualizacao` | TIMESTAMP | NOT NULL | Data da última atualização |
| `usuario_criacao` | VARCHAR(100) | NULL | Usuário que criou |
| `usuario_atualizacao` | VARCHAR(100) | NULL | Usuário que atualizou |

### Constraints:

- **PRIMARY KEY**: `id`
- **UNIQUE**: `(cod_produto, cod_filial)` - Evita duplicatas
- **CHECK**: `estoque_minimo_custom >= 0`
- **CHECK**: `dias_cobertura_custom > 0`
- **CHECK**: `meta_manual >= 0`

### Índices:

- `idx_config_drp_produto` - Busca por produto
- `idx_config_drp_filial` - Busca por filial
- `idx_config_drp_ativo` - Filtro por configurações ativas

---

## 🔄 Lógica de Uso

### Prioridade de Valores:

O sistema usa a seguinte ordem de prioridade ao calcular o DRP:

```
1. meta_manual (se definida)
   ↓ (se NULL)
2. estoque_minimo_custom (se definido)
   ↓ (se NULL)
3. estoque_minimo da fato_estoque (valor padrão importado)
   ↓ (se NULL ou 0)
4. Cálculo automático (saída dos últimos X dias)
```

### Exemplos de Uso:

#### **Exemplo 1: Configuração Global (todas as filiais)**

```sql
INSERT INTO config_drp (
  cod_produto, 
  cod_filial, 
  estoque_minimo_custom,
  usuario_criacao
) VALUES (
  '000001',           -- Produto
  NULL,               -- NULL = aplica para todas as filiais
  50,                 -- Estoque mínimo de 50 unidades
  'admin'
);
```

**Resultado:** Produto `000001` terá estoque mínimo de 50 em **todas as filiais**.

---

#### **Exemplo 2: Configuração por Filial**

```sql
INSERT INTO config_drp (
  cod_produto, 
  cod_filial, 
  estoque_minimo_custom,
  usuario_criacao
) VALUES (
  '000001',           -- Produto
  '00',               -- Apenas Petrolina
  100,                -- Estoque mínimo de 100 unidades
  'admin'
);
```

**Resultado:** Produto `000001` terá estoque mínimo de 100 **apenas em Petrolina**.

---

#### **Exemplo 3: Meta Manual (ignora cálculo automático)**

```sql
INSERT INTO config_drp (
  cod_produto, 
  cod_filial, 
  meta_manual,
  observacao,
  usuario_criacao
) VALUES (
  '000001',           -- Produto
  '01',               -- Juazeiro
  200,                -- Meta fixa de 200 unidades
  'Produto sazonal - meta definida manualmente',
  'admin'
);
```

**Resultado:** Produto `000001` em Juazeiro sempre terá meta de 200, **independente do histórico de vendas**.

---

#### **Exemplo 4: Dias de Cobertura Personalizado**

```sql
INSERT INTO config_drp (
  cod_produto, 
  cod_filial, 
  dias_cobertura_custom,
  observacao,
  usuario_criacao
) VALUES (
  '000001',           -- Produto
  NULL,               -- Todas as filiais
  120,                -- 120 dias de cobertura
  'Produto de giro lento - usar 120 dias',
  'admin'
);
```

**Resultado:** Ao calcular DRP, usará saída dos últimos 120 dias (em vez dos 90 padrão).

---

## 🔍 Consultas Úteis

### 1. Buscar Configuração de um Produto

```sql
SELECT 
  c.*,
  p.descricao as produto_descricao
FROM config_drp c
LEFT JOIN dim_produto p ON c.cod_produto = p.cod_produto
WHERE c.cod_produto = '000001'
  AND c.ativo = true
ORDER BY c.cod_filial NULLS FIRST;
```

### 2. Listar Produtos com Configuração Personalizada

```sql
SELECT 
  c.cod_produto,
  p.descricao,
  COUNT(*) as total_configs,
  COUNT(CASE WHEN c.cod_filial IS NULL THEN 1 END) as config_global,
  COUNT(CASE WHEN c.cod_filial IS NOT NULL THEN 1 END) as config_por_filial
FROM config_drp c
LEFT JOIN dim_produto p ON c.cod_produto = p.cod_produto
WHERE c.ativo = true
GROUP BY c.cod_produto, p.descricao
ORDER BY total_configs DESC;
```

### 3. Obter Estoque Mínimo Efetivo (com prioridade)

```sql
SELECT 
  e.cod_produto,
  e.cod_filial,
  COALESCE(
    c.estoque_minimo_custom,  -- 1ª prioridade: custom
    e.estoque_minimo,          -- 2ª prioridade: padrão
    0                          -- 3ª prioridade: zero
  ) as estoque_minimo_efetivo
FROM fato_estoque e
LEFT JOIN config_drp c ON 
  e.cod_produto = c.cod_produto 
  AND (c.cod_filial = e.cod_filial OR c.cod_filial IS NULL)
  AND c.ativo = true
WHERE e.cod_produto = '000001';
```

---

## 🛠️ Script de Criação

Execute o script para criar a tabela:

```bash
cd backend
npx tsx scripts/criar_tabela_config_drp.ts
```

Depois, gere o Prisma Client:

```bash
npx prisma generate
```

---

## 📝 Casos de Uso

### **Caso 1: Produto Novo sem Histórico**

**Problema:** Produto acabou de ser cadastrado, não tem movimentação.

**Solução:**
```sql
INSERT INTO config_drp (cod_produto, estoque_minimo_custom, usuario_criacao)
VALUES ('NOVO-001', 10, 'admin');
```

### **Caso 2: Produto Sazonal**

**Problema:** Produto tem picos de venda em períodos específicos.

**Solução:**
```sql
INSERT INTO config_drp (cod_produto, meta_manual, observacao, usuario_criacao)
VALUES ('SAZONAL-001', 500, 'Pico em dezembro - meta fixa', 'admin');
```

### **Caso 3: Filial com Demanda Diferente**

**Problema:** Petrolina vende muito mais que outras filiais.

**Solução:**
```sql
-- Petrolina: estoque maior
INSERT INTO config_drp (cod_produto, cod_filial, estoque_minimo_custom, usuario_criacao)
VALUES ('000001', '00', 200, 'admin');

-- Outras filiais: estoque padrão (não precisa configurar)
```

### **Caso 4: Produto de Giro Lento**

**Problema:** Produto vende pouco, histórico de 90 dias não é suficiente.

**Solução:**
```sql
INSERT INTO config_drp (cod_produto, dias_cobertura_custom, observacao, usuario_criacao)
VALUES ('LENTO-001', 180, 'Giro lento - usar 6 meses', 'admin');
```

---

## 🎨 Interface de Configuração (Futura)

### Tela de Configuração:

```
┌─────────────────────────────────────────────────┐
│ Configurações DRP                               │
├─────────────────────────────────────────────────┤
│                                                 │
│ Produto: [OLEO-15W40________] [Buscar]         │
│                                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ CONFIGURAÇÃO GLOBAL (Todas as Filiais)     ││
│ │                                             ││
│ │ Estoque Mínimo: [50___] unidades            ││
│ │ Dias Cobertura: [90___] dias                ││
│ │ Meta Manual:    [_____] (opcional)          ││
│ │                                             ││
│ │ [Salvar Global]                             ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ CONFIGURAÇÃO POR FILIAL                     ││
│ │                                             ││
│ │ Filial: [Petrolina ▼]                       ││
│ │ Estoque Mínimo: [100__] unidades            ││
│ │ Meta Manual:    [_____] (opcional)          ││
│ │                                             ││
│ │ [Adicionar Filial]                          ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ CONFIGURAÇÕES ATIVAS                        ││
│ │                                             ││
│ │ Filial    │ Est.Mín │ Meta  │ Ações        ││
│ │ ──────────────────────────────────────────  ││
│ │ (Global)  │ 50      │ -     │ [Editar][X] ││
│ │ Petrolina │ 100     │ -     │ [Editar][X] ││
│ │ Juazeiro  │ -       │ 200   │ [Editar][X] ││
│ └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

---

## ✅ Vantagens desta Abordagem

1. ✅ **Não altera tabelas originais** - Dados importados ficam intactos
2. ✅ **Flexibilidade** - Configuração global ou por filial
3. ✅ **Auditoria** - Rastreia quem criou/alterou e quando
4. ✅ **Reversível** - Pode desativar sem deletar
5. ✅ **Priorização clara** - Sistema sabe qual valor usar
6. ✅ **Observações** - Documenta o motivo da configuração

---

## 🔒 Segurança

- Apenas usuários autorizados podem criar/editar configurações
- Histórico de alterações (data_criacao, data_atualizacao)
- Rastreamento de usuário (usuario_criacao, usuario_atualizacao)
- Validações de integridade (CHECK constraints)

---

## 📚 Referências

- Documentação DRP: `ANALISE_DRP.md`
- Schema Prisma: `backend/prisma/schema.prisma`
- Script de Criação: `backend/scripts/criar_tabela_config_drp.ts`

---

**Versão:** 1.0  
**Data:** 26/01/2026
