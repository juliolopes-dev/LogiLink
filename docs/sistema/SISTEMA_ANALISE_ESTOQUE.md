# 📊 Sistema de Análise de Estoque - Resumo Completo

Sistema completo de análise de estoque com cálculo automático de demanda e cobertura de 180 dias.

---

## ✅ O Que Foi Criado

### 1️⃣ **Banco de Dados**

#### Tabela: `config_regras_estoque`
Armazena parâmetros configuráveis para cálculo de estoque.

**Campos principais:**
- `lead_time_dias`: Prazo de entrega (padrão: 30 dias)
- `estoque_seguranca_dias`: Dias de segurança (padrão: 30 dias)
- `cobertura_maxima_dias`: Meta de cobertura (padrão: 180 dias)
- `aplicar_global`: Se aplica para todos os produtos
- `cod_filial`: Aplicar para filial específica
- `ativo`: Se a regra está ativa

#### VIEW: `vw_analise_estoque_cobertura`
Calcula automaticamente análise de estoque para todos os produtos.

**Colunas principais:**
- `cod_produto`, `cod_filial`, `nome_filial`
- `estoque_atual`: Estoque atual do produto
- `vendas_30_dias`: Total vendido nos últimos 30 dias
- `demanda_diaria`: Calculada automaticamente (vendas/30)
- `cobertura_dias_atual`: Dias de cobertura atual
- `cobertura_desejada_dias`: Meta de cobertura (180 dias)
- `estoque_ideal`: Estoque para 60 dias (lead time + segurança)
- `estoque_cobertura_maxima`: Estoque para 180 dias
- `quantidade_comprar`: Quanto comprar para atingir 180 dias
- `status_estoque`: Status do produto
- `recomendacao`: Recomendação automática

#### Função: `calcular_metricas_estoque`
Calcula métricas de estoque para um produto específico.

**Parâmetros:**
- `p_estoque_atual`: Estoque atual
- `p_demanda_diaria`: Demanda diária
- `p_lead_time_dias`: Lead time (padrão: 30)
- `p_estoque_seguranca_dias`: Segurança (padrão: 30)

---

### 2️⃣ **API REST (Fastify)**

#### Endpoints Criados:

1. **GET** `/api/analise-estoque`
   - Lista produtos com análise
   - Filtros: status, filial, paginação
   - Retorna: lista paginada com análise completa

2. **GET** `/api/analise-estoque/produto/:codigo`
   - Análise de produto específico
   - Filtro: filial (opcional)
   - Retorna: análise detalhada do produto

3. **GET** `/api/analise-estoque/estatisticas`
   - Estatísticas gerais do estoque
   - Filtro: filial (opcional)
   - Retorna: totais por status, quantidade a comprar

4. **GET** `/api/analise-estoque/top-comprar`
   - Top produtos para comprar
   - Filtros: filial, limite
   - Retorna: produtos ordenados por quantidade a comprar

5. **GET** `/api/regras-estoque`
   - Lista regras configuradas
   - Retorna: todas as regras ativas

6. **PUT** `/api/regras-estoque/:id`
   - Atualiza regra de estoque
   - Body: lead_time, segurança, cobertura
   - Retorna: regra atualizada

---

### 3️⃣ **Scripts de Configuração**

#### `criar-tabela-config-regras-estoque.sql`
Cria tabela de configuração de regras.

#### `criar-funcao-calculo-excesso-estoque.sql`
Cria função de cálculo de métricas.

#### `criar-view-analise-estoque-automatica.sql`
Cria VIEW com análise automática.

#### `atualizar-regra-180-dias.sql`
Atualiza regra padrão para 180 dias.

#### `testar-sistema-180-dias.ts`
Script de teste completo do sistema.

---

## 🎯 Como Funciona

### Cálculo Automático de Demanda

```sql
Demanda Diária = SUM(vendas últimos 30 dias) / 30
```

**Exemplo:**
- Vendas (30 dias): 2.517 unidades
- Demanda Diária: 2.517 / 30 = **83,90 unidades/dia**

---

### Cálculo de Estoque Ideal (60 dias)

```sql
Estoque Ideal = Demanda Diária × (Lead Time + Estoque Segurança)
              = Demanda Diária × (30 + 30)
              = Demanda Diária × 60 dias
```

**Exemplo:**
- Demanda Diária: 83,90 unid/dia
- Estoque Ideal: 83,90 × 60 = **5.034 unidades**

---

### Cálculo para 180 Dias de Cobertura

```sql
Estoque para 180 dias = Demanda Diária × 180
```

**Exemplo:**
- Demanda Diária: 83,90 unid/dia
- Estoque 180 dias: 83,90 × 180 = **15.102 unidades**

---

### Quantidade a Comprar

```sql
Quantidade Comprar = Estoque para 180 dias - Estoque Atual
```

**Exemplo:**
- Estoque 180 dias: 15.102 unidades
- Estoque Atual: 488 unidades
- **Comprar: 14.614 unidades**

---

## 📊 Status de Estoque

| Status | Condição | Ação |
|--------|----------|------|
| **EXCESSO_CRITICO** | Cobertura > 270 dias | Reduzir compras urgentemente |
| **EXCESSO_ALERTA** | Cobertura > 216 dias | Reduzir próximas compras |
| **NORMAL** | Cobertura 60-216 dias | Manter |
| **RUPTURA_ALERTA** | Cobertura 30-60 dias | Programar compra |
| **RUPTURA_CRITICO** | Cobertura < 30 dias | Comprar urgentemente |

---

## 📈 Estatísticas do Sistema

**Dados atuais (testado em 28/01/2026):**

| Métrica | Valor |
|---------|-------|
| Total de Produtos | 16.226 |
| Ruptura Crítico | 7.350 (45,3%) |
| Ruptura Alerta | 2.650 (16,3%) |
| Normal | 4.454 (27,4%) |
| Excesso Alerta | 406 (2,5%) |
| Excesso Crítico | 1.366 (8,4%) |
| **Total a Comprar** | **455.414 unidades** |

---

## 🚀 Como Usar

### 1. Consultar Produtos em Ruptura

```bash
GET /api/analise-estoque?status=RUPTURA_CRITICO&limite=50
```

### 2. Ver Estatísticas por Filial

```bash
GET /api/analise-estoque/estatisticas?filial=00
```

### 3. Buscar Produto Específico

```bash
GET /api/analise-estoque/produto/121846?filial=00
```

### 4. Top 20 Produtos para Comprar

```bash
GET /api/analise-estoque/top-comprar?limite=20
```

### 5. Atualizar Cobertura Desejada

```bash
PUT /api/regras-estoque/1
{
  "cobertura_maxima_dias": 200,
  "usuario_atualizacao": "admin"
}
```

---

## 🔧 Configuração

### Parâmetros Ajustáveis

| Parâmetro | Valor Atual | Descrição |
|-----------|-------------|-----------|
| **Lead Time** | 30 dias | Prazo de entrega do fornecedor |
| **Estoque Segurança** | 30 dias | Buffer para incertezas |
| **Cobertura Desejada** | 180 dias | Meta de cobertura total |

### Como Alterar

**Via SQL:**
```sql
UPDATE public.config_regras_estoque
SET cobertura_maxima_dias = 200,
    lead_time_dias = 45,
    estoque_seguranca_dias = 30
WHERE nome_regra = 'REGRA_PADRAO_GLOBAL';
```

**Via API:**
```javascript
await fetch('/api/regras-estoque/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cobertura_maxima_dias: 200,
    lead_time_dias: 45,
    estoque_seguranca_dias: 30,
    usuario_atualizacao: 'admin'
  })
})
```

---

## 📋 Exemplo Prático

### Produto 121846 - Petrolina

**Situação Atual:**
```
Estoque Atual:       488 unidades
Vendas (30 dias):    2.517 unidades
Demanda Diária:      83,90 unidades/dia
Cobertura Atual:     5,82 dias ⚠️
```

**Análise:**
```
Estoque Ideal (60 dias):    5.034 unidades
Estoque para 180 dias:      15.102 unidades
Quantidade a Comprar:       14.614 unidades
Status:                     RUPTURA_CRÍTICO 🔴
```

**Recomendação:**
> Ruptura crítica! Cobertura de apenas 5,82 dias. Comprar urgentemente 14.614 unidades.

---

## ✅ Benefícios do Sistema

1. **Automático**: Calcula demanda das vendas reais
2. **Inteligente**: Recomenda quantidade exata a comprar
3. **Configurável**: Parâmetros ajustáveis por API
4. **Completo**: Analisa todos os produtos automaticamente
5. **Prático**: Identifica produtos críticos
6. **Escalável**: Suporta múltiplas filiais
7. **Auditável**: Histórico de alterações

---

## 📁 Arquivos Criados

### Backend
- `backend/src/routes/analise-estoque-fastify.routes.ts` - API REST
- `backend/src/routes/index.ts` - Registro de rotas
- `backend/scripts/criar-tabela-config-regras-estoque.sql`
- `backend/scripts/criar-funcao-calculo-excesso-estoque.sql`
- `backend/scripts/criar-view-analise-estoque-automatica.sql`
- `backend/scripts/atualizar-regra-180-dias.sql`
- `backend/scripts/atualizar-funcao-demanda-diaria.sql`
- `backend/scripts/testar-sistema-180-dias.ts`
- `backend/scripts/testar-calculo-final.ts`

### Documentação
- `API_ANALISE_ESTOQUE.md` - Documentação completa da API
- `SISTEMA_ANALISE_ESTOQUE_RESUMO.md` - Este arquivo

---

## 🎯 Próximos Passos Sugeridos

1. **Painel Web**: Criar interface visual para gerenciar regras
2. **Relatórios**: Gerar relatórios de compras automáticos
3. **Alertas**: Sistema de notificações para produtos críticos
4. **Histórico**: Rastrear evolução de estoque ao longo do tempo
5. **Integração**: Conectar com sistema de compras
6. **Mobile**: App para consulta rápida

---

## 📞 Suporte

Para dúvidas ou ajustes, consulte:
- Documentação da API: `API_ANALISE_ESTOQUE.md`
- Scripts de teste: `backend/scripts/testar-*.ts`
- VIEW principal: `vw_analise_estoque_cobertura`

---

**Sistema criado em:** 28/01/2026  
**Versão:** 1.0  
**Status:** ✅ Operacional
