-- ============================================
-- VIEW: DIVERGENCIAS_OFFLINE_DRP
-- Descrição: Monitora sincronização entre bases locais e matriz (Juazeiro)
-- Compara entradas e saídas de produtos entre base local e matriz
-- Data: 28/01/2026
-- ============================================

DROP VIEW IF EXISTS auditoria_integracao."DIVERGENCIAS_OFFLINE_DRP";

CREATE OR REPLACE VIEW auditoria_integracao."DIVERGENCIAS_OFFLINE_DRP" AS

WITH movimentacao_por_filial AS (
  -- Agrupa movimentações por produto e filial
  SELECT 
    cod_produto,
    cod_filial,
    -- Entradas (tipo_movimento = '01' - Entrada NF)
    SUM(CASE WHEN tipo_movimento = '01' THEN quantidade ELSE 0 END) as soma_entradas_base_local,
    -- Saídas (tipo_movimento = '55' - Vendas)
    SUM(CASE WHEN tipo_movimento = '55' THEN quantidade ELSE 0 END) as soma_saidas_base_local,
    MAX(data_extracao) as ultima_extracao_local
  FROM auditoria_integracao."Movimentacao_DRP"
  WHERE cod_filial != '01' -- Excluir Juazeiro (matriz)
    AND data_movimento >= CURRENT_DATE - INTERVAL '30 days' -- Últimos 30 dias
  GROUP BY cod_produto, cod_filial
),

movimentacao_matriz AS (
  -- Movimentações da matriz (Juazeiro) para os mesmos produtos
  SELECT 
    cod_produto,
    cod_filial,
    -- Entradas na matriz
    SUM(CASE WHEN tipo_movimento = '01' THEN quantidade ELSE 0 END) as soma_entradas_matriz,
    -- Saídas na matriz
    SUM(CASE WHEN tipo_movimento = '55' THEN quantidade ELSE 0 END) as soma_saidas_matriz,
    MAX(data_extracao) as ultima_extracao_matriz
  FROM auditoria_integracao."Movimentacao_DRP"
  WHERE cod_filial = '01' -- Apenas Juazeiro (matriz)
    AND data_movimento >= CURRENT_DATE - INTERVAL '30 days' -- Últimos 30 dias
  GROUP BY cod_produto, cod_filial
)

SELECT 
  l.cod_produto,
  l.cod_filial,
  CASE l.cod_filial
    WHEN '00' THEN 'Petrolina'
    WHEN '02' THEN 'Salgueiro'
    WHEN '05' THEN 'Bonfim'
    WHEN '06' THEN 'Picos'
    ELSE 'Desconhecida'
  END as nome_filial,
  
  -- Dados da base local
  COALESCE(l.soma_entradas_base_local, 0) as soma_entradas_base_local,
  COALESCE(l.soma_saidas_base_local, 0) as soma_saidas_base_local,
  
  -- Dados da matriz (Juazeiro)
  COALESCE(m.soma_entradas_matriz, 0) as soma_entradas_base_matriz,
  COALESCE(m.soma_saidas_matriz, 0) as soma_saidas_base_matriz,
  
  -- Cálculo de divergências
  ABS(COALESCE(l.soma_entradas_base_local, 0) - COALESCE(m.soma_entradas_matriz, 0)) as divergencia_entradas,
  ABS(COALESCE(l.soma_saidas_base_local, 0) - COALESCE(m.soma_saidas_matriz, 0)) as divergencia_saidas,
  
  -- Status de sincronização
  CASE 
    WHEN ABS(COALESCE(l.soma_entradas_base_local, 0) - COALESCE(m.soma_entradas_matriz, 0)) = 0 
     AND ABS(COALESCE(l.soma_saidas_base_local, 0) - COALESCE(m.soma_saidas_matriz, 0)) = 0 
    THEN 'OK'
    WHEN ABS(COALESCE(l.soma_entradas_base_local, 0) - COALESCE(m.soma_entradas_matriz, 0)) > 0 
      OR ABS(COALESCE(l.soma_saidas_base_local, 0) - COALESCE(m.soma_saidas_matriz, 0)) > 0 
    THEN 'DIVERGENCIA'
    ELSE 'VERIFICAR'
  END as status_sincronizacao,
  
  -- Datas de última extração
  l.ultima_extracao_local,
  m.ultima_extracao_matriz,
  
  -- Diferença de tempo entre extrações (em horas)
  EXTRACT(EPOCH FROM (l.ultima_extracao_local - m.ultima_extracao_matriz)) / 3600 as diferenca_horas

FROM movimentacao_por_filial l
LEFT JOIN movimentacao_matriz m ON l.cod_produto = m.cod_produto

WHERE 
  -- Filtrar apenas registros com divergência ou sem dados na matriz
  (ABS(COALESCE(l.soma_entradas_base_local, 0) - COALESCE(m.soma_entradas_matriz, 0)) > 0
   OR ABS(COALESCE(l.soma_saidas_base_local, 0) - COALESCE(m.soma_saidas_matriz, 0)) > 0
   OR m.cod_produto IS NULL)

ORDER BY 
  l.cod_filial,
  (ABS(COALESCE(l.soma_entradas_base_local, 0) - COALESCE(m.soma_entradas_matriz, 0)) + 
   ABS(COALESCE(l.soma_saidas_base_local, 0) - COALESCE(m.soma_saidas_matriz, 0))) DESC;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_mov_produto_filial_data ON auditoria_integracao.auditoria_mov_petrolina(cod_produto, cod_filial, data_movimento);
CREATE INDEX IF NOT EXISTS idx_mov_produto_filial_data_juaz ON auditoria_integracao.auditoria_mov_juazeiro(cod_produto, cod_filial, data_movimento);
CREATE INDEX IF NOT EXISTS idx_mov_produto_filial_data_salg ON auditoria_integracao.auditoria_mov_salgueiro(cod_produto, cod_filial, data_movimento);
CREATE INDEX IF NOT EXISTS idx_mov_produto_filial_data_bonf ON auditoria_integracao.auditoria_mov_bonfim(cod_produto, cod_filial, data_movimento);
CREATE INDEX IF NOT EXISTS idx_mov_produto_filial_data_pico ON auditoria_integracao.auditoria_mov_picos(cod_produto, cod_filial, data_movimento);
