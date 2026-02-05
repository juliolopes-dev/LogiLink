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
    const sqlPath = join(__dirname, 'criar-view-estoque-drp.sql')
    const sqlContent = readFileSync(sqlPath, 'utf-8')

    console.log('📝 Executando script SQL...\n')
    await poolAuditoria.query(sqlContent)
    
    console.log('✅ VIEW "Estoque_DRP" criada com sucesso!\n')

    // Verificar estrutura da VIEW
    console.log('🔍 Verificando estrutura da VIEW...\n')
    
    const colunas = await poolAuditoria.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'auditoria_integracao'
        AND table_name = 'Estoque_DRP'
      ORDER BY ordinal_position
    `)

    console.log('📋 Colunas da VIEW:\n')
    colunas.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`)
    })

    // Contar registros
    console.log('\n📊 Contando registros...\n')
    
    const count = await poolAuditoria.query(`
      SELECT COUNT(*) as total
      FROM auditoria_integracao."Estoque_DRP"
    `)

    console.log(`✅ Total de registros: ${count.rows[0].total}`)

    // Testar consulta
    console.log('\n🧪 Testando consulta...\n')
    
    const teste = await poolAuditoria.query(`
      SELECT 
        cod_filial,
        cod_produto,
        estoque,
        preco_custo,
        preco_medio,
        data_extracao
      FROM auditoria_integracao."Estoque_DRP"
      ORDER BY data_extracao DESC
      LIMIT 5
    `)

    console.log('📊 Últimos 5 registros:\n')
    teste.rows.forEach(row => {
      console.log(`  Filial ${row.cod_filial} | Produto ${row.cod_produto} | Estoque: ${row.estoque} | Custo: R$ ${row.preco_custo} | Data: ${row.data_extracao?.toISOString().split('T')[0]}`)
    })

    console.log('\n✅ VIEW criada e testada com sucesso!')

  } catch (error) {
    console.error('❌ Erro ao executar VIEW:', error)
    throw error
  } finally {
    await poolAuditoria.end()
  }
}

executarView()
