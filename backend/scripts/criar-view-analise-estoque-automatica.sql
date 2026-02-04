-- ============================================
-- VIEW: vw_analise_estoque_cobertura
-- Descrição: Calcula automaticamente demanda diária e analisa cobertura de estoque
-- Cobertura Desejada: 180 dias (30 lead time + 30 segurança + 120 extra)
-- Data: 28/01/2026
-- ============================================

DROP VIEW IF EXISTS public.vw_analise_estoque_cobertura;

CREATE OR REPLACE VIEW public.vw_analise_estoque_cobertura AS

WITH demanda_calculada AS (
  -- Calcular demanda diária real dos últimos 30 dias
  SELECT 
    cod_produto,
    cod_filial,
    SUM(quantidade) as total_vendido_30dias,
    ROUND(SUM(quantidade) / 30.0, 2) as demanda_diaria
  FROM auditoria_integracao."Movimentacao_DRP"
  WHERE tipo_movimento = '55' -- Saídas
    AND data_movimento >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY cod_produto, cod_filial
),

parametros AS (
  -- Buscar parâmetros da regra ativa
  SELECT 
    lead_time_dias,
    estoque_seguranca_dias,
    cobertura_maxima_dias
  FROM public.config_regras_estoque
  WHERE ativo = true
  ORDER BY aplicar_global ASC, id DESC
  LIMIT 1
),

estoque_com_metricas AS (
  SELECT 
    e.cod_produto,
    e.cod_filial,
    CASE e.cod_filial
      WHEN '00' THEN 'Petrolina'
      WHEN '01' THEN 'Juazeiro'
      WHEN '02' THEN 'Salgueiro'
      WHEN '05' THEN 'Bonfim'
      WHEN '06' THEN 'Picos'
      ELSE 'Desconhecida'
    END as nome_filial,
    
    -- Dados atuais
    ROUND(e.estoque, 2) as estoque_atual,
    COALESCE(d.total_vendido_30dias, 0) as vendas_30_dias,
    COALESCE(d.demanda_diaria, 0) as demanda_diaria,
    
    -- Parâmetros
    p.lead_time_dias,
    p.estoque_seguranca_dias,
    p.cobertura_maxima_dias,
    
    -- Cálculos de estoque ideal
    ROUND(COALESCE(d.demanda_diaria, 0) * p.lead_time_dias, 2) as estoque_lead_time,
    ROUND(COALESCE(d.demanda_diaria, 0) * p.estoque_seguranca_dias, 2) as estoque_seguranca,
    ROUND(COALESCE(d.demanda_diaria, 0) * (p.lead_time_dias + p.estoque_seguranca_dias), 2) as estoque_ideal,
    
    -- Estoque para cobertura máxima desejada (180 dias)
    ROUND(COALESCE(d.demanda_diaria, 0) * p.cobertura_maxima_dias, 2) as estoque_cobertura_maxima,
    
    -- Cobertura atual em dias
    CASE 
      WHEN COALESCE(d.demanda_diaria, 0) > 0 THEN ROUND(e.estoque / d.demanda_diaria, 2)
      ELSE 999
    END as cobertura_dias_atual,
    
    -- Excesso ou falta
    ROUND(e.estoque - COALESCE(d.demanda_diaria, 0) * (p.lead_time_dias + p.estoque_seguranca_dias), 2) as excesso,
    
    -- Percentual de excesso
    CASE 
      WHEN COALESCE(d.demanda_diaria, 0) * (p.lead_time_dias + p.estoque_seguranca_dias) > 0 THEN
        ROUND((e.estoque - COALESCE(d.demanda_diaria, 0) * (p.lead_time_dias + p.estoque_seguranca_dias)) / 
              (COALESCE(d.demanda_diaria, 0) * (p.lead_time_dias + p.estoque_seguranca_dias)) * 100, 2)
      ELSE 0
    END as percentual_excesso
    
  FROM auditoria_integracao."Estoque_DRP" e
  CROSS JOIN parametros p
  LEFT JOIN demanda_calculada d 
    ON e.cod_produto = d.cod_produto 
    AND e.cod_filial = d.cod_filial
  WHERE e.estoque > 0 OR COALESCE(d.demanda_diaria, 0) > 0
)

SELECT 
  cod_produto,
  cod_filial,
  nome_filial,
  estoque_atual,
  vendas_30_dias,
  demanda_diaria,
  
  -- Parâmetros de cobertura
  lead_time_dias,
  estoque_seguranca_dias,
  cobertura_maxima_dias as cobertura_desejada_dias,
  
  -- Estoques calculados
  estoque_lead_time,
  estoque_seguranca,
  estoque_ideal,
  estoque_cobertura_maxima,
  
  -- Análise
  cobertura_dias_atual,
  excesso,
  percentual_excesso,
  
  -- Status baseado na cobertura
  CASE 
    WHEN cobertura_dias_atual >= cobertura_maxima_dias * 1.5 THEN 'EXCESSO_CRITICO'
    WHEN cobertura_dias_atual >= cobertura_maxima_dias * 1.2 THEN 'EXCESSO_ALERTA'
    WHEN cobertura_dias_atual >= lead_time_dias + estoque_seguranca_dias THEN 'NORMAL'
    WHEN cobertura_dias_atual >= lead_time_dias THEN 'RUPTURA_ALERTA'
    ELSE 'RUPTURA_CRITICO'
  END as status_estoque,
  
  -- Recomendação
  CASE 
    WHEN cobertura_dias_atual >= cobertura_maxima_dias * 1.5 THEN 
      'Excesso crítico! Cobertura de ' || cobertura_dias_atual || ' dias. Reduzir compras urgentemente.'
    WHEN cobertura_dias_atual >= cobertura_maxima_dias * 1.2 THEN 
      'Excesso detectado. Cobertura de ' || cobertura_dias_atual || ' dias. Reduzir próximas compras.'
    WHEN cobertura_dias_atual >= lead_time_dias + estoque_seguranca_dias THEN 
      'Estoque adequado. Cobertura de ' || cobertura_dias_atual || ' dias.'
    WHEN cobertura_dias_atual >= lead_time_dias THEN 
      'Risco de ruptura. Cobertura de apenas ' || cobertura_dias_atual || ' dias. Programar compra.'
    ELSE 
      'Ruptura crítica! Cobertura de apenas ' || cobertura_dias_atual || ' dias. Comprar urgentemente.'
  END as recomendacao,
  
  -- Quantidade a comprar para atingir cobertura desejada
  CASE 
    WHEN cobertura_dias_atual < cobertura_maxima_dias THEN
      ROUND(GREATEST(0, estoque_cobertura_maxima - estoque_atual), 2)
    ELSE 0
  END as quantidade_comprar

FROM estoque_com_metricas

ORDER BY percentual_excesso DESC;

-- Comentário
COMMENT ON VIEW public.vw_analise_estoque_cobertura IS 'Análise de estoque com cálculo automático de demanda diária e cobertura de 180 dias';
