-- Corrigir view Estoque_DRP para incluir filiais 01 e 04 de Juazeiro
-- Data: 2026-01-30

-- Dropar a view existente
DROP VIEW IF EXISTS auditoria_integracao."Estoque_DRP";

-- Recriar a view com o filtro correto
CREATE VIEW auditoria_integracao."Estoque_DRP" AS
-- Petrolina (todas as filiais)
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

-- CD
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
WHERE cod_filial IN ('01', '04')

UNION ALL

-- Salgueiro (todas as filiais)
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

-- Bonfim (todas as filiais)
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

-- Picos (todas as filiais)
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

-- Verificar resultado
SELECT 
    cod_filial,
    COUNT(*) as total_registros
FROM auditoria_integracao."Estoque_DRP"
GROUP BY cod_filial
ORDER BY cod_filial;
