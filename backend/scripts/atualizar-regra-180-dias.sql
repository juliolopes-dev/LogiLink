-- ============================================
-- Atualizar regra padrão para 180 dias de cobertura
-- Data: 28/01/2026
-- ============================================

UPDATE public.config_regras_estoque
SET 
  cobertura_maxima_dias = 180,
  lead_time_dias = 30,
  estoque_seguranca_dias = 30,
  descricao = 'Regra padrão: 180 dias de cobertura total (30 lead time + 30 segurança + 120 extra)',
  data_atualizacao = CURRENT_TIMESTAMP,
  usuario_atualizacao = 'SISTEMA'
WHERE nome_regra = 'REGRA_PADRAO_GLOBAL';

-- Verificar atualização
SELECT 
  nome_regra,
  lead_time_dias,
  estoque_seguranca_dias,
  cobertura_maxima_dias,
  descricao
FROM public.config_regras_estoque
WHERE nome_regra = 'REGRA_PADRAO_GLOBAL';
