import { Pool } from 'pg'

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function verificarFiliais() {
  try {
    console.log('🔍 Verificando distribuição de registros por filial na VIEW Estoque_DRP...\n')

    const resultado = await poolAuditoria.query(`
      SELECT 
        cod_filial,
        COUNT(*) as total_registros
      FROM auditoria_integracao."Estoque_DRP"
      GROUP BY cod_filial
      ORDER BY cod_filial
    `)

    console.log('📊 Registros por filial:\n')
    let totalGeral = 0
    resultado.rows.forEach(row => {
      const filialNome = {
        '00': 'Petrolina',
        '01': 'Juazeiro',
        '02': 'Salgueiro',
        '05': 'Bonfim',
        '06': 'Picos'
      }[row.cod_filial] || 'Desconhecida'
      
      console.log(`  Filial ${row.cod_filial} (${filialNome.padEnd(12)}): ${row.total_registros.toString().padStart(8)} registros`)
      totalGeral += parseInt(row.total_registros)
    })

    console.log(`\n  ${'TOTAL'.padEnd(26)}: ${totalGeral.toString().padStart(8)} registros`)

    // Verificar se há produtos duplicados
    console.log('\n\n🔍 Verificando produtos duplicados (mesmo produto em múltiplas filiais na mesma data)...\n')
    
    const duplicatas = await poolAuditoria.query(`
      SELECT 
        cod_produto,
        data_extracao,
        COUNT(DISTINCT cod_filial) as num_filiais,
        STRING_AGG(DISTINCT cod_filial, ', ' ORDER BY cod_filial) as filiais
      FROM auditoria_integracao."Estoque_DRP"
      GROUP BY cod_produto, data_extracao
      HAVING COUNT(DISTINCT cod_filial) > 1
      LIMIT 5
    `)

    if (duplicatas.rows.length > 0) {
      console.log('⚠️  Produtos com registros em múltiplas filiais (esperado):')
      duplicatas.rows.forEach(row => {
        console.log(`  Produto ${row.cod_produto} | Data: ${row.data_extracao?.toISOString().split('T')[0]} | Filiais: ${row.filiais}`)
      })
    } else {
      console.log('✅ Nenhum produto duplicado encontrado!')
    }

    console.log('\n✅ Verificação concluída!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
  }
}

verificarFiliais()
