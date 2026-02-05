import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function executarView() {
  try {
    console.log('🔄 Conectando ao banco de auditoria...\n')

    // Ler arquivo SQL
    const sqlPath = join(__dirname, 'criar-view-divergencias-offline.sql')
    const sqlContent = readFileSync(sqlPath, 'utf-8')

    console.log('📝 Executando script SQL...\n')
    await poolAuditoria.query(sqlContent)
    
    console.log('✅ VIEW "DIVERGENCIAS_OFFLINE_DRP" criada com sucesso!\n')

    // Verificar estrutura da VIEW
    console.log('🔍 Verificando estrutura da VIEW...\n')
    
    const colunas = await poolAuditoria.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'auditoria_integracao'
        AND table_name = 'DIVERGENCIAS_OFFLINE_DRP'
      ORDER BY ordinal_position
    `)

    console.log('📋 Colunas da VIEW:\n')
    colunas.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`)
    })

    // Contar registros
    console.log('\n📊 Contando divergências...\n')
    
    const count = await poolAuditoria.query(`
      SELECT COUNT(*) as total
      FROM auditoria_integracao."DIVERGENCIAS_OFFLINE_DRP"
    `)

    console.log(`✅ Total de divergências encontradas: ${count.rows[0].total}`)

    // Resumo por filial
    console.log('\n📊 Resumo de divergências por filial:\n')
    
    const resumo = await poolAuditoria.query(`
      SELECT 
        cod_filial,
        nome_filial,
        COUNT(*) as total_produtos_com_divergencia,
        SUM(divergencia_entradas) as total_divergencia_entradas,
        SUM(divergencia_saidas) as total_divergencia_saidas,
        COUNT(CASE WHEN status_sincronizacao = 'DIVERGENCIA' THEN 1 END) as produtos_divergentes
      FROM auditoria_integracao."DIVERGENCIAS_OFFLINE_DRP"
      GROUP BY cod_filial, nome_filial
      ORDER BY cod_filial
    `)

    resumo.rows.forEach(row => {
      console.log(`  ${row.nome_filial} (${row.cod_filial}):`)
      console.log(`    - ${row.total_produtos_com_divergencia} produtos com divergência`)
      console.log(`    - Divergência total entradas: ${parseFloat(row.total_divergencia_entradas).toFixed(2)}`)
      console.log(`    - Divergência total saídas: ${parseFloat(row.total_divergencia_saidas).toFixed(2)}`)
      console.log(`    - Status DIVERGENCIA: ${row.produtos_divergentes} produtos\n`)
    })

    // Exemplos de divergências
    console.log('📊 Exemplos de divergências (top 5):\n')
    
    const exemplos = await poolAuditoria.query(`
      SELECT 
        cod_produto,
        nome_filial,
        soma_entradas_base_local,
        soma_entradas_base_matriz,
        divergencia_entradas,
        soma_saidas_base_local,
        soma_saidas_base_matriz,
        divergencia_saidas,
        status_sincronizacao
      FROM auditoria_integracao."DIVERGENCIAS_OFFLINE_DRP"
      WHERE status_sincronizacao = 'DIVERGENCIA'
      ORDER BY (divergencia_entradas + divergencia_saidas) DESC
      LIMIT 5
    `)

    if (exemplos.rows.length > 0) {
      exemplos.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. Produto ${row.cod_produto} - ${row.nome_filial}`)
        console.log(`     Entradas: Local=${row.soma_entradas_base_local} | Matriz=${row.soma_entradas_base_matriz} | Div=${row.divergencia_entradas}`)
        console.log(`     Saídas: Local=${row.soma_saidas_base_local} | Matriz=${row.soma_saidas_base_matriz} | Div=${row.divergencia_saidas}`)
        console.log(`     Status: ${row.status_sincronizacao}\n`)
      })
    } else {
      console.log('  ✅ Nenhuma divergência encontrada! Sistema sincronizado.\n')
    }

    console.log('✅ VIEW criada e testada com sucesso!')

  } catch (error) {
    console.error('❌ Erro ao executar VIEW:', error)
    throw error
  } finally {
    await poolAuditoria.end()
  }
}

executarView()
