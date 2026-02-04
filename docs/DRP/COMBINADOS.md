# 📦 Sistema de Combinados - DRP Bezerra

## O que são Combinados?

**Combinados** são grupos de produtos que representam o **mesmo item de marcas ou referências diferentes**. Por exemplo:

- Filtro de óleo para Gol 1.0 - Marca Tecfil
- Filtro de óleo para Gol 1.0 - Marca Fram
- Filtro de óleo para Gol 1.0 - Marca Mann

Esses 3 produtos são **combinados** porque atendem a mesma aplicação. O cliente pode comprar qualquer um deles.

---

## Por que usar Combinados?

### Problema sem Combinados:
- Produto novo (marca X) não tem histórico de vendas
- Sistema não sugere distribuição para as filiais
- Produto fica parado no CD enquanto a marca Y do mesmo item está vendendo bem

### Solução com Combinados:
- Produto novo é agrupado com produtos similares
- Sistema usa as **vendas do grupo** para calcular a necessidade
- Distribuição é feita baseada no histórico real de demanda

---

## Estrutura no Banco de Dados

### Tabela: `Grupo_Combinado_DRP`
Armazena os grupos de combinados.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | integer | ID único |
| `cod_grupo` | varchar | Código do grupo (ex: SYSCOMB1) |
| `descricao` | varchar | Descrição do grupo |
| `ativo` | boolean | Se o grupo está ativo |
| `observacao` | text | Observações |
| `created_at` | timestamp | Data de criação |
| `updated_at` | timestamp | Data de atualização |

### Tabela: `Produtos_Combinado_DRP`
Relaciona produtos aos grupos de combinados.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | integer | ID único |
| `cod_grupo` | varchar | Código do grupo combinado |
| `cod_produto` | varchar | Código do produto |
| `ordem` | integer | Ordem de prioridade |
| `created_at` | timestamp | Data de criação |

---

## Como Funciona no DRP

### ⚠️ Regra Importante: Vendas vs Estoque

| Dado | Usa Combinado? | Por quê? |
|------|----------------|----------|
| **Vendas** | ✅ SIM (soma do grupo) | Produto novo compete pelo mesmo mercado |
| **Estoque** | ❌ NÃO (só do produto) | Estoque é físico, específico do produto |

**Explicação:**
- Vendas combinadas fazem sentido porque produtos equivalentes competem pelo mesmo mercado
- Estoque combinado NÃO faz sentido porque o estoque é físico e específico de cada produto

### 1. DRP por Produto / DRP por NF

Quando o sistema calcula o DRP para um produto sem vendas próprias:

1. Verifica se o produto pertence a um grupo combinado
2. Se pertence, busca **todos os produtos do grupo**
3. **Soma as vendas** de todos os produtos do grupo no período → **META**
4. **Mantém o estoque real** do produto específico (NÃO soma!)
5. Calcula: `Necessidade = Meta (vendas grupo) - Estoque (só do produto)`

```
Exemplo:
Grupo SYSCOMB3636 em Juazeiro:
├── Produto 049808: Estoque = 1, Vendas = 0  ← Produto da NF
├── Produto 086553: Estoque = 2, Vendas = 10
└── Produto 106107: Estoque = 6, Vendas = 5

Para o produto 049808:
├── Meta (vendas combinadas) = 0 + 10 + 5 = 15 unidades ✅
├── Estoque = 1 unidade (só do 049808, NÃO soma 1+2+6=9) ✅
└── Necessidade = 15 - 1 = 14 unidades
```

**ERRADO seria:**
```
❌ Estoque combinado = 1 + 2 + 6 = 9
❌ Necessidade = 15 - 9 = 6 (incorreto!)
```

### 2. DRP por Nota Fiscal

Quando uma NF chega no CD com produtos novos:

1. Para cada produto da NF, verifica se pertence a um grupo combinado
2. Se o produto **não tem vendas próprias** mas pertence a um grupo:
   - ✅ Usa as **vendas do grupo combinado** como meta
   - ✅ Usa o **estoque real do produto** (NÃO combinado!)
   - Calcula: `Necessidade = Meta (vendas grupo) - Estoque (só do produto)`
3. Sugere distribuição baseada no histórico do grupo

---

## Prioridade de Cálculo

O sistema usa a seguinte ordem de prioridade:

| Prioridade | Tipo | Badge | Descrição |
|------------|------|-------|-----------|
| 1 | Vendas | 🟢 | Produto tem histórico de vendas próprio |
| 2 | Estoque Mínimo | 🟡 | Sem vendas, mas tem estoque mínimo configurado |
| 3 | Combinado | 🔵 | Sem vendas próprias, usa vendas do grupo combinado |
| 4 | Sem Histórico | ⚪ | Sem vendas, sem estoque mínimo, sem grupo combinado |

---

## Exemplo Prático

### Cenário:
- NF 483250 chegou no CD com produto **110661** (Filtro Tecfil)
- Produto 110661 não tem vendas nos últimos 90 dias
- Produto 110661 pertence ao grupo **SYSCOMB50**
- Grupo SYSCOMB50 contém: 110661, 098234, 087123
- Produtos 098234 e 087123 venderam 50 unidades no período

### Resultado:
- Sistema identifica que 110661 é combinado
- Usa vendas do grupo (50 un) como meta
- Distribui o produto 110661 proporcionalmente às filiais
- Badge exibido: 🔵 **Comb.**

---

## Gerenciamento de Combinados

### Criar Grupo Combinado

```sql
-- 1. Criar o grupo
INSERT INTO auditoria_integracao."Grupo_Combinado_DRP" 
(cod_grupo, descricao, ativo, created_at, updated_at)
VALUES ('MEUGRUPO1', 'Filtro de óleo Gol 1.0', true, NOW(), NOW());

-- 2. Adicionar produtos ao grupo
INSERT INTO auditoria_integracao."Produtos_Combinado_DRP" 
(cod_grupo, cod_produto, ordem, created_at)
VALUES 
('MEUGRUPO1', '110661', 1, NOW()),
('MEUGRUPO1', '098234', 2, NOW()),
('MEUGRUPO1', '087123', 3, NOW());
```

### Consultar Combinados

```sql
-- Ver todos os grupos com seus produtos
SELECT 
    g.cod_grupo,
    g.descricao,
    p.cod_produto,
    prod.descricao as produto_descricao
FROM auditoria_integracao."Grupo_Combinado_DRP" g
JOIN auditoria_integracao."Produtos_Combinado_DRP" p ON g.cod_grupo = p.cod_grupo
LEFT JOIN auditoria_integracao.auditoria_produtos_drp prod ON p.cod_produto = prod.cod_produto
WHERE g.ativo = true
ORDER BY g.cod_grupo, p.ordem;
```

### Verificar se Produto é Combinado

```sql
SELECT cod_grupo 
FROM auditoria_integracao."Produtos_Combinado_DRP"
WHERE cod_produto = '110661';
```

---

## Boas Práticas

1. **Agrupe apenas produtos equivalentes** - Mesmo item, marcas diferentes
2. **Mantenha grupos atualizados** - Adicione novos produtos quando chegarem
3. **Revise periodicamente** - Remova produtos descontinuados
4. **Use descrições claras** - Facilita identificação do grupo

---

## Endpoints da API

### Listar Grupos Combinados
```
GET /api/combinados
```

### Buscar Produtos de um Grupo
```
GET /api/combinados/:cod_grupo/produtos
```

### Criar Grupo Combinado
```
POST /api/combinados
Body: { cod_grupo, descricao, produtos: [cod_produto1, cod_produto2, ...] }
```

---

## Arquivos Relacionados

- `backend/src/routes/drp.ts` - Lógica de DRP com combinados
- `backend/src/routes/nf-entrada.ts` - DRP por NF com combinados
- `backend/src/routes/combinados.ts` - CRUD de combinados
- `frontend/src/pages/AnaliseDRP.tsx` - Interface de análise

---

*Documentação atualizada em: Janeiro/2026*
