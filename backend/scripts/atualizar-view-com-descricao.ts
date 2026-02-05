import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function atualizarView() {
  try {
    console.log('🔄 Conectando ao banco de auditoria...\n')

    // 1. Dropar VIEW existente
    console.log('🗑️  Dropando VIEW antiga...')
    await poolAuditoria.query(`DROP VIEW IF EXISTS auditoria_integracao."Movimentacao_DRP";`)
    console.log('✅ VIEW antiga removida\n')

    // 2. Ler arquivo SQL
    const sqlPath = join(__dirname, 'criar-view-movimentacao-drp.sql')
    const sqlContent = readFileSync(sqlPath, 'utf-8')

    // 3. Extrair CREATE VIEW
    const createViewMatch = sqlContent.match(/CREATE OR REPLACE VIEW[\s\S]*?FROM auditoria_integracao\.auditoria_mov_picos;/i)
    
    if (!createViewMatch) {
      throw new Error('Não foi possível encontrar o comando CREATE VIEW no arquivo SQL')
    }

    const createViewSQL = createViewMatch[0]

    // 4. Criar nova VIEW com coluna descricao_tipo_movimento
    console.log('📝 Criando VIEW com coluna descricao_tipo_movimento...\n')
    await poolAuditoria.query(createViewSQL)
    console.log('✅ VIEW "Movimentacao_DRP" recriada com sucesso!\n')

    // 5. Verificar nova estrutura
    console.log('🔍 Verificando nova estrutura...\n')
    
    const colunas = await poolAuditoria.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'auditoria_integracao'
        AND table_name = 'Movimentacao_DRP'
      ORDER BY ordinal_position
    `)

    console.log('📋 Colunas da VIEW:\n')
    colunas.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`)
    })

    // 6. Testar consulta
    console.log('\n🧪 Testando consulta...\n')
    const teste = await poolAuditoria.query(`
      SELECT 
        cod_produto,
        tipo_movimento,
        descricao_tipo_movimento,
        tipo_agente,
        quantidade
      FROM auditoria_integracao."Movimentacao_DRP"
      LIMIT 5
    `)

    console.log('📊 Exemplo de dados:\n')
    teste.rows.forEach(row => {
      console.log(`  Produto: ${row.cod_produto} | Tipo: ${row.tipo_movimento} | Descrição: ${row.descricao_tipo_movimento} | Agente: ${row.tipo_agente}`)
    })

    console.log('\n✅ VIEW atualizada e funcionando corretamente!')

  } catch (error) {
    console.error('❌ Erro ao atualizar VIEW:', error)
    throw error
  } finally {
    await poolAuditoria.end()
  }
}

atualizarView()
