import poolAuditoria from '../src/lib/database-auditoria.js'

async function testarPoolAuditoria() {
  try {
    console.log('🧪 Testando pool de auditoria importado\n')

    // Teste 1: Conexão básica
    console.log('1. Testando conexão...')
    const result1 = await poolAuditoria.query('SELECT NOW() as agora')
    console.log(`✅ Conectado: ${result1.rows[0].agora}\n`)

    // Teste 2: Verificar tabela Movimentacao_DRP
    console.log('2. Verificando tabela Movimentacao_DRP...')
    const result2 = await poolAuditoria.query(`
      SELECT COUNT(*) FROM auditoria_integracao."Movimentacao_DRP"
    `)
    console.log(`✅ Total de registros: ${result2.rows[0].count}\n`)

    // Teste 3: Query igual à que está falhando
    console.log('3. Testando query de vendas...')
    const result3 = await poolAuditoria.query(`
      SELECT 
        cod_filial,
        COALESCE(SUM(quantidade), 0) as total_vendas
      FROM auditoria_integracao."Movimentacao_DRP"
      WHERE cod_produto = $1
        AND tipo_movimento = '55'
        AND data_movimento >= CURRENT_DATE - INTERVAL '1 day' * $2
        AND cod_filial != '03'
      GROUP BY cod_filial
      ORDER BY cod_filial
    `, ['008612', 30])
    
    console.log(`✅ Registros encontrados: ${result3.rows.length}`)
    if (result3.rows.length > 0) {
      console.log('   Exemplo:', result3.rows[0])
    }

    console.log('\n✅ Pool de auditoria funcionando perfeitamente!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
  }
}

testarPoolAuditoria()
