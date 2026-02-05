-- ============================================
-- VIEW: NF_Entrada_DRP
-- Descrição: Unifica todas as tabelas de entrada de nota fiscal
-- Data: 28/01/2026
-- ============================================

DROP VIEW IF EXISTS auditoria_integracao."NF_Entrada_DRP";

CREATE OR REPLACE VIEW auditoria_integracao."NF_Entrada_DRP" AS

-- Petrolina (Filial 00)
SELECT 
  id,
  cod_filial,
  numero_nota,
  cod_fornecedor,
  cod_produto,
  quantidade,
  preco_custo,
  data_emissao,
  data_entrada,
  hash_registro,
  data_extracao
FROM auditoria_integracao.auditoria_nf_entrada_petrolina

UNION ALL

-- Juazeiro (Filial 01)
SELECT 
  id,
  cod_filial,
  numero_nota,
  cod_fornecedor,
  cod_produto,
  quantidade,
  preco_custo,
  data_emissao,
  data_entrada,
  hash_registro,
  data_extracao
FROM auditoria_integracao.auditoria_nf_entrada_juazeiro

UNION ALL

-- Salgueiro (Filial 02)
SELECT 
  id,
  cod_filial,
  numero_nota,
  cod_fornecedor,
  cod_produto,
  quantidade,
  preco_custo,
  data_emissao,
  data_entrada,
  hash_registro,
  data_extracao
FROM auditoria_integracao.auditoria_nf_entrada_salgueiro

UNION ALL

-- Bonfim (Filial 05)
SELECT 
  id,
  cod_filial,
  numero_nota,
  cod_fornecedor,
  cod_produto,
  quantidade,
  preco_custo,
  data_emissao,
  data_entrada,
  hash_registro,
  data_extracao
FROM auditoria_integracao.auditoria_nf_entrada_bonfim

UNION ALL

-- Picos (Filial 06)
SELECT 
  id,
  cod_filial,
  numero_nota,
  cod_fornecedor,
  cod_produto,
  quantidade,
  preco_custo,
  data_emissao,
  data_entrada,
  hash_registro,
  data_extracao
FROM auditoria_integracao.auditoria_nf_entrada_picos;

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_nf_entrada_produto ON auditoria_integracao.auditoria_nf_entrada_petrolina(cod_produto);
CREATE INDEX IF NOT EXISTS idx_nf_entrada_fornecedor ON auditoria_integracao.auditoria_nf_entrada_petrolina(cod_fornecedor);
CREATE INDEX IF NOT EXISTS idx_nf_entrada_data ON auditoria_integracao.auditoria_nf_entrada_petrolina(data_emissao);

CREATE INDEX IF NOT EXISTS idx_nf_entrada_produto ON auditoria_integracao.auditoria_nf_entrada_juazeiro(cod_produto);
CREATE INDEX IF NOT EXISTS idx_nf_entrada_fornecedor ON auditoria_integracao.auditoria_nf_entrada_juazeiro(cod_fornecedor);
CREATE INDEX IF NOT EXISTS idx_nf_entrada_data ON auditoria_integracao.auditoria_nf_entrada_juazeiro(data_emissao);

CREATE INDEX IF NOT EXISTS idx_nf_entrada_produto ON auditoria_integracao.auditoria_nf_entrada_salgueiro(cod_produto);
CREATE INDEX IF NOT EXISTS idx_nf_entrada_fornecedor ON auditoria_integracao.auditoria_nf_entrada_salgueiro(cod_fornecedor);
CREATE INDEX IF NOT EXISTS idx_nf_entrada_data ON auditoria_integracao.auditoria_nf_entrada_salgueiro(data_emissao);

CREATE INDEX IF NOT EXISTS idx_nf_entrada_produto ON auditoria_integracao.auditoria_nf_entrada_bonfim(cod_produto);
CREATE INDEX IF NOT EXISTS idx_nf_entrada_fornecedor ON auditoria_integracao.auditoria_nf_entrada_bonfim(cod_fornecedor);
CREATE INDEX IF NOT EXISTS idx_nf_entrada_data ON auditoria_integracao.auditoria_nf_entrada_bonfim(data_emissao);

CREATE INDEX IF NOT EXISTS idx_nf_entrada_produto ON auditoria_integracao.auditoria_nf_entrada_picos(cod_produto);
CREATE INDEX IF NOT EXISTS idx_nf_entrada_fornecedor ON auditoria_integracao.auditoria_nf_entrada_picos(cod_fornecedor);
CREATE INDEX IF NOT EXISTS idx_nf_entrada_data ON auditoria_integracao.auditoria_nf_entrada_picos(data_emissao);
