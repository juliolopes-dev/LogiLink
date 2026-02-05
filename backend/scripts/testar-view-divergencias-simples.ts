import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function testarView() {
  try {
    console.log('🔄 Criando VIEW simplificada...\n')

    const sqlPath = join(__dirname, 'criar-view-divergencias-offline-simples.sql')
    const sqlContent = readFileSync(sqlPath, 'utf-8')
    await poolAuditoria.query(sqlContent)
    
    console.log('✅ VIEW "DIVERGENCIAS_OFFLINE_DRP" criada!\n')

    // Testar VIEW
    console.log('📊 Primeiros 10 produtos com divergência:\n')
    
    const resultado = await poolAuditoria.query(`
      SELECT * 
      FROM auditoria_integracao."DIVERGENCIAS_OFFLINE_DRP"
      LIMIT 10
    `)

    console.log('CODIGO | FILIAL      | EST.LOCAL | EST.MATRIZ | DIV.EST | ENTRADAS LOCAL | SAIDAS LOCAL | ENTRADAS MATRIZ | SAIDAS MATRIZ | DIV.MOV | STATUS')
    console.log('-------+-------------+-----------+------------+---------+----------------+--------------+-----------------+---------------+---------+-----------')
    
    resultado.rows.forEach(row => {
      console.log(
        `${(row.codigo_do_produto || '').padEnd(6)} | ` +
        `${(row.nome_filial || '').padEnd(11)} | ` +
        `${(row.estoque_atual_local || 0).toString().padStart(9)} | ` +
        `${(row.estoque_atual_matriz || 0).toString().padStart(10)} | ` +
        `${(row.divergencia_estoque || 0).toString().padStart(7)} | ` +
        `${(row.soma_entradas_base_local || 0).toString().padStart(14)} | ` +
        `${(row.soma_saidas_base_local || 0).toString().padStart(12)} | ` +
        `${(row.soma_entradas_base_matriz || 0).toString().padStart(15)} | ` +
        `${(row.soma_saidas_base_matriz || 0).toString().padStart(13)} | ` +
        `${(row.divergencia_movimentacao || 0).toString().padStart(7)} | ` +
        `${row.divergencia || 'N/A'}`
      )
    })

    // Contar total
    const count = await poolAuditoria.query(`
      SELECT COUNT(*) as total
      FROM auditoria_integracao."DIVERGENCIAS_OFFLINE_DRP"
    `)

    console.log(`\n✅ Total de produtos com divergência: ${count.rows[0].total}`)

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
  }
}

testarView()
