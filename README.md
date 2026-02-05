# 🚀 DRP Compras Bezerra

Sistema de **Distribuição e Reposição de Produtos (DRP)** para gerenciamento inteligente de estoque e compras da rede Bezerra.

---

## 📋 Sobre o Projeto


Sistema completo para análise de estoque, cálculo de necessidades de compra e gestão de distribuição entre filiais, com foco em otimização de estoque e redução de rupturas.

### 🎯 Funcionalidades Principais

- ✅ **Análise de Estoque:** Cálculo automático de cobertura e necessidades
- ✅ **Gestão de Combinados:** Produtos vendidos em conjunto
- ✅ **Movimentação:** Histórico completo de entradas e saídas
- ✅ **Multi-Filial:** Suporte para 5 filiais operacionais
- ✅ **API REST:** Endpoints para integração e consultas
- ✅ **Regras Configuráveis:** Lead time, estoque de segurança, cobertura

---

## 🏢 Filiais

| Código | Nome | Status |
|--------|------|--------|
| 00 | Petrolina | ✅ Operacional |
| 01 | Juazeiro | ✅ Operacional |
| 02 | Salgueiro | ✅ Operacional |
| 05 | Bonfim | ✅ Operacional |
| 06 | Picos | ✅ Operacional |
| 04 | CD (Centro Distribuição) | 🏭 Logística |

---

## 🛠️ Tecnologias

### Backend
- **Node.js** + **TypeScript**
- **Fastify** - Framework web
- **PostgreSQL** - Banco de dados
- **pg** - Pool de conexões

### Banco de Dados
- **PostgreSQL 14+**
- Schema: `auditoria_integracao`
- VIEWs e Funções PL/pgSQL

---

## 📊 Estrutura do Banco de Dados

### Tabelas Principais
- `Estoque_DRP` - Estoque atual por produto/filial
- `Movimentacao_DRP` - Histórico de movimentações
- `Grupo_Combinado_DRP` - Grupos de produtos combinados
- `Produtos_Combinado_DRP` - Produtos em cada combinado

### Tabelas Dimensão
- `Dim_Produto` - Cadastro de produtos
- `Fabricante`, `Familia`, `Fornecedor`
- `Grupo`, `Subgrupo`, `Tipo_Movimento`

### Configuração
- `config_regras_estoque` - Regras de cobertura

### VIEWs
- `vw_analise_estoque_cobertura` - Análise completa de estoque
- `vw_grupo_combinado_detalhado` - Combinados com produtos

---

## 🚀 Como Rodar

### 1. Pré-requisitos
```bash
Node.js 18+
PostgreSQL 14+
```

### 2. Instalação
```bash
# Clonar repositório
cd DRP-COMPRAS-BEZERRA

# Instalar dependências
cd backend
npm install
```

### 3. Configuração
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas credenciais
DATABASE_URL="postgres://user:pass@host:port/database"
```

### 4. Executar
```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

---

## 📡 API

### Endpoints Principais

#### Análise de Estoque
```bash
GET /api/analise-estoque
GET /api/analise-estoque/produto/:codigo
GET /api/analise-estoque/estatisticas
GET /api/analise-estoque/top-comprar
```

#### Regras de Estoque
```bash
GET /api/regras-estoque
PUT /api/regras-estoque/:id
```

**Documentação completa:** [`docs/api/API_ANALISE_ESTOQUE.md`](docs/api/API_ANALISE_ESTOQUE.md)

---

## 📈 Sistema de Análise de Estoque

### Como Funciona

1. **Cálculo de Demanda:** Automático baseado em vendas dos últimos 30 dias
2. **Cobertura Desejada:** 180 dias (configurável)
3. **Lead Time:** 30 dias (prazo de entrega)
4. **Estoque Segurança:** 30 dias (buffer)

### Status de Estoque

| Status | Cobertura | Ação |
|--------|-----------|------|
| RUPTURA_CRITICO | < 30 dias | Comprar urgente |
| RUPTURA_ALERTA | 30-60 dias | Programar compra |
| NORMAL | 60-216 dias | Manter |
| EXCESSO_ALERTA | 216-270 dias | Reduzir compras |
| EXCESSO_CRITICO | > 270 dias | Reduzir urgente |

**Documentação completa:** [`docs/sistema/SISTEMA_ANALISE_ESTOQUE.md`](docs/sistema/SISTEMA_ANALISE_ESTOQUE.md)

---

## 📚 Documentação

### Estrutura
```
docs/
├─ api/
│  └─ API_ANALISE_ESTOQUE.md          # Documentação da API
├─ banco-dados/
│  ├─ TABELA_CONFIG_DRP.md            # Estrutura do banco
│  └─ MIGRACAO_BANCO_DADOS.md         # Histórico de migração
├─ sistema/
│  ├─ SISTEMA_ANALISE_ESTOQUE.md      # Sistema de análise
│  └─ REGRAS_NEGOCIO_DRP.md           # Regras de negócio
└─ historico/
   ├─ CONTEXTO_INICIAL.md             # Contexto do projeto
   └─ MIGRACAO_MOVIMENTACAO.md        # Migração antiga
```

---

## 📊 Estatísticas

- **6.700** grupos de combinados
- **19.273** produtos em combinados
- **16.226** produtos analisados
- **5** filiais operacionais
- **455.414** unidades para comprar (exemplo)

---

## 🔧 Scripts Úteis

### Banco de Dados
```bash
# Copiar tabelas dimensão
npx tsx backend/scripts/copiar-tabelas-dimensao.ts

# Copiar combinados
npx tsx backend/scripts/copiar-combinados-rapido.ts

# Testar sistema de 180 dias
npx tsx backend/scripts/testar-sistema-180-dias.ts
```

---

## 📝 Status do Projeto

**Status Atual:** Consulte [`PROJETO_STATUS.md`](PROJETO_STATUS.md)

---

## 🤝 Contribuindo

1. Mantenha a documentação atualizada
2. Siga os padrões de código TypeScript
3. Teste antes de fazer commit
4. Atualize `PROJETO_STATUS.md` após mudanças significativas

---

## 📞 Suporte

Para dúvidas ou problemas:
- Consulte a documentação em `docs/`
- Verifique os scripts em `backend/scripts/`
- Revise `PROJETO_STATUS.md` para status atual

---

**Desenvolvido para Bezerra Auto Peças** 🚗
