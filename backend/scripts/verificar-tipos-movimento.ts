import poolAuditoria from '../src/lib/database-auditoria'

async function verificarTipos() {
  try {
    console.log('🔍 Verificando tipos de movimento na VIEW Movimentacao_DRP...\n')

    const tipos = await poolAuditoria.query(`
      SELECT DISTINCT tipo_movimento, COUNT(*) as total
      FROM auditoria_integracao."Movimentacao_DRP"
      GROUP BY tipo_movimento
      ORDER BY total DESC
    `)

    console.log('📋 Tipos de movimento encontrados:\n')
    tipos.rows.forEach(row => {
      console.log(`  ${row.tipo_movimento}: ${Number(row.total).toLocaleString('pt-BR')} registros`)
    })

    console.log('\n✅ Verificação concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
    process.exit(0)
  }
}

verificarTipos()
