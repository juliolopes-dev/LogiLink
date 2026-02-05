# Documentação DRP - LogiLink

## 📚 Índice de Documentação

### 🎯 Tipos de DRP (Documentação Completa)

1. **[DRP por Produto](./DRP_PRODUTO.md)** 📦
   - Distribuição do CD para filiais
   - Análise por SKU individual
   - Suporte a combinados e múltiplos
   - Request/Response detalhados
   - Exemplos práticos

2. **[DRP por NF](./DRP_NF.md)** 📋
   - Distribuição de NF de entrada
   - Volume = quantidade da NF
   - Priorização de filiais
   - Request/Response detalhados
   - Fluxo completo

### ⚙️ Funcionalidades Compartilhadas

4. **[Produtos Combinados](./COMBINADOS.md)** ⭐ **ESSENCIAL**
   - Grupos de produtos equivalentes
   - Usado em TODOS os DRPs
   - Cálculo de vendas/estoque agregado
   - Estrutura de banco de dados

5. **[Múltiplos de Venda](./MULTIPLOS_VENDA.md)** 📐
   - Arredondamento automático
   - Configuração por produto
   - Painel de gerenciamento
   - Integração com todos os DRPs

### 📱 Recursos do Sistema

6. **[Notificações Push](./NOTIFICACOES_PUSH.md)** 🔔
   - Firebase Cloud Messaging
   - Configuração e setup
   - API de notificações
   - Exemplos de uso

## 🚀 Início Rápido

### Qual DRP usar?

| Situação | DRP Recomendado |
|----------|-----------------|
| Distribuir estoque do CD | [DRP por Produto](./DRP_PRODUTO.md) |
| NF chegou no CD | [DRP por NF](./DRP_NF.md) |
| Produto sem histórico | Todos usam [Combinados](./COMBINADOS.md) |
| Arredondar quantidades | Todos usam [Múltiplos](./MULTIPLOS_VENDA.md) |

## 📊 Comparação dos DRPs

| Aspecto | DRP Produto | DRP NF |
|---------|-------------|--------|
| **Origem** | CD (04) | Quantidade NF |
| **Destino** | Múltiplas filiais | Múltiplas filiais |
| **Volume** | Estoque total CD | Qtd recebida na NF |
| **Objetivo** | Distribuir estoque | Distribuir recebimento |
| **Combinados** | ✅ Sim | ✅ Sim |
| **Múltiplos** | ✅ Sim | ✅ Sim |
| **Gera pedido** | ❌ Não | ✅ Sim |

## ⭐ Fluxo Padrão de Cálculo (Todos os DRPs)

```
1. Buscar vendas do produto no período
   ↓
2. Produto tem vendas próprias?
   ├── SIM → Usar vendas do produto
   └── NÃO → Verificar se pertence a grupo combinado
              ├── SIM → Usar vendas do GRUPO combinado
              └── NÃO → Usar estoque mínimo (se configurado)
   ↓
3. Calcular necessidade por filial (Meta - Estoque)
   ↓
4. Aplicar arredondamento por múltiplo de venda
   ↓
5. Distribuir estoque disponível
```

**Prioridade de cálculo:**
| # | Tipo | Descrição |
|---|------|-----------|
| 1 | Vendas | Produto tem histórico de vendas próprio |
| 2 | Combinado | Sem vendas próprias, usa vendas do grupo |
| 3 | Estoque Mínimo | Sem vendas, usa estoque mínimo configurado |
| 4 | Sem Histórico | Sem dados para calcular |

## 🗄️ Estrutura de Banco de Dados

### Tabelas Principais

- `auditoria_integracao.auditoria_produtos_drp` - Produtos
- `auditoria_integracao.Estoque_DRP` - Estoque por filial
- `auditoria_integracao.Movimentacao_DRP` - Movimentações (vendas)
- `auditoria_integracao.NF_Entrada_DRP` - Notas fiscais de entrada
- `auditoria_integracao.Produto_Config_DRP` - Configurações de produtos (múltiplos)
- `auditoria_integracao.Produtos_Combinado_DRP` - Grupos de produtos combinados

## 🔧 Configurações

### Filiais
```typescript
const FILIAIS_MAP = {
  '00': 'Petrolina',
  '01': 'Juazeiro',
  '02': 'Salgueiro',
  '04': 'CD',
  '05': 'Bonfim',
  '06': 'Picos'
}
```

### Tipos de Movimento
- `'55'` - Saída (Venda)
- `'01'` - Entrada NF (Compra)

## 📊 Fluxo de Trabalho

### DRP por Produto
1. Selecionar filial origem
2. Definir período de análise
3. Buscar/selecionar produto
4. Escolher filiais destino
5. Calcular DRP
6. Revisar sugestões
7. Gerar pedidos (futuro)

### DRP por NF
1. Buscar NF de entrada no CD
2. Selecionar NF
3. Definir período de análise
4. Calcular DRP
5. Revisar distribuição
6. Gerar pedidos

## 🚀 Próximas Implementações

- [ ] Validação com usuário antes de gerar pedidos
- [ ] Histórico de pedidos gerados
- [ ] Dashboard de análise DRP
- [ ] Exportação de relatórios
- [ ] Integração com sistema de pedidos

## 📝 Convenções

### Nomenclatura
- **Estoque CD:** Estoque na filial de origem (pode ser qualquer filial, não apenas CD)
- **Estoque Bloqueado:** Considerado como "a caminho" (disponível)
- **Meta:** Vendas do período ou estoque mínimo
- **Necessidade:** Meta - Estoque Atual
- **Alocação Sugerida:** Quantidade a transferir (arredondada por múltiplo)

### Status
- **OK:** Estoque suficiente para atender todas as filiais
- **Rateio:** Estoque insuficiente, distribuição proporcional
- **Déficit:** Falta de estoque

## 🔗 Links Úteis

- [Backend Routes](../../backend/src/routes/)
- [Frontend Pages](../../frontend/src/pages/)
- [Scripts de Migração](../../backend/scripts/)
