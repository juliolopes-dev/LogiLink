-- ============================================
-- VIEW: DIVERGENCIAS_OFFLINE_DRP
-- Descrição: Monitora sincronização entre bases locais e base central (Juazeiro)
-- Compara cada filial local com os dados da mesma filial na base de Juazeiro
-- IMPORTANTE: Base de Juazeiro contém dados de TODAS as filiais
-- Data: 28/01/2026
-- ============================================

DROP VIEW IF EXISTS auditoria_integracao."DIVERGENCIAS_OFFLINE_DRP";

CREATE OR REPLACE VIEW auditoria_integracao."DIVERGENCIAS_OFFLINE_DRP" AS

WITH movimentacao_base_local AS (
  -- Movimentações das bases locais (Petrolina, Salgueiro, Bonfim, Picos)
  -- Excluindo Juazeiro pois é a base central
  -- SEM FILTRO DE DATA - Todo o histórico
  SELECT 
    cod_produto,
    cod_filial,
    SUM(CASE WHEN tipo_movimento = '01' THEN quantidade ELSE 0 END) as soma_entradas_base_local,
    SUM(CASE WHEN tipo_movimento = '55' THEN quantidade ELSE 0 END) as soma_saidas_base_local
  FROM auditoria_integracao."Movimentacao_DRP"
  WHERE cod_filial IN ('00', '02', '05', '06') -- Bases locais (excluindo Juazeiro)
  GROUP BY cod_produto, cod_filial
),

movimentacao_base_matriz AS (
  -- Movimentações da base central (Juazeiro) para as MESMAS filiais
  -- Base de Juazeiro tem dados de todas as filiais
  -- SEM FILTRO DE DATA - Todo o histórico
  SELECT 
    cod_produto,
    cod_filial,
    SUM(CASE WHEN tipo_movimento = '01' THEN quantidade ELSE 0 END) as soma_entradas_base_matriz,
    SUM(CASE WHEN tipo_movimento = '55' THEN quantidade ELSE 0 END) as soma_saidas_base_matriz
  FROM auditoria_integracao.auditoria_mov_juazeiro -- Tabela de Juazeiro que tem todas as filiais
  WHERE cod_filial IN ('00', '02', '05', '06') -- Mesmas filiais das bases locais
  GROUP BY cod_produto, cod_filial
),

estoque_atual_local AS (
  -- Estoque atual de cada produto por filial (bases locais)
  SELECT 
    cod_produto,
    cod_filial,
    estoque as estoque_atual_local
  FROM auditoria_integracao."Estoque_DRP"
  WHERE cod_filial IN ('00', '02', '05', '06')
),

estoque_atual_matriz AS (
  -- Estoque atual da base matriz (Juazeiro) para as mesmas filiais
  SELECT 
    cod_produto,
    cod_filial,
    estoque as estoque_atual_matriz
  FROM auditoria_integracao.auditoria_estoque_juazeiro
  WHERE cod_filial IN ('00', '02', '05', '06')
)

SELECT 
  COALESCE(l.cod_produto, m.cod_produto, el.cod_produto, em.cod_produto) as codigo_do_produto,
  COALESCE(l.cod_filial, m.cod_filial, el.cod_filial, em.cod_filial) as cod_filial,
  CASE COALESCE(l.cod_filial, m.cod_filial, el.cod_filial, em.cod_filial)
    WHEN '00' THEN 'Petrolina'
    WHEN '02' THEN 'Salgueiro'
    WHEN '05' THEN 'Bonfim'
    WHEN '06' THEN 'Picos'
    ELSE 'Desconhecida'
  END as nome_filial,
  ROUND(COALESCE(el.estoque_atual_local, 0), 2) as estoque_atual_local,
  ROUND(COALESCE(em.estoque_atual_matriz, 0), 2) as estoque_atual_matriz,
  ROUND(ABS(COALESCE(el.estoque_atual_local, 0) - COALESCE(em.estoque_atual_matriz, 0)), 2) as divergencia_estoque,
  ROUND(COALESCE(l.soma_entradas_base_local, 0), 2) as soma_entradas_base_local,
  ROUND(COALESCE(l.soma_saidas_base_local, 0), 2) as soma_saidas_base_local,
  ROUND(COALESCE(m.soma_entradas_base_matriz, 0), 2) as soma_entradas_base_matriz,
  ROUND(COALESCE(m.soma_saidas_base_matriz, 0), 2) as soma_saidas_base_matriz,
  
  -- Quantidade de divergência nas movimentações (soma das diferenças)
  ROUND((ABS(COALESCE(l.soma_entradas_base_local, 0) - COALESCE(m.soma_entradas_base_matriz, 0)) + 
   ABS(COALESCE(l.soma_saidas_base_local, 0) - COALESCE(m.soma_saidas_base_matriz, 0))), 2) as divergencia_movimentacao,
  
  -- Status
  CASE 
    WHEN ABS(COALESCE(l.soma_entradas_base_local, 0) - COALESCE(m.soma_entradas_base_matriz, 0)) = 0 
     AND ABS(COALESCE(l.soma_saidas_base_local, 0) - COALESCE(m.soma_saidas_base_matriz, 0)) = 0 
    THEN 'OK'
    ELSE 'DIVERGENCIA'
  END as divergencia

FROM movimentacao_base_local l
FULL OUTER JOIN movimentacao_base_matriz m 
  ON l.cod_produto = m.cod_produto 
  AND l.cod_filial = m.cod_filial -- IMPORTANTE: Comparar mesma filial
LEFT JOIN estoque_atual_local el
  ON COALESCE(l.cod_produto, m.cod_produto) = el.cod_produto
  AND COALESCE(l.cod_filial, m.cod_filial) = el.cod_filial
LEFT JOIN estoque_atual_matriz em
  ON COALESCE(l.cod_produto, m.cod_produto) = em.cod_produto
  AND COALESCE(l.cod_filial, m.cod_filial) = em.cod_filial

WHERE 
  -- Mostrar apenas produtos com divergência
  (ABS(COALESCE(l.soma_entradas_base_local, 0) - COALESCE(m.soma_entradas_base_matriz, 0)) > 0
   OR ABS(COALESCE(l.soma_saidas_base_local, 0) - COALESCE(m.soma_saidas_base_matriz, 0)) > 0)

ORDER BY divergencia_movimentacao DESC, divergencia_estoque DESC;
