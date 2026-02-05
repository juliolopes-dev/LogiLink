-- ============================================
-- SCRIPT: Apagar tabelas antigas de movimentação
-- Descrição: Remove tabelas que foram migradas para o banco de auditoria
-- Data: 28/01/2026
-- ATENÇÃO: Execute este script SOMENTE após confirmar que a migração está funcionando!
-- ============================================

-- 1. Dropar VIEW de movimentação (se existir)
DROP VIEW IF EXISTS vw_movimentacao_detalhada CASCADE;

-- 2. Dropar tabela de movimentação
-- ATENÇÃO: Isso vai apagar TODOS os dados de movimentação do banco antigo!
-- Certifique-se de que o banco de auditoria está funcionando corretamente
DROP TABLE IF EXISTS fato_movimentacao CASCADE;

-- 3. Verificar se as tabelas foram removidas
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name = 'fato_movimentacao' OR table_name = 'vw_movimentacao_detalhada')
ORDER BY table_name;

-- Se a query acima retornar 0 linhas, as tabelas foram removidas com sucesso!

-- ============================================
-- OBSERVAÇÕES:
-- ============================================
-- 
-- ✅ MIGRADO PARA: banco-dados-bezerra (95.111.255.122:4214)
-- ✅ VIEW NOVA: auditoria_integracao.Movimentacao_DRP
-- ✅ REGISTROS: 5.744.798 movimentações
-- ✅ BACKEND: Atualizado para usar poolAuditoria
-- 
-- ❌ TABELAS ANTIGAS (podem ser apagadas):
--    - fato_movimentacao
--    - vw_movimentacao_detalhada
-- 
-- ============================================
