-- ============================================
-- Tabela: config_regras_estoque
-- Descrição: Configurações de regras para cálculo de estoque ideal e excesso
-- Data: 28/01/2026
-- ============================================

CREATE TABLE IF NOT EXISTS public.config_regras_estoque (
  id SERIAL PRIMARY KEY,
  
  -- Identificação
  nome_regra VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  
  -- Parâmetros de Demanda
  demanda_mensal_padrao DECIMAL(10,2) DEFAULT 180.00,
  
  -- Parâmetros de Lead Time (Prazo de Entrega)
  lead_time_dias INTEGER DEFAULT 30,
  
  -- Estoque de Segurança
  estoque_seguranca_dias INTEGER DEFAULT 7,
  percentual_seguranca DECIMAL(5,2) DEFAULT 10.00, -- % sobre demanda mensal
  
  -- Cobertura de Estoque
  cobertura_minima_dias INTEGER DEFAULT 15,
  cobertura_maxima_dias INTEGER DEFAULT 60,
  
  -- Regras de Excesso
  percentual_excesso_alerta DECIMAL(5,2) DEFAULT 20.00, -- Alerta quando excesso > 20%
  percentual_excesso_critico DECIMAL(5,2) DEFAULT 50.00, -- Crítico quando excesso > 50%
  
  -- Regras de Ruptura
  percentual_ruptura_alerta DECIMAL(5,2) DEFAULT 20.00, -- Alerta quando falta > 20%
  percentual_ruptura_critico DECIMAL(5,2) DEFAULT 50.00, -- Crítico quando falta > 50%
  
  -- Aplicação
  aplicar_global BOOLEAN DEFAULT false, -- Se true, aplica para todos os produtos
  cod_filial VARCHAR(2), -- Se preenchido, aplica apenas para esta filial
  cod_categoria VARCHAR(10), -- Se preenchido, aplica apenas para esta categoria
  
  -- Auditoria
  ativo BOOLEAN DEFAULT true,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usuario_criacao VARCHAR(50),
  usuario_atualizacao VARCHAR(50),
  
  -- Constraints
  CONSTRAINT chk_demanda_positiva CHECK (demanda_mensal_padrao >= 0),
  CONSTRAINT chk_lead_time_positivo CHECK (lead_time_dias > 0),
  CONSTRAINT chk_estoque_seguranca_positivo CHECK (estoque_seguranca_dias >= 0),
  CONSTRAINT chk_percentual_seguranca CHECK (percentual_seguranca >= 0 AND percentual_seguranca <= 100),
  CONSTRAINT chk_cobertura_minima CHECK (cobertura_minima_dias >= 0),
  CONSTRAINT chk_cobertura_maxima CHECK (cobertura_maxima_dias >= cobertura_minima_dias)
);

-- Índices
CREATE INDEX idx_config_regras_filial ON public.config_regras_estoque(cod_filial) WHERE cod_filial IS NOT NULL;
CREATE INDEX idx_config_regras_categoria ON public.config_regras_estoque(cod_categoria) WHERE cod_categoria IS NOT NULL;
CREATE INDEX idx_config_regras_ativo ON public.config_regras_estoque(ativo) WHERE ativo = true;

-- Comentários
COMMENT ON TABLE public.config_regras_estoque IS 'Configurações de regras para cálculo de estoque ideal, excesso e ruptura';
COMMENT ON COLUMN public.config_regras_estoque.demanda_mensal_padrao IS 'Demanda mensal padrão em unidades';
COMMENT ON COLUMN public.config_regras_estoque.lead_time_dias IS 'Prazo de entrega do fornecedor em dias';
COMMENT ON COLUMN public.config_regras_estoque.estoque_seguranca_dias IS 'Dias de cobertura para estoque de segurança';
COMMENT ON COLUMN public.config_regras_estoque.percentual_seguranca IS 'Percentual sobre demanda mensal para estoque de segurança';
COMMENT ON COLUMN public.config_regras_estoque.cobertura_minima_dias IS 'Cobertura mínima desejada em dias';
COMMENT ON COLUMN public.config_regras_estoque.cobertura_maxima_dias IS 'Cobertura máxima desejada em dias';

-- Inserir regra padrão global
INSERT INTO public.config_regras_estoque (
  nome_regra,
  descricao,
  demanda_mensal_padrao,
  lead_time_dias,
  estoque_seguranca_dias,
  percentual_seguranca,
  cobertura_minima_dias,
  cobertura_maxima_dias,
  aplicar_global,
  usuario_criacao
) VALUES (
  'REGRA_PADRAO_GLOBAL',
  'Regra padrão aplicada a todos os produtos quando não há regra específica',
  180.00,
  30,
  7,
  10.00,
  15,
  60,
  true,
  'SISTEMA'
) ON CONFLICT (nome_regra) DO NOTHING;

-- Trigger para atualizar data_atualizacao
CREATE OR REPLACE FUNCTION update_config_regras_estoque_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.data_atualizacao = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_config_regras_estoque_timestamp
BEFORE UPDATE ON public.config_regras_estoque
FOR EACH ROW
EXECUTE FUNCTION update_config_regras_estoque_timestamp();
