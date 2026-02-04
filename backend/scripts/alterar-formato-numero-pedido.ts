import poolAuditoria from '../src/lib/database-auditoria.js'

async function alterarFormatoNumeroPedido() {
  try {
    console.log('🔧 Alterando formato do número de pedido DRP...')

    // Dropar a função antiga
    await poolAuditoria.query(`
      DROP FUNCTION IF EXISTS auditoria_integracao.gerar_numero_pedido_drp(VARCHAR);
    `)
    console.log('✅ Função antiga removida')

    // Criar nova função com formato simples
    await poolAuditoria.query(`
      CREATE OR REPLACE FUNCTION auditoria_integracao.gerar_numero_pedido_drp(filial VARCHAR)
      RETURNS VARCHAR
      LANGUAGE plpgsql
      AS $$
      DECLARE
        sequencia INTEGER;
        numero VARCHAR;
      BEGIN
        -- Buscar a maior sequência existente e incrementar
        SELECT COALESCE(MAX(
          CAST(SUBSTRING(numero_pedido FROM 'DRP([0-9]+)') AS INTEGER)
        ), 0) + 1
        INTO sequencia
        FROM auditoria_integracao."Pedido_DRP"
        WHERE numero_pedido LIKE 'DRP%';
        
        -- Formato simples: DRP001, DRP002, etc
        numero := 'DRP' || LPAD(sequencia::TEXT, 3, '0');
        
        RETURN numero;
      END;
      $$;
    `)
    console.log('✅ Nova função criada com formato DRP001, DRP002, etc')

    // Testar a função
    const resultado = await poolAuditoria.query(`
      SELECT auditoria_integracao.gerar_numero_pedido_drp('00') as numero_teste
    `)
    console.log('✅ Teste da função:', resultado.rows[0].numero_teste)

    console.log('\n✅ Formato do número de pedido alterado com sucesso!')
    console.log('📝 Novo formato: DRP001, DRP002, DRP003, etc')

  } catch (error) {
    console.error('❌ Erro ao alterar formato:', error)
    throw error
  } finally {
    await poolAuditoria.end()
  }
}

alterarFormatoNumeroPedido()
