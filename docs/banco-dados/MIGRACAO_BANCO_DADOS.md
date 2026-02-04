# 🔄 Migração de Banco de Dados - DRP Compras Bezerra

**Data:** 28/01/2026  
**Status:** ✅ Concluída

---

## 📋 Objetivo

Consolidar todos os dados em um único banco de dados (Banco de Auditoria), organizando as tabelas no schema `auditoria_integracao` e descontinuando o uso do banco antigo.

---

## 🗄️ Banco de Dados

### ✅ Banco Principal (Novo)
```
Host: 95.111.255.122:4214
Database: banco-dados-bezerra
Schema: auditoria_integracao
```

### ❌ Banco Antigo (Descontinuado)
```
Host: 147.93.144.135:1254
Database: dados-bezerra
Schema: public
```

---

## 📊 Tabelas Migradas

### 1. Tabelas de Combinados

| Tabela Origem | Tabela Destino | Registros |
|---------------|----------------|-----------|
| `combinados` | `Grupo_Combinado_DRP` | 6.700 |
| `combinados_produtos` | `Produtos_Combinado_DRP` | 19.273 |

**VIEW Criada:** `vw_grupo_combinado_detalhado`

---

### 2. Tabelas Dimensão

| Tabela Origem | Tabela Destino | Registros | Colunas |
|---------------|----------------|-----------|---------|
| `dim_fabricante` | `Fabricante` | 948 | 4 |
| `dim_familia` | `Familia` | 82 | 6 |
| `dim_fornecedor` | `Fornecedor` | 845 | 36 |
| `dim_grupo` | `Grupo` | 77 | 2 |
| `dim_subgrupo` | `Subgrupo` | 1.071 | 3 |
| `dim_tipo_movimento` | `Tipo_Movimento` | 7 | 4 |
| `dim_produto` | `Dim_Produto` | - | - |

**Nota:** `Dim_Produto` já existia no banco de auditoria.

---

### 3. Tabelas de Estoque e Movimentação

| Tabela | Descrição |
|--------|-----------|
| `Estoque_DRP` | Estoque atual por produto e filial |
| `Movimentacao_DRP` | Histórico de movimentações |

---

### 4. Tabelas de Configuração

| Tabela | Descrição | Registros |
|--------|-----------|-----------|
| `config_regras_estoque` | Regras de cobertura de estoque | 1 |

**VIEW Criada:** `vw_analise_estoque_cobertura`  
**Função Criada:** `calcular_metricas_estoque`

---

## 🗂️ Estrutura Final do Banco

```
auditoria_integracao/
│
├─ 📊 Tabelas de Estoque
│  ├─ Estoque_DRP
│  └─ Movimentacao_DRP
│
├─ 📊 Tabelas Dimensão
│  ├─ Dim_Produto
│  ├─ Fabricante (948)
│  ├─ Familia (82)
│  ├─ Fornecedor (845)
│  ├─ Grupo (77)
│  ├─ Subgrupo (1.071)
│  └─ Tipo_Movimento (7)
│
├─ 📊 Tabelas de Combinados
│  ├─ Grupo_Combinado_DRP (6.700)
│  └─ Produtos_Combinado_DRP (19.273)
│
├─ 📊 Configurações
│  └─ config_regras_estoque
│
├─ 👁️  VIEWs
│  ├─ vw_analise_estoque_cobertura
│  └─ vw_grupo_combinado_detalhado
│
└─ ⚙️  Funções
   └─ calcular_metricas_estoque
```

---

## 📈 Estatísticas Totais

| Categoria | Quantidade |
|-----------|------------|
| **Tabelas** | 13 |
| **VIEWs** | 2 |
| **Funções** | 1 |
| **Registros Migrados** | ~29.000 |

---

## ⚙️ Configuração Atualizada

### Antes (.env)
```bash
DATABASE_URL="postgres://postgres:12be35dd1e93eead5a07@147.93.144.135:1254/dados-bezerra?sslmode=disable"
DATABASE_AUDITORIA_URL="postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable"
```

### Depois (.env)
```bash
DATABASE_URL="postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable"
# DATABASE_URL_ANTIGO="postgres://postgres:12be35dd1e93eead5a07@147.93.144.135:1254/dados-bezerra?sslmode=disable"
```

---

## 🚀 Scripts de Migração Criados

### Combinados
- `buscar-combinado-banco-antigo.ts` - Análise da estrutura
- `copiar-combinados-rapido.ts` - Cópia rápida em lote
- `renomear-tabelas-combinados.ts` - Renomeação para padrão DRP
- `renomear-produtos-combinado.ts` - Ajuste final de nomenclatura

### Dimensões
- `copiar-tabelas-dimensao.ts` - Cópia de 5 tabelas dimensão
- `copiar-tipo-movimento.ts` - Cópia de tipos de movimento

### Reorganização
- `reorganizar-banco-auditoria.sql` - Script SQL de reorganização
- `executar-reorganizacao-completa.ts` - Execução completa

---

## ✅ Benefícios da Migração

1. **Centralização:** Todos os dados em um único banco
2. **Organização:** Schema único `auditoria_integracao`
3. **Performance:** Banco otimizado para DRP
4. **Manutenção:** Mais fácil gerenciar um único banco
5. **Nomenclatura:** Padrão consistente sem prefixo "dim_"
6. **Escalabilidade:** Estrutura preparada para crescimento

---

## 📝 Próximos Passos Recomendados

1. ✅ Atualizar arquivo `.env` em produção
2. ✅ Testar aplicação com novo banco
3. ⚠️ Manter backup do banco antigo por 30 dias
4. ⚠️ Atualizar documentação da API
5. ⚠️ Verificar todas as queries que usavam banco antigo
6. ⚠️ Desativar acesso ao banco antigo após validação

---

## 🔒 Segurança

- ✅ Backup do banco antigo realizado
- ✅ Dados validados após migração
- ✅ Constraints e índices recriados
- ✅ Foreign keys configuradas

---

## 📞 Suporte

Para dúvidas sobre a migração:
- Consultar scripts em: `backend/scripts/`
- Documentação: `MIGRACAO_BANCO_DADOS.md`
- Estrutura: `TABELA_CONFIG_DRP.md`

---

**Migração concluída com sucesso em 28/01/2026** ✅
