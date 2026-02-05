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
    const sqlPath = join(__dirname, 'criar-view-movimentacao-drp.sql')
    const sqlContent = readFileSync(sqlPath, 'utf-8')

    // Extrair apenas o CREATE VIEW (remover comentários e exemplos)
    const createViewMatch = sqlContent.match(/CREATE OR REPLACE VIEW[\s\S]*?FROM auditoria_integracao\.auditoria_mov_picos;/i)
    
    if (!createViewMatch) {
      throw new Error('Não foi possível encontrar o comando CREATE VIEW no arquivo SQL')
    }

    const createViewSQL = createViewMatch[0]

    console.log('📝 Executando CREATE VIEW...\n')
    await poolAuditoria.query(createViewSQL)
    console.log('✅ VIEW "Movimentacao_DRP" criada com sucesso!\n')

    // Verificar criação
    console.log('🔍 Verificando VIEW criada...\n')
    
    const countResult = await poolAuditoria.query(`
      SELECT COUNT(*) as total 
      FROM auditoria_integracao."Movimentacao_DRP"
    `)
    
    console.log(`📊 Total de registros na VIEW: ${Number(countResult.rows[0].total).toLocaleString('pt-BR')}\n`)

    // Verificar distribuição por filial
    const distribuicao = await poolAuditoria.query(`
      SELECT 
        cod_filial,
        COUNT(*) as total_registros,
        MIN(data_movimento) as data_mais_antiga,
        MAX(data_movimento) as data_mais_recente
      FROM auditoria_integracao."Movimentacao_DRP"
      GROUP BY cod_filial
      ORDER BY cod_filial
    `)

    console.log('📋 Distribuição por filial:\n')
    distribuicao.rows.forEach(row => {
      const filiais: any = {
        '00': 'Petrolina',
        '01': 'Juazeiro',
        '02': 'Salgueiro',
        '05': 'Bonfim',
        '06': 'Picos'
      }
      console.log(`  ${filiais[row.cod_filial] || row.cod_filial} (${row.cod_filial}):`)
      console.log(`    Registros: ${Number(row.total_registros).toLocaleString('pt-BR')}`)
      console.log(`    Período: ${row.data_mais_antiga?.toISOString().split('T')[0]} até ${row.data_mais_recente?.toISOString().split('T')[0]}`)
      console.log('')
    })

    console.log('✅ VIEW configurada e funcionando corretamente!')

  } catch (error) {
    console.error('❌ Erro ao executar VIEW:', error)
    throw error
  } finally {
    await poolAuditoria.end()
  }
}

executarView()
