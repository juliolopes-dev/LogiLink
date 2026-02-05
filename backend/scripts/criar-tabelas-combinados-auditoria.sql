-- ============================================
-- Migração de Estruturas de Combinados
-- Do banco antigo para o banco de auditoria
-- Data: 28/01/2026
-- ============================================

-- ============================================
-- 1. TABELA: combinados
-- ============================================

DROP TABLE IF EXISTS public.combinados CASCADE;

CREATE TABLE public.combinados (
  id SERIAL PRIMARY KEY,
  cod_grupo VARCHAR(50) NOT NULL UNIQUE,
  descricao VARCHAR(255) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  observacao TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_combinados_ativo ON public.combinados(ativo);

-- Comentários
COMMENT ON TABLE public.combinados IS 'Tabela de grupos de produtos combinados';
COMMENT ON COLUMN public.combinados.cod_grupo IS 'Código único do grupo de combinados';
COMMENT ON COLUMN public.combinados.descricao IS 'Descrição do grupo de combinados';
COMMENT ON COLUMN public.combinados.ativo IS 'Indica se o combinado está ativo';
COMMENT ON COLUMN public.combinados.observacao IS 'Observações sobre o combinado';

-- ============================================
-- 2. TABELA: combinados_produtos
-- ============================================

DROP TABLE IF EXISTS public.combinados_produtos CASCADE;

CREATE TABLE public.combinados_produtos (
  id SERIAL PRIMARY KEY,
  cod_grupo VARCHAR(50) NOT NULL,
  cod_produto VARCHAR(20) NOT NULL,
  ordem INTEGER DEFAULT 1,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint de unicidade
  CONSTRAINT combinados_produtos_cod_grupo_cod_produto_key UNIQUE (cod_grupo, cod_produto),
  
  -- Foreign Key
  CONSTRAINT fk_combinados_produtos_grupo 
    FOREIGN KEY (cod_grupo) 
    REFERENCES public.combinados(cod_grupo)
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Índices
CREATE INDEX idx_combinados_produtos_grupo ON public.combinados_produtos(cod_grupo);
CREATE INDEX idx_combinados_produtos_produto ON public.combinados_produtos(cod_produto);

-- Comentários
COMMENT ON TABLE public.combinados_produtos IS 'Produtos que compõem cada grupo de combinados';
COMMENT ON COLUMN public.combinados_produtos.cod_grupo IS 'Código do grupo de combinados';
COMMENT ON COLUMN public.combinados_produtos.cod_produto IS 'Código do produto no combinado';
COMMENT ON COLUMN public.combinados_produtos.ordem IS 'Ordem de exibição do produto no combinado';

-- ============================================
-- 3. VIEW: vw_combinados_detalhado
-- ============================================

DROP VIEW IF EXISTS public.vw_combinados_detalhado;

CREATE OR REPLACE VIEW public.vw_combinados_detalhado AS
SELECT 
  c.cod_grupo,
  c.descricao AS grupo_descricao,
  c.ativo,
  c.observacao,
  cp.cod_produto,
  cp.ordem,
  c.created_at,
  c.updated_at
FROM public.combinados c
JOIN public.combinados_produtos cp 
  ON c.cod_grupo = cp.cod_grupo
ORDER BY c.cod_grupo, cp.ordem, cp.cod_produto;

-- Comentário
COMMENT ON VIEW public.vw_combinados_detalhado IS 'VIEW detalhada de combinados (sem descrição de produto por enquanto)';

-- ============================================
-- Verificação
-- ============================================

SELECT 'Tabelas e VIEW de combinados criadas com sucesso!' AS status;

-- Listar estruturas criadas
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('combinados', 'combinados_produtos', 'vw_combinados_detalhado')
ORDER BY table_type, table_name;
