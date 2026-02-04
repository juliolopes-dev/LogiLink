# 📊 API de Análise de Estoque - Documentação

Sistema de análise de estoque com cálculo automático de demanda e cobertura de 180 dias.

---

## 🎯 Endpoints Disponíveis

### 1. **GET** `/api/analise-estoque`
Lista produtos com análise de estoque e cobertura.

**Query Parameters:**
- `status` (opcional): Filtrar por status (`EXCESSO_CRITICO`, `EXCESSO_ALERTA`, `NORMAL`, `RUPTURA_ALERTA`, `RUPTURA_CRITICO`)
- `filial` (opcional): Filtrar por código da filial (`00`, `02`, `05`, `06`)
- `limite` (opcional): Quantidade de registros por página (padrão: 50)
- `pagina` (opcional): Número da página (padrão: 1)
- `ordenar` (opcional): Campo para ordenação (padrão: `quantidade_comprar`)
- `direcao` (opcional): Direção da ordenação (`ASC` ou `DESC`, padrão: `DESC`)

**Exemplo:**
```bash
GET /api/analise-estoque?status=RUPTURA_CRITICO&filial=00&limite=20&pagina=1
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "cod_produto": "121846",
      "cod_filial": "00",
      "nome_filial": "Petrolina",
      "estoque_atual": 488.00,
      "vendas_30_dias": 2517.00,
      "demanda_diaria": 83.90,
      "cobertura_dias_atual": 5.82,
      "cobertura_desejada_dias": 180,
      "estoque_ideal": 5034.00,
      "estoque_cobertura_maxima": 15102.00,
      "quantidade_comprar": 14614.00,
      "status_estoque": "RUPTURA_CRITICO",
      "recomendacao": "Ruptura crítica! Cobertura de apenas 5.82 dias. Comprar urgentemente."
    }
  ],
  "pagination": {
    "pagina": 1,
    "limite": 20,
    "total": 7350,
    "totalPaginas": 368
  }
}
```

---

### 2. **GET** `/api/analise-estoque/produto/:codigo`
Busca análise de um produto específico.

**Path Parameters:**
- `codigo`: Código do produto

**Query Parameters:**
- `filial` (opcional): Filtrar por filial específica

**Exemplo:**
```bash
GET /api/analise-estoque/produto/121846?filial=00
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "cod_produto": "121846",
      "cod_filial": "00",
      "nome_filial": "Petrolina",
      "estoque_atual": 488.00,
      "demanda_diaria": 83.90,
      "cobertura_dias_atual": 5.82,
      "quantidade_comprar": 14614.00,
      "status_estoque": "RUPTURA_CRITICO"
    }
  ]
}
```

---

### 3. **GET** `/api/analise-estoque/estatisticas`
Retorna estatísticas gerais do estoque.

**Query Parameters:**
- `filial` (opcional): Filtrar por filial específica

**Exemplo:**
```bash
GET /api/analise-estoque/estatisticas
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "total_produtos": 16226,
    "excesso_critico": 1366,
    "excesso_alerta": 406,
    "normal": 4454,
    "ruptura_alerta": 2650,
    "ruptura_critico": 7350,
    "total_comprar": 455414.30,
    "estoque_total_atual": 1234567.00,
    "estoque_total_ideal": 2345678.00
  }
}
```

---

### 4. **GET** `/api/analise-estoque/top-comprar`
Retorna os produtos com maior necessidade de compra.

**Query Parameters:**
- `filial` (opcional): Filtrar por filial específica
- `limite` (opcional): Quantidade de produtos (padrão: 20)

**Exemplo:**
```bash
GET /api/analise-estoque/top-comprar?limite=10
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "cod_produto": "121846",
      "cod_filial": "00",
      "nome_filial": "Petrolina",
      "estoque_atual": 488.00,
      "demanda_diaria": 83.90,
      "cobertura_dias_atual": 5.82,
      "quantidade_comprar": 14614.00,
      "status_estoque": "RUPTURA_CRITICO"
    }
  ]
}
```

---

### 5. **GET** `/api/regras-estoque`
Lista todas as regras de estoque configuradas.

**Exemplo:**
```bash
GET /api/regras-estoque
```

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nome_regra": "REGRA_PADRAO_GLOBAL",
      "descricao": "Regra padrão: 180 dias de cobertura total",
      "lead_time_dias": 30,
      "estoque_seguranca_dias": 30,
      "cobertura_maxima_dias": 180,
      "ativo": true
    }
  ]
}
```

---

### 6. **PUT** `/api/regras-estoque/:id`
Atualiza uma regra de estoque.

**Path Parameters:**
- `id`: ID da regra

**Body:**
```json
{
  "lead_time_dias": 30,
  "estoque_seguranca_dias": 30,
  "cobertura_maxima_dias": 180,
  "descricao": "Regra atualizada",
  "usuario_atualizacao": "admin"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nome_regra": "REGRA_PADRAO_GLOBAL",
    "lead_time_dias": 30,
    "estoque_seguranca_dias": 30,
    "cobertura_maxima_dias": 180,
    "data_atualizacao": "2026-01-28T22:30:00.000Z"
  }
}
```

---

## 📊 Status de Estoque

| Status | Descrição |
|--------|-----------|
| **EXCESSO_CRITICO** | Cobertura > 270 dias (150% da meta) |
| **EXCESSO_ALERTA** | Cobertura > 216 dias (120% da meta) |
| **NORMAL** | Cobertura entre 60 e 216 dias |
| **RUPTURA_ALERTA** | Cobertura entre 30 e 60 dias |
| **RUPTURA_CRITICO** | Cobertura < 30 dias |

---

## 🎯 Como Funciona o Cálculo

### 1. **Demanda Diária (Automática)**
```
Demanda Diária = Total Vendido (últimos 30 dias) / 30
```

### 2. **Estoque Ideal (60 dias)**
```
Estoque Ideal = Demanda Diária × (Lead Time + Estoque Segurança)
              = Demanda Diária × (30 + 30)
              = Demanda Diária × 60 dias
```

### 3. **Estoque para 180 Dias**
```
Estoque para 180 dias = Demanda Diária × 180
```

### 4. **Quantidade a Comprar**
```
Quantidade Comprar = Estoque para 180 dias - Estoque Atual
```

---

## 🔧 Configuração

### Variáveis de Ambiente
```env
DATABASE_URL=postgres://user:password@host:port/database
```

### Parâmetros Configuráveis

| Parâmetro | Valor Padrão | Descrição |
|-----------|--------------|-----------|
| `lead_time_dias` | 30 | Prazo de entrega do fornecedor |
| `estoque_seguranca_dias` | 30 | Dias de estoque de segurança |
| `cobertura_maxima_dias` | 180 | Meta de cobertura desejada |

---

## 📈 Exemplo de Uso Completo

```javascript
// 1. Buscar estatísticas gerais
const stats = await fetch('/api/analise-estoque/estatisticas')
const { data } = await stats.json()
console.log(`Produtos em ruptura: ${data.ruptura_critico}`)

// 2. Listar produtos críticos
const criticos = await fetch('/api/analise-estoque?status=RUPTURA_CRITICO&limite=50')
const produtos = await criticos.json()

// 3. Buscar análise de produto específico
const produto = await fetch('/api/analise-estoque/produto/121846?filial=00')
const analise = await produto.json()
console.log(`Comprar: ${analise.data[0].quantidade_comprar} unidades`)

// 4. Atualizar regra de cobertura
await fetch('/api/regras-estoque/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cobertura_maxima_dias: 200,
    usuario_atualizacao: 'admin'
  })
})
```

---

## ✅ Sistema Pronto!

- ✅ Demanda calculada automaticamente
- ✅ Cobertura de 180 dias configurável
- ✅ API REST completa
- ✅ Estatísticas em tempo real
- ✅ Recomendações automáticas de compra
