# 🔄 Migração de Movimentação para Banco de Auditoria

## 📋 Resumo

Migração da tabela `fato_movimentacao` do banco antigo para a VIEW unificada `Movimentacao_DRP` no banco de auditoria.

---

## 🎯 Objetivo

Utilizar os dados de movimentação das tabelas separadas por filial no banco de auditoria, unificando-as através de uma VIEW para facilitar consultas.

---

## 📊 Estrutura

### **Banco Antigo (Atual)**
- **Host:** 147.93.144.135:1254
- **Banco:** dados-bezerra
- **Tabela:** `fato_movimentacao` (22 colunas)
- **Status:** ❌ Será descontinuado para movimentação

### **Banco Novo (Auditoria)**
- **Host:** 95.111.255.122:4214
- **Banco:** banco-dados-bezerra
- **Schema:** auditoria_integracao
- **VIEW:** `Movimentacao_DRP`
- **Tabelas Base:**
  - `auditoria_mov_petrolina` (1.736.943 registros)
  - `auditoria_mov_juazeiro` (3.702.694 registros)
  - `auditoria_mov_salgueiro` (212.333 registros)
  - `auditoria_mov_picos` (92.828 registros)
  - `auditoria_mov_bonfim` (0 registros)

---

## 🔧 Passos de Implementação

### **1. Criar VIEW no Banco de Auditoria**

Execute o script SQL no banco de auditoria:

```bash
# Conectar no banco
psql -h 95.111.255.122 -p 4214 -U postgres -d banco-dados-bezerra

# Executar script
\i backend/scripts/criar-view-movimentacao-drp.sql
```

**Ou copie e execute o conteúdo do arquivo:**
- `backend/scripts/criar-view-movimentacao-drp.sql`

**Verificar criação:**
```sql
-- Verificar se VIEW existe
SELECT COUNT(*) FROM auditoria_integracao."Movimentacao_DRP";

-- Verificar distribuição por filial
SELECT 
  cod_filial,
  COUNT(*) as total_registros
FROM auditoria_integracao."Movimentacao_DRP"
GROUP BY cod_filial
ORDER BY cod_filial;
```

---

### **2. Configurar Variável de Ambiente**

Adicione no arquivo `.env` do backend:

```env
DATABASE_AUDITORIA_URL="postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable"
```

---

### **3. Instalar Dependência (se necessário)**

O pacote `pg` já foi instalado. Caso precise reinstalar:

```bash
cd backend
npm install pg @types/pg
```

---

### **4. Reiniciar Backend**

```bash
cd backend
npm run dev
```

---

## 🔌 Novas Rotas Disponíveis

### **1. Buscar Movimentações**
```
GET /api/movimentacoes
Query params:
  - cod_produto: string (opcional)
  - cod_filial: string (opcional)
  - data_inicio: date (opcional)
  - data_fim: date (opcional)
  - tipo_movimento: string (opcional)
  - limit: number (opcional)
```

**Exemplo:**
```bash
curl "http://localhost:3333/api/movimentacoes?cod_produto=000064&periodo_dias=90"
```

---

### **2. Buscar Vendas de Produto**
```
GET /api/movimentacoes/vendas/:cod_produto
Query params:
  - periodo_dias: number (padrão: 90)
  - cod_filial: string (opcional)
```

**Exemplo:**
```bash
curl "http://localhost:3333/api/movimentacoes/vendas/000064?periodo_dias=90"
```

---

### **3. Calcular Média de Vendas por Filial**
```
GET /api/movimentacoes/media-vendas/:cod_produto
Query params:
  - periodo_dias: number (padrão: 90)
```

**Exemplo:**
```bash
curl "http://localhost:3333/api/movimentacoes/media-vendas/000064?periodo_dias=90"
```

---

### **4. Buscar Histórico Mensal**
```
GET /api/movimentacoes/historico-mensal/:cod_produto
Query params:
  - meses: number (padrão: 6)
```

**Exemplo:**
```bash
curl "http://localhost:3333/api/movimentacoes/historico-mensal/000064?meses=6"
```

---

## 📦 Arquivos Criados

```
backend/
├── scripts/
│   └── criar-view-movimentacao-drp.sql    # Script SQL da VIEW
├── src/
│   ├── lib/
│   │   └── database-auditoria.ts          # Pool de conexão + helpers
│   └── routes/
│       └── movimentacao.ts                # Rotas de movimentação
└── .env.example                           # Exemplo de variáveis
```

---

## 🔄 Migração de Código Existente

### **Antes (usando fato_movimentacao):**
```typescript
const movimentacoes = await prisma.$queryRaw`
  SELECT * FROM fato_movimentacao
  WHERE cod_produto = ${codProduto}
  AND data_movimento >= ${dataInicio}
`
```

### **Depois (usando VIEW):**
```typescript
import { buscarMovimentacoes } from '../lib/database-auditoria'

const movimentacoes = await buscarMovimentacoes({
  codProduto: codProduto,
  dataInicio: dataInicio
})
```

---

## ⚠️ Campos Removidos

Os seguintes campos de `fato_movimentacao` **NÃO existem** nas novas tabelas:

- `filial_origem` → usar `cod_filial`
- `cod_grade` → NULL
- `estoque_anterior` → NULL
- `preco_medio_anterior` → NULL
- `numero_ordem` → NULL
- `turno` → NULL
- `id_item` → NULL
- `indicador_offline` → NULL

**Se o código usa esses campos, será necessário ajustar.**

---

## ✅ Campos Mapeados

| fato_movimentacao | Movimentacao_DRP | Tipo |
|-------------------|------------------|------|
| `documento` | `numero_documento` | varchar(20) |
| `preco_custo` | `valor_custo` | numeric |
| `preco_medio` | `valor_medio` | numeric |
| `preco_venda` | `valor_venda` | numeric |
| `preco_entrada` | `valor_entrada` | numeric |
| `data_sincronizacao` | `data_extracao` | timestamp |

---

## 🧪 Testes

### **Teste 1: Verificar conexão**
```bash
curl http://localhost:3333/api/health
```

### **Teste 2: Buscar movimentações de um produto**
```bash
curl "http://localhost:3333/api/movimentacoes?cod_produto=000064&limit=10"
```

### **Teste 3: Calcular média de vendas**
```bash
curl "http://localhost:3333/api/movimentacoes/media-vendas/000064?periodo_dias=90"
```

---

## 📊 Performance

### **Dados Atuais:**
- Total de registros: ~5.8 milhões
- Petrolina: 1.736.943
- Juazeiro: 3.702.694
- Salgueiro: 212.333
- Picos: 92.828
- Bonfim: 0

### **Otimizações:**
- ✅ VIEW com UNION ALL (mais rápido que UNION)
- ✅ Índices nas tabelas base
- ✅ Pool de conexões (max: 20)
- ✅ Queries parametrizadas

---

## 🚨 Atenção

1. **Bonfim sem dados** - Verificar por que não tem registros
2. **Backup** - Manter `fato_movimentacao` temporariamente
3. **Testes** - Validar todas as funcionalidades antes de remover código antigo
4. **Monitoramento** - Acompanhar performance das queries

---

## 📝 Próximos Passos

- [ ] Executar VIEW no banco de auditoria
- [ ] Configurar variável de ambiente
- [ ] Reiniciar backend
- [ ] Testar rotas de movimentação
- [ ] Atualizar código que usa `fato_movimentacao`
- [ ] Validar cálculos de DRP
- [ ] Documentar no PROJETO_STATUS.md

---

## 👤 Responsável

**Data:** 28/01/2026
**Autor:** Sistema DRP Bezerra
**Status:** ⏳ Aguardando execução da VIEW
