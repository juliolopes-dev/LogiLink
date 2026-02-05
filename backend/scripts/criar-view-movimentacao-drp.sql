-- =====================================================
-- VIEW UNIFICADA DE MOVIMENTAÇÃO PARA DRP
-- =====================================================
-- Database: banco-dados-bezerra (95.111.255.122:4214)
-- Schema: auditoria_integracao
-- View Name: Movimentacao_DRP
-- =====================================================
-- Unifica as 5 tabelas de movimentação das filiais
-- em uma única VIEW para consulta simplificada
-- =====================================================

CREATE OR REPLACE VIEW auditoria_integracao."Movimentacao_DRP" AS

-- Petrolina (Filial 00)
SELECT 
  id,
  cod_filial,
  cod_produto,
  data_movimento,
  tipo_movimento,
  CASE 
    WHEN tipo_movimento = '01' THEN 'Entrada NF'
    WHEN tipo_movimento = '05' THEN 'Entrada Transferência'
    WHEN tipo_movimento = '09' THEN 'Troca/Devolução'
    WHEN tipo_movimento = '12' THEN 'Entrada Ajuste'
    WHEN tipo_movimento = '54' THEN 'Saída Ajuste'
    WHEN tipo_movimento = '55' THEN 'Vendas'
    WHEN tipo_movimento = '64' THEN 'Saída Transferência'
    ELSE 'Outros'
  END as descricao_tipo_movimento,
  quantidade,
  valor_custo,
  valor_medio,
  valor_venda,
  valor_entrada,
  numero_documento,
  tipo_agente,
  cod_agente,
  sequencia,
  hash_registro,
  data_extracao
FROM auditoria_integracao.auditoria_mov_petrolina

UNION ALL

-- Juazeiro (Filial 01)
SELECT 
  id,
  cod_filial,
  cod_produto,
  data_movimento,
  tipo_movimento,
  CASE 
    WHEN tipo_movimento = '01' THEN 'Entrada NF'
    WHEN tipo_movimento = '05' THEN 'Entrada Transferência'
    WHEN tipo_movimento = '09' THEN 'Troca/Devolução'
    WHEN tipo_movimento = '12' THEN 'Entrada Ajuste'
    WHEN tipo_movimento = '54' THEN 'Saída Ajuste'
    WHEN tipo_movimento = '55' THEN 'Vendas'
    WHEN tipo_movimento = '64' THEN 'Saída Transferência'
    ELSE 'Outros'
  END as descricao_tipo_movimento,
  quantidade,
  valor_custo,
  valor_medio,
  valor_venda,
  valor_entrada,
  numero_documento,
  tipo_agente,
  cod_agente,
  sequencia,
  hash_registro,
  data_extracao
FROM auditoria_integracao.auditoria_mov_juazeiro

UNION ALL

-- Salgueiro (Filial 02)
SELECT 
  id,
  cod_filial,
  cod_produto,
  data_movimento,
  tipo_movimento,
  CASE 
    WHEN tipo_movimento = '01' THEN 'Entrada NF'
    WHEN tipo_movimento = '05' THEN 'Entrada Transferência'
    WHEN tipo_movimento = '09' THEN 'Troca/Devolução'
    WHEN tipo_movimento = '12' THEN 'Entrada Ajuste'
    WHEN tipo_movimento = '54' THEN 'Saída Ajuste'
    WHEN tipo_movimento = '55' THEN 'Vendas'
    WHEN tipo_movimento = '64' THEN 'Saída Transferência'
    ELSE 'Outros'
  END as descricao_tipo_movimento,
  quantidade,
  valor_custo,
  valor_medio,
  valor_venda,
  valor_entrada,
  numero_documento,
  tipo_agente,
  cod_agente,
  sequencia,
  hash_registro,
  data_extracao
FROM auditoria_integracao.auditoria_mov_salgueiro

UNION ALL

-- Bonfim (Filial 05)
SELECT 
  id,
  cod_filial,
  cod_produto,
  data_movimento,
  tipo_movimento,
  CASE 
    WHEN tipo_movimento = '01' THEN 'Entrada NF'
    WHEN tipo_movimento = '05' THEN 'Entrada Transferência'
    WHEN tipo_movimento = '09' THEN 'Troca/Devolução'
    WHEN tipo_movimento = '12' THEN 'Entrada Ajuste'
    WHEN tipo_movimento = '54' THEN 'Saída Ajuste'
    WHEN tipo_movimento = '55' THEN 'Vendas'
    WHEN tipo_movimento = '64' THEN 'Saída Transferência'
    ELSE 'Outros'
  END as descricao_tipo_movimento,
  quantidade,
  valor_custo,
  valor_medio,
  valor_venda,
  valor_entrada,
  numero_documento,
  tipo_agente,
  cod_agente,
  sequencia,
  hash_registro,
  data_extracao
FROM auditoria_integracao.auditoria_mov_bonfim

UNION ALL

-- Picos (Filial 06)
SELECT 
  id,
  cod_filial,
  cod_produto,
  data_movimento,
  tipo_movimento,
  CASE 
    WHEN tipo_movimento = '01' THEN 'Entrada NF'
    WHEN tipo_movimento = '05' THEN 'Entrada Transferência'
    WHEN tipo_movimento = '09' THEN 'Troca/Devolução'
    WHEN tipo_movimento = '12' THEN 'Entrada Ajuste'
    WHEN tipo_movimento = '54' THEN 'Saída Ajuste'
    WHEN tipo_movimento = '55' THEN 'Vendas'
    WHEN tipo_movimento = '64' THEN 'Saída Transferência'
    ELSE 'Outros'
  END as descricao_tipo_movimento,
  quantidade,
  valor_custo,
  valor_medio,
  valor_venda,
  valor_entrada,
  numero_documento,
  tipo_agente,
  cod_agente,
  sequencia,
  hash_registro,
  data_extracao
FROM auditoria_integracao.auditoria_mov_picos;

-- =====================================================
-- COMENTÁRIOS E INFORMAÇÕES
-- =====================================================

COMMENT ON VIEW auditoria_integracao."Movimentacao_DRP" IS 
'VIEW unificada de movimentação de todas as filiais para cálculo de DRP. 
Combina dados de: Petrolina (00), Juazeiro (01), Salgueiro (02), Bonfim (05) e Picos (06).
Total de registros: ~5.8 milhões (soma de todas as tabelas).';

-- =====================================================
-- EXEMPLOS DE USO
-- =====================================================

-- Exemplo 1: Buscar movimentações de um produto nos últimos 90 dias
-- SELECT * FROM auditoria_integracao."Movimentacao_DRP"
-- WHERE cod_produto = '000064'
--   AND data_movimento >= CURRENT_DATE - INTERVAL '90 days'
-- ORDER BY data_movimento DESC;

-- Exemplo 2: Total de vendas por filial no último mês
-- SELECT 
--   cod_filial,
--   COUNT(*) as total_movimentacoes,
--   SUM(quantidade) as quantidade_total
-- FROM auditoria_integracao."Movimentacao_DRP"
-- WHERE tipo_movimento = 'V'
--   AND data_movimento >= CURRENT_DATE - INTERVAL '30 days'
-- GROUP BY cod_filial
-- ORDER BY cod_filial;

-- Exemplo 3: Histórico de vendas de um produto por filial
-- SELECT 
--   cod_filial,
--   DATE_TRUNC('month', data_movimento) as mes,
--   SUM(quantidade) as total_vendido
-- FROM auditoria_integracao."Movimentacao_DRP"
-- WHERE cod_produto = '000064'
--   AND tipo_movimento = 'V'
--   AND data_movimento >= CURRENT_DATE - INTERVAL '6 months'
-- GROUP BY cod_filial, DATE_TRUNC('month', data_movimento)
-- ORDER BY mes DESC, cod_filial;

-- =====================================================
-- VERIFICAÇÃO PÓS-CRIAÇÃO
-- =====================================================

-- Verificar se a VIEW foi criada com sucesso
-- SELECT COUNT(*) as total_registros 
-- FROM auditoria_integracao."Movimentacao_DRP";

-- Verificar distribuição por filial
-- SELECT 
--   cod_filial,
--   COUNT(*) as total_registros,
--   MIN(data_movimento) as data_mais_antiga,
--   MAX(data_movimento) as data_mais_recente
-- FROM auditoria_integracao."Movimentacao_DRP"
-- GROUP BY cod_filial
-- ORDER BY cod_filial;
