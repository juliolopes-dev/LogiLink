import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  query_timeout: 30000,
  statement_timeout: 30000,
})

async function testarConexaoPool() {
  console.log('🔌 Testando Pool de Conexões\n')

  try {
    // Teste 1: Conexão básica
    console.log('1. Testando conexão básica...')
    const result1 = await pool.query('SELECT NOW() as agora, current_database() as banco')
    console.log(`✅ Conectado ao banco: ${result1.rows[0].banco}`)
    console.log(`✅ Data/Hora: ${result1.rows[0].agora}\n`)

    // Teste 2: Query simples
    console.log('2. Testando query simples...')
    const result2 = await pool.query('SELECT COUNT(*) FROM auditoria_integracao."Grupo_Combinado_DRP"')
    console.log(`✅ Total de grupos: ${result2.rows[0].count}\n`)

    // Teste 3: Query mais complexa (simular a que estava dando timeout)
    console.log('3. Testando query complexa...')
    const start = Date.now()
    const result3 = await pool.query(`
      SELECT 
        p.cod_produto,
        p.descricao,
        COUNT(*) as total_movimentacoes
      FROM auditoria_integracao.auditoria_produtos_drp p
      LEFT JOIN auditoria_integracao.auditoria_mov_petrolina m 
        ON p.cod_produto = m.cod_produto
      GROUP BY p.cod_produto, p.descricao
      LIMIT 10
    `)
    const duration = Date.now() - start
    console.log(`✅ Query executada em ${duration}ms`)
    console.log(`✅ Retornou ${result3.rows.length} produtos\n`)

    // Teste 4: Múltiplas conexões simultâneas
    console.log('4. Testando múltiplas conexões simultâneas...')
    const promises = []
    for (let i = 0; i < 5; i++) {
      promises.push(
        pool.query('SELECT $1 as numero, pg_sleep(0.1)', [i])
      )
    }
    await Promise.all(promises)
    console.log(`✅ 5 queries simultâneas executadas com sucesso\n`)

    // Teste 5: Verificar estado do pool
    console.log('5. Estado do pool:')
    console.log(`   Total de conexões: ${pool.totalCount}`)
    console.log(`   Conexões ociosas: ${pool.idleCount}`)
    console.log(`   Conexões aguardando: ${pool.waitingCount}\n`)

    console.log('✅ Todos os testes passaram!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

testarConexaoPool()
