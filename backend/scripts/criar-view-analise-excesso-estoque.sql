-- ============================================
-- VIEW: vw_analise_excesso_estoque
-- Descrição: Analisa excesso/ruptura de estoque para todos os produtos
-- Data: 28/01/2026
-- ============================================

DROP VIEW IF EXISTS public.vw_analise_excesso_estoque;

CREATE OR REPLACE VIEW public.vw_analise_excesso_estoque AS

WITH regras AS (
  -- Buscar regra ativa (prioridade: específica > global)
  SELECT 
    demanda_mensal_padrao,
    lead_time_dias,
    estoque_seguranca_dias,
    percentual_seguranca,
    cobertura_minima_dias,
    cobertura_maxima_dias
  FROM public.config_regras_estoque
  WHERE ativo = true
  ORDER BY aplicar_global ASC, id DESC
  LIMIT 1
),

estoque_com_demanda AS (
  -- Combinar estoque atual com demanda calculada
  SELECT 
    e.cod_produto,
    e.cod_filial,
    e.estoque,
    COALESCE(d.demanda_mensal, r.demanda_mensal_padrao) as demanda_mensal,
    r.lead_time_dias,
    r.estoque_seguranca_dias,
    r.percentual_seguranca,
    r.cobertura_minima_dias,
    r.cobertura_maxima_dias
  FROM auditoria_integracao."Estoque_DRP" e
  CROSS JOIN regras r
  LEFT JOIN (
    -- Calcular demanda mensal real dos últimos 30 dias
    SELECT 
      cod_produto,
      cod_filial,
      SUM(quantidade) as demanda_mensal
    FROM auditoria_integracao."Movimentacao_DRP"
    WHERE tipo_movimento = '55' -- Saídas
      AND data_movimento >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY cod_produto, cod_filial
  ) d ON e.cod_produto = d.cod_produto AND e.cod_filial = d.cod_filial
)

SELECT 
  ed.cod_produto,
  ed.cod_filial,
  CASE ed.cod_filial
    WHEN '00' THEN 'Petrolina'
    WHEN '01' THEN 'Juazeiro'
    WHEN '02' THEN 'Salgueiro'
    WHEN '05' THEN 'Bonfim'
    WHEN '06' THEN 'Picos'
    ELSE 'Desconhecida'
  END as nome_filial,
  
  -- Dados atuais
  ROUND(ed.estoque, 2) as estoque_atual,
  ROUND(ed.demanda_mensal, 2) as demanda_mensal,
  
  -- Parâmetros da regra
  ed.lead_time_dias,
  ed.estoque_seguranca_dias,
  ed.percentual_seguranca,
  
  -- Métricas calculadas
  ROUND(calc.estoque_ideal, 2) as estoque_ideal,
  ROUND(calc.estoque_seguranca, 2) as estoque_seguranca,
  ROUND(calc.excesso, 2) as excesso,
  ROUND(calc.percentual_excesso, 2) as percentual_excesso,
  ROUND(calc.cobertura_dias, 2) as cobertura_dias,
  
  -- Limites de cobertura
  ed.cobertura_minima_dias,
  ed.cobertura_maxima_dias,
  
  -- Status e recomendação
  calc.status_estoque,
  calc.recomendacao,
  
  -- Classificação adicional por cobertura
  CASE 
    WHEN calc.cobertura_dias < ed.cobertura_minima_dias THEN 'ABAIXO_MINIMO'
    WHEN calc.cobertura_dias > ed.cobertura_maxima_dias THEN 'ACIMA_MAXIMO'
    ELSE 'DENTRO_LIMITE'
  END as status_cobertura

FROM estoque_com_demanda ed
CROSS JOIN LATERAL (
  SELECT * FROM public.calcular_metricas_estoque(
    ed.estoque,
    ed.demanda_mensal,
    ed.lead_time_dias,
    ed.estoque_seguranca_dias,
    ed.percentual_seguranca
  )
) calc

WHERE ed.estoque > 0 OR ed.demanda_mensal > 0 -- Apenas produtos com estoque ou demanda

ORDER BY calc.percentual_excesso DESC;

-- Comentário
COMMENT ON VIEW public.vw_analise_excesso_estoque IS 'Análise de excesso/ruptura de estoque aplicando regras configuráveis';
