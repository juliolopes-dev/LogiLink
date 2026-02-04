-- ============================================
-- Reorganização do Banco de Auditoria
-- Mover tudo para schema auditoria_integracao
-- Data: 28/01/2026
-- ============================================

-- ============================================
-- 1. Mover tabela config_regras_estoque
-- ============================================

DROP TABLE IF EXISTS auditoria_integracao.config_regras_estoque CASCADE;

CREATE TABLE auditoria_integracao.config_regras_estoque AS 
SELECT * FROM public.config_regras_estoque;

-- Recriar constraints e índices
ALTER TABLE auditoria_integracao.config_regras_estoque
  ADD PRIMARY KEY (id);

CREATE INDEX idx_config_regras_filial ON auditoria_integracao.config_regras_estoque(cod_filial);
CREATE INDEX idx_config_regras_categoria ON auditoria_integracao.config_regras_estoque(cod_categoria);
CREATE INDEX idx_config_regras_ativo ON auditoria_integracao.config_regras_estoque(ativo);

-- Dropar tabela antiga
DROP TABLE IF EXISTS public.config_regras_estoque CASCADE;

-- ============================================
-- 2. Recriar função no schema correto
-- ============================================

DROP FUNCTION IF EXISTS auditoria_integracao.calcular_metricas_estoque CASCADE;

CREATE OR REPLACE FUNCTION auditoria_integracao.calcular_metricas_estoque(
  p_estoque_atual DECIMAL,
  p_demanda_diaria DECIMAL,
  p_lead_time_dias INTEGER DEFAULT 30,
  p_estoque_seguranca_dias INTEGER DEFAULT 30,
  p_percentual_seguranca DECIMAL DEFAULT 10.00
)
RETURNS TABLE (
  estoque_ideal DECIMAL,
  estoque_seguranca DECIMAL,
  excesso DECIMAL,
  percentual_excesso DECIMAL,
  cobertura_dias DECIMAL,
  status_estoque VARCHAR(20),
  recomendacao TEXT
) AS $$
DECLARE
  v_estoque_lead_time DECIMAL;
  v_estoque_seguranca DECIMAL;
  v_estoque_ideal DECIMAL;
  v_excesso DECIMAL;
  v_percentual_excesso DECIMAL;
  v_cobertura_dias DECIMAL;
  v_status VARCHAR(20);
  v_recomendacao TEXT;
BEGIN
  v_estoque_lead_time := p_demanda_diaria * p_lead_time_dias;
  v_estoque_seguranca := p_demanda_diaria * p_estoque_seguranca_dias;
  v_estoque_ideal := v_estoque_lead_time + v_estoque_seguranca;
  v_excesso := p_estoque_atual - v_estoque_ideal;
  
  v_percentual_excesso := CASE 
    WHEN v_estoque_ideal > 0 THEN (v_excesso / v_estoque_ideal) * 100.0
    ELSE 0
  END;
  
  v_cobertura_dias := CASE 
    WHEN p_demanda_diaria > 0 THEN p_estoque_atual / p_demanda_diaria
    ELSE 999
  END;
  
  IF v_percentual_excesso >= 50 THEN
    v_status := 'EXCESSO_CRITICO';
    v_recomendacao := 'Excesso crítico! Reduzir compras urgentemente e considerar promoção.';
  ELSIF v_percentual_excesso >= 20 THEN
    v_status := 'EXCESSO_ALERTA';
    v_recomendacao := 'Excesso detectado. Reduzir próximas compras.';
  ELSIF v_percentual_excesso >= -20 THEN
    v_status := 'NORMAL';
    v_recomendacao := 'Estoque em nível adequado.';
  ELSIF v_percentual_excesso >= -50 THEN
    v_status := 'RUPTURA_ALERTA';
    v_recomendacao := 'Risco de ruptura. Programar compra em breve.';
  ELSE
    v_status := 'RUPTURA_CRITICO';
    v_recomendacao := 'Ruptura crítica! Comprar urgentemente.';
  END IF;
  
  RETURN QUERY SELECT 
    ROUND(v_estoque_ideal, 2),
    ROUND(v_estoque_seguranca, 2),
    ROUND(v_excesso, 2),
    ROUND(v_percentual_excesso, 2),
    ROUND(v_cobertura_dias, 2),
    v_status,
    v_recomendacao;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Dropar função antiga
DROP FUNCTION IF EXISTS public.calcular_metricas_estoque CASCADE;

-- ============================================
-- 3. Recriar VIEW no schema correto
-- ============================================

DROP VIEW IF EXISTS auditoria_integracao.vw_analise_estoque_cobertura CASCADE;

CREATE OR REPLACE VIEW auditoria_integracao.vw_analise_estoque_cobertura AS

WITH demanda_calculada AS (
  SELECT 
    cod_produto,
    cod_filial,
    SUM(quantidade) as total_vendido_30dias,
    ROUND(SUM(quantidade) / 30.0, 2) as demanda_diaria
  FROM auditoria_integracao."Movimentacao_DRP"
  WHERE tipo_movimento = '55'
    AND data_movimento >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY cod_produto, cod_filial
),

parametros AS (
  SELECT 
    lead_time_dias,
    estoque_seguranca_dias,
    cobertura_maxima_dias
  FROM auditoria_integracao.config_regras_estoque
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
    
    ROUND(e.estoque, 2) as estoque_atual,
    COALESCE(d.total_vendido_30dias, 0) as vendas_30_dias,
    COALESCE(d.demanda_diaria, 0) as demanda_diaria,
    
    p.lead_time_dias,
    p.estoque_seguranca_dias,
    p.cobertura_maxima_dias,
    
    ROUND(COALESCE(d.demanda_diaria, 0) * p.lead_time_dias, 2) as estoque_lead_time,
    ROUND(COALESCE(d.demanda_diaria, 0) * p.estoque_seguranca_dias, 2) as estoque_seguranca,
    ROUND(COALESCE(d.demanda_diaria, 0) * (p.lead_time_dias + p.estoque_seguranca_dias), 2) as estoque_ideal,
    ROUND(COALESCE(d.demanda_diaria, 0) * p.cobertura_maxima_dias, 2) as estoque_cobertura_maxima,
    
    CASE 
      WHEN COALESCE(d.demanda_diaria, 0) > 0 THEN ROUND(e.estoque / d.demanda_diaria, 2)
      ELSE 999
    END as cobertura_dias_atual,
    
    ROUND(e.estoque - COALESCE(d.demanda_diaria, 0) * (p.lead_time_dias + p.estoque_seguranca_dias), 2) as excesso,
    
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
  lead_time_dias,
  estoque_seguranca_dias,
  cobertura_maxima_dias as cobertura_desejada_dias,
  estoque_lead_time,
  estoque_seguranca,
  estoque_ideal,
  estoque_cobertura_maxima,
  cobertura_dias_atual,
  excesso,
  percentual_excesso,
  
  CASE 
    WHEN cobertura_dias_atual >= cobertura_maxima_dias * 1.5 THEN 'EXCESSO_CRITICO'
    WHEN cobertura_dias_atual >= cobertura_maxima_dias * 1.2 THEN 'EXCESSO_ALERTA'
    WHEN cobertura_dias_atual >= lead_time_dias + estoque_seguranca_dias THEN 'NORMAL'
    WHEN cobertura_dias_atual >= lead_time_dias THEN 'RUPTURA_ALERTA'
    ELSE 'RUPTURA_CRITICO'
  END as status_estoque,
  
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
  
  CASE 
    WHEN cobertura_dias_atual < cobertura_maxima_dias THEN
      ROUND(GREATEST(0, estoque_cobertura_maxima - estoque_atual), 2)
    ELSE 0
  END as quantidade_comprar

FROM estoque_com_metricas

ORDER BY percentual_excesso DESC;

-- Dropar VIEW antiga
DROP VIEW IF EXISTS public.vw_analise_estoque_cobertura CASCADE;

-- ============================================
-- 4. Criar tabelas de combinados no schema correto
-- ============================================

DROP TABLE IF EXISTS auditoria_integracao.combinados CASCADE;

CREATE TABLE auditoria_integracao.combinados (
  id SERIAL PRIMARY KEY,
  cod_grupo VARCHAR(50) NOT NULL UNIQUE,
  descricao VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  observacao TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_combinados_ativo ON auditoria_integracao.combinados(ativo);

COMMENT ON TABLE auditoria_integracao.combinados IS 'Tabela de grupos de produtos combinados';

-- ============================================

DROP TABLE IF EXISTS auditoria_integracao.combinados_produtos CASCADE;

CREATE TABLE auditoria_integracao.combinados_produtos (
  id SERIAL PRIMARY KEY,
  cod_grupo VARCHAR(50) NOT NULL,
  cod_produto VARCHAR(20) NOT NULL,
  ordem INTEGER DEFAULT 1,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT combinados_produtos_cod_grupo_cod_produto_key UNIQUE (cod_grupo, cod_produto),
  
  CONSTRAINT fk_combinados_produtos_grupo 
    FOREIGN KEY (cod_grupo) 
    REFERENCES auditoria_integracao.combinados(cod_grupo)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX idx_combinados_produtos_grupo ON auditoria_integracao.combinados_produtos(cod_grupo);
CREATE INDEX idx_combinados_produtos_produto ON auditoria_integracao.combinados_produtos(cod_produto);

COMMENT ON TABLE auditoria_integracao.combinados_produtos IS 'Produtos que compõem cada grupo de combinados';

-- ============================================

DROP VIEW IF EXISTS auditoria_integracao.vw_combinados_detalhado CASCADE;

CREATE OR REPLACE VIEW auditoria_integracao.vw_combinados_detalhado AS
SELECT 
  c.cod_grupo,
  c.descricao AS grupo_descricao,
  c.ativo,
  c.observacao,
  cp.cod_produto,
  cp.ordem,
  c.created_at,
  c.updated_at
FROM auditoria_integracao.combinados c
JOIN auditoria_integracao.combinados_produtos cp 
  ON c.cod_grupo = cp.cod_grupo
ORDER BY c.cod_grupo, cp.ordem, cp.cod_produto;

COMMENT ON VIEW auditoria_integracao.vw_combinados_detalhado IS 'VIEW detalhada de combinados';

-- ============================================
-- 5. Limpar schema public
-- ============================================

-- Dropar objetos antigos do public
DROP TABLE IF EXISTS public.combinados CASCADE;
DROP TABLE IF EXISTS public.combinados_produtos CASCADE;
DROP VIEW IF EXISTS public.vw_combinados_detalhado CASCADE;

-- ============================================
-- Verificação Final
-- ============================================

SELECT 'Banco reorganizado com sucesso!' AS status;

-- Listar estruturas no schema auditoria_integracao
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'auditoria_integracao'
ORDER BY table_type, table_name;
