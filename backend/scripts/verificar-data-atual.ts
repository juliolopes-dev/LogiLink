import { Pool } from 'pg'

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function verificarData() {
  try {
    console.log('📅 Verificando data atual do banco...\n')

    const resultado = await poolAuditoria.query(`
      SELECT 
        CURRENT_DATE as data_atual,
        CURRENT_DATE - INTERVAL '12 months' as data_12_meses_atras,
        CURRENT_TIMESTAMP as timestamp_atual
    `)

    console.log('📊 Datas do banco:')
    console.log(JSON.stringify(resultado.rows[0], null, 2))

    // Verificar período de entradas do produto 058022
    console.log('\n\n🔍 Período de entradas do produto 058022:\n')
    
    const entradas = await poolAuditoria.query(`
      SELECT 
        MIN(data_movimento) as primeira_entrada,
        MAX(data_movimento) as ultima_entrada,
        COUNT(*) as total_entradas
      FROM auditoria_integracao."Movimentacao_DRP"
      WHERE cod_produto = '058022'
        AND tipo_movimento = '01'
    `)

    console.log('📊 Período de Entrada NF:')
    console.log(JSON.stringify(entradas.rows[0], null, 2))

    // Listar todas as entradas NF
    console.log('\n\n📋 Todas as Entrada NF do produto 058022:\n')
    
    const todasEntradas = await poolAuditoria.query(`
      SELECT 
        data_movimento,
        cod_filial,
        quantidade,
        numero_documento,
        EXTRACT(MONTH FROM data_movimento) as mes,
        EXTRACT(YEAR FROM data_movimento) as ano
      FROM auditoria_integracao."Movimentacao_DRP"
      WHERE cod_produto = '058022'
        AND tipo_movimento = '01'
      ORDER BY data_movimento DESC
    `)

    console.log('📊 Lista de entradas:')
    todasEntradas.rows.forEach(row => {
      console.log(`  ${row.data_movimento.toISOString().split('T')[0]} | Filial ${row.cod_filial} | ${row.quantidade} un | Doc: ${row.numero_documento}`)
    })

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
  }
}

verificarData()
