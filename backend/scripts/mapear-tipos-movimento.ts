import poolAuditoria from '../src/lib/database-auditoria'

async function mapearTipos() {
  try {
    console.log('🔍 Mapeando tipos de movimento...\n')

    // Buscar exemplos de cada tipo
    const tipos = ['01', '05', '09', '12', '54', '55', '64']
    
    for (const tipo of tipos) {
      const exemplos = await poolAuditoria.query(`
        SELECT 
          tipo_movimento,
          cod_produto,
          quantidade,
          valor_venda,
          valor_custo,
          numero_documento,
          tipo_agente,
          cod_agente
        FROM auditoria_integracao."Movimentacao_DRP"
        WHERE tipo_movimento = $1
        LIMIT 3
      `, [tipo])

      console.log(`📋 Tipo ${tipo}:`)
      if (exemplos.rows.length > 0) {
        const ex = exemplos.rows[0]
        console.log(`   Quantidade: ${ex.quantidade}`)
        console.log(`   Valor Venda: ${ex.valor_venda}`)
        console.log(`   Valor Custo: ${ex.valor_custo}`)
        console.log(`   Documento: ${ex.numero_documento}`)
        console.log(`   Tipo Agente: ${ex.tipo_agente}`)
        console.log(`   Cod Agente: ${ex.cod_agente}`)
      }
      console.log('')
    }

    // Verificar se tem tipo_agente = 'C' (Cliente - Venda) ou 'F' (Fornecedor - Compra)
    console.log('🔍 Verificando tipo_agente...\n')
    const agentes = await poolAuditoria.query(`
      SELECT DISTINCT tipo_agente, COUNT(*) as total
      FROM auditoria_integracao."Movimentacao_DRP"
      WHERE tipo_agente IS NOT NULL
      GROUP BY tipo_agente
      ORDER BY total DESC
    `)

    console.log('📋 Tipos de agente encontrados:')
    agentes.rows.forEach(row => {
      console.log(`   ${row.tipo_agente}: ${Number(row.total).toLocaleString('pt-BR')} registros`)
    })

    console.log('\n✅ Mapeamento concluído!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
    process.exit(0)
  }
}

mapearTipos()
