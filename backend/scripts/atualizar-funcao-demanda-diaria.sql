-- ============================================
-- Atualizar função para usar demanda DIÁRIA
-- Data: 28/01/2026
-- ============================================

-- Dropar função antiga
DROP FUNCTION IF EXISTS public.calcular_metricas_estoque(DECIMAL, DECIMAL, INTEGER, INTEGER, DECIMAL);

-- Criar função nova com demanda DIÁRIA
CREATE OR REPLACE FUNCTION public.calcular_metricas_estoque(
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
  -- Calcular estoque para cobrir lead time
  v_estoque_lead_time := p_demanda_diaria * p_lead_time_dias;
  
  -- Calcular estoque de segurança (sempre em dias, igual ao lead time por padrão)
  v_estoque_seguranca := p_demanda_diaria * p_estoque_seguranca_dias;
  
  -- Calcular estoque ideal
  v_estoque_ideal := v_estoque_lead_time + v_estoque_seguranca;
  
  -- Calcular excesso (pode ser negativo se houver ruptura)
  v_excesso := p_estoque_atual - v_estoque_ideal;
  
  -- Calcular percentual de excesso
  v_percentual_excesso := CASE 
    WHEN v_estoque_ideal > 0 THEN (v_excesso / v_estoque_ideal) * 100.0
    ELSE 0
  END;
  
  -- Calcular cobertura em dias
  v_cobertura_dias := CASE 
    WHEN p_demanda_diaria > 0 THEN p_estoque_atual / p_demanda_diaria
    ELSE 999
  END;
  
  -- Determinar status do estoque
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
  
  -- Retornar resultados
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

-- Comentário
COMMENT ON FUNCTION public.calcular_metricas_estoque IS 'Calcula métricas de estoque: ideal, excesso, ruptura e cobertura. Demanda deve ser DIÁRIA.';

-- Exemplo de uso:
-- Demanda diária: 180 unidades/dia
-- Lead time: 30 dias
-- Estoque segurança: 30 dias (igual ao lead time)
-- SELECT * FROM calcular_metricas_estoque(255, 180, 30, 30, 10);
