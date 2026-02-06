# 📋 CONTEXTO DO PROJETO - LogiLink

## Última Sessão: 06/Fevereiro/2026

---

## ✅ O que foi feito nesta sessão

### 1. Filial de Origem no Banco (Pedido_DRP)
- Adicionadas colunas `cod_filial_origem` e `nome_filial_origem` na tabela `Pedido_DRP`
- Script de migração: `backend/scripts/adicionar-filial-origem-pedido-drp.ts`
- 29 registros existentes atualizados com CD (04) como padrão
- INSERTs atualizados nos dois endpoints (DRP por NF e DRP por Produto)

### 2. Geração de Pedidos — Todos os Produtos
- **Bug corrigido:** Frontend enviava apenas os produtos da página atual ao gerar pedidos
- **Correção:** Agora envia `todosProdutos` (todos os itens calculados)

### 3. Lotes de 30 SKUs por Pedido
- Pedidos DRP por Produto agora são divididos em lotes de **30 SKUs** por filial
- Exemplo: Petrolina com 80 itens → 3 pedidos (30 + 30 + 20)

### 4. Webhook Resumido
- Antes: 1 disparo por pedido com delay de 2 segundos entre cada
- Agora: **1 único disparo** com lista resumida de todos os pedidos gerados
- Campos: `total_pedidos` + array `pedidos` (numero_pedido, cod_filial, nome_filial, total_itens, total_quantidade)

### 5. Estoque Mínimo Dinâmico no DRP por Produto
- **Antes:** DRP por Produto usava apenas tabela antiga `Estoque_DRP.estoque_minimo`
- **Agora:** Usa função compartilhada `buscarEstoqueMinimoAtualizado`:
  - 1º → tabela `estoque_minimo` (cálculo automático ABC + tendência + sazonalidade)
  - 2º → tabela `Estoque_DRP` (fallback)
- Função extraída para `backend/src/utils/drp/estoque-minimo.ts` (compartilhada entre DRP NF e DRP Produto)

### 6. Proteção da Filial de Origem
- **CD (04):** Distribui todo o estoque (sem proteção)
- **Outras filiais:** Reserva o estoque mínimo dinâmico antes de distribuir
- Exemplo: Petrolina com 50 de estoque e 20 de est. mínimo → distribui apenas 30

---

## 📁 Arquivos Alterados

| Arquivo | Alteração |
|---------|-----------|
| `backend/scripts/adicionar-filial-origem-pedido-drp.ts` | **NOVO** — Script migração colunas filial origem |
| `backend/src/utils/drp/estoque-minimo.ts` | **NOVO** — Função compartilhada estoque mínimo dinâmico |
| `backend/src/utils/drp/index.ts` | Export da nova função |
| `backend/src/utils/webhook-pedido.ts` | Webhook resumido (1 disparo com lista de pedidos) |
| `backend/src/services/drp/produto.service.ts` | Estoque mínimo dinâmico + proteção filial origem |
| `backend/src/routes/drp/produto.routes.ts` | Lotes 30 SKUs + filial origem no INSERT |
| `backend/src/routes/nf-entrada.ts` | Import função compartilhada + filial origem no INSERT |
| `frontend/src/pages/AnaliseDRP.tsx` | Enviar todosProdutos ao gerar pedidos |
| `docs/DRP/CALCULO_DRP_PRODUTO.md` | Documentação atualizada |
| `docs/ESTOQUE_MINIMO.md` | Documentação atualizada |

---

### 7. Correções de Bugs
- **Coluna `manual` inexistente** → corrigido para `metodo = 'automatico'` na query de estoque mínimo
- **Payload Too Large** → `bodyLimit` aumentado para 50MB na rota `/api/drp/gerar-pedidos`

---

## 🧪 O que foi testado
- Script de migração executado com sucesso (29 registros atualizados)
- Commits e push realizados sem erros
- Deploy e teste de geração de pedidos

## ⏭️ Próximos Passos
- Verificar se webhook resumido chega corretamente no n8n
- Testar proteção da filial de origem selecionando uma filial diferente do CD
- Testar estoque mínimo dinâmico comparando valores com o sistema antigo

---

## 🔗 URLs Importantes
- **Webhook n8n:** `https://n8n-n8n.tbs25p.easypanel.host/webhook/197fdaf9-a28c-4e34-ba63-1fd37a79523b`
