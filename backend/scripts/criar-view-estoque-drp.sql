-- ============================================
-- VIEW: Estoque_DRP
-- Descrição: Unifica todas as tabelas de histórico de estoque
-- Data: 28/01/2026
-- ============================================

DROP VIEW IF EXISTS auditoria_integracao."Estoque_DRP";

CREATE OR REPLACE VIEW auditoria_integracao."Estoque_DRP" AS

-- Petrolina (Filial 00)
SELECT 
  id,
  cod_filial,
  cod_produto,
  estoque,
  quantidade_bloqueada,
  preco_custo,
  preco_medio,
  data_calculo_custo,
  estoque_minimo,
  hash_registro,
  data_extracao
FROM auditoria_integracao.auditoria_estoque_petrolina

UNION ALL

-- Juazeiro (Filial 01)
-- IMPORTANTE: Esta tabela contém dados de todas as filiais, filtrar apenas cod_filial = '01'
SELECT 
  id,
  cod_filial,
  cod_produto,
  estoque,
  quantidade_bloqueada,
  preco_custo,
  preco_medio,
  data_calculo_custo,
  estoque_minimo,
  hash_registro,
  data_extracao
FROM auditoria_integracao.auditoria_estoque_juazeiro
WHERE cod_filial = '01'

UNION ALL

-- Salgueiro (Filial 02)
SELECT 
  id,
  cod_filial,
  cod_produto,
  estoque,
  quantidade_bloqueada,
  preco_custo,
  preco_medio,
  data_calculo_custo,
  estoque_minimo,
  hash_registro,
  data_extracao
FROM auditoria_integracao.auditoria_estoque_salgueiro

UNION ALL

-- Bonfim (Filial 05)
SELECT 
  id,
  cod_filial,
  cod_produto,
  estoque,
  quantidade_bloqueada,
  preco_custo,
  preco_medio,
  data_calculo_custo,
  estoque_minimo,
  hash_registro,
  data_extracao
FROM auditoria_integracao.auditoria_estoque_bonfim

UNION ALL

-- Picos (Filial 06)
SELECT 
  id,
  cod_filial,
  cod_produto,
  estoque,
  quantidade_bloqueada,
  preco_custo,
  preco_medio,
  data_calculo_custo,
  estoque_minimo,
  hash_registro,
  data_extracao
FROM auditoria_integracao.auditoria_estoque_picos;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_estoque_produto_petrolina ON auditoria_integracao.auditoria_estoque_petrolina(cod_produto);
CREATE INDEX IF NOT EXISTS idx_estoque_filial_petrolina ON auditoria_integracao.auditoria_estoque_petrolina(cod_filial);
CREATE INDEX IF NOT EXISTS idx_estoque_data_petrolina ON auditoria_integracao.auditoria_estoque_petrolina(data_extracao);

CREATE INDEX IF NOT EXISTS idx_estoque_produto_juazeiro ON auditoria_integracao.auditoria_estoque_juazeiro(cod_produto);
CREATE INDEX IF NOT EXISTS idx_estoque_filial_juazeiro ON auditoria_integracao.auditoria_estoque_juazeiro(cod_filial);
CREATE INDEX IF NOT EXISTS idx_estoque_data_juazeiro ON auditoria_integracao.auditoria_estoque_juazeiro(data_extracao);

CREATE INDEX IF NOT EXISTS idx_estoque_produto_salgueiro ON auditoria_integracao.auditoria_estoque_salgueiro(cod_produto);
CREATE INDEX IF NOT EXISTS idx_estoque_filial_salgueiro ON auditoria_integracao.auditoria_estoque_salgueiro(cod_filial);
CREATE INDEX IF NOT EXISTS idx_estoque_data_salgueiro ON auditoria_integracao.auditoria_estoque_salgueiro(data_extracao);

CREATE INDEX IF NOT EXISTS idx_estoque_produto_bonfim ON auditoria_integracao.auditoria_estoque_bonfim(cod_produto);
CREATE INDEX IF NOT EXISTS idx_estoque_filial_bonfim ON auditoria_integracao.auditoria_estoque_bonfim(cod_filial);
CREATE INDEX IF NOT EXISTS idx_estoque_data_bonfim ON auditoria_integracao.auditoria_estoque_bonfim(data_extracao);

CREATE INDEX IF NOT EXISTS idx_estoque_produto_picos ON auditoria_integracao.auditoria_estoque_picos(cod_produto);
CREATE INDEX IF NOT EXISTS idx_estoque_filial_picos ON auditoria_integracao.auditoria_estoque_picos(cod_filial);
CREATE INDEX IF NOT EXISTS idx_estoque_data_picos ON auditoria_integracao.auditoria_estoque_picos(data_extracao);
