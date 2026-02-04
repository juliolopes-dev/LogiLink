import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Pool para o banco ANTIGO (dados-bezerra)
const poolAntigo = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:12be35dd1e93eead5a07@147.93.144.135:1254/dados-bezerra?sslmode=disable'
})

// Pool para o banco NOVO (auditoria)
const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

function perguntarConfirmacao(pergunta: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise((resolve) => {
    rl.question(pergunta, (resposta) => {
      rl.close()
      resolve(resposta.toLowerCase() === 's' || resposta.toLowerCase() === 'sim')
    })
  })
}

async function executarLimpeza() {
  try {
    console.log('⚠️  ATENÇÃO: LIMPEZA DE TABELAS ANTIGAS\n')
    console.log('Este script vai APAGAR as seguintes tabelas do banco ANTIGO:')
    console.log('  - vw_movimentacao_detalhada (VIEW)')
    console.log('  - fato_movimentacao (TABELA)\n')

    // 1. Verificar se o banco de auditoria está funcionando
    console.log('🔍 Verificando banco de auditoria...\n')
    
    const countAuditoria = await poolAuditoria.query(`
      SELECT COUNT(*) as total
      FROM auditoria_integracao."Movimentacao_DRP"
    `)

    console.log(`✅ Banco de auditoria OK: ${countAuditoria.rows[0].total} registros na VIEW Movimentacao_DRP\n`)

    // 2. Verificar tabelas no banco antigo
    console.log('🔍 Verificando tabelas no banco antigo...\n')
    
    const tabelasAntigas = await poolAntigo.query(`
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name = 'fato_movimentacao' OR table_name = 'vw_movimentacao_detalhada')
      ORDER BY table_name
    `)

    if (tabelasAntigas.rows.length === 0) {
      console.log('ℹ️  Nenhuma tabela antiga encontrada. Já foram removidas!\n')
      return
    }

    console.log('📋 Tabelas encontradas:')
    tabelasAntigas.rows.forEach(t => {
      console.log(`  - ${t.table_name} (${t.table_type})`)
    })
    console.log('')

    // 3. Contar registros na tabela antiga
    try {
      const countAntigo = await poolAntigo.query(`
        SELECT COUNT(*) as total
        FROM fato_movimentacao
      `)
      console.log(`📊 Registros na tabela antiga: ${countAntigo.rows[0].total}\n`)
    } catch (error) {
      console.log('ℹ️  Tabela fato_movimentacao não existe ou já foi removida\n')
    }

    // 4. Pedir confirmação
    console.log('⚠️  ESTA AÇÃO NÃO PODE SER DESFEITA!\n')
    const confirmar = await perguntarConfirmacao('Deseja REALMENTE apagar as tabelas antigas? (s/n): ')

    if (!confirmar) {
      console.log('\n❌ Operação cancelada pelo usuário.')
      return
    }

    // 5. Ler e executar SQL
    console.log('\n🗑️  Executando limpeza...\n')
    
    const sqlPath = join(__dirname, 'apagar-tabelas-antigas.sql')
    const sqlContent = readFileSync(sqlPath, 'utf-8')
    
    // Executar apenas os comandos DROP (ignorar comentários e SELECT)
    const comandos = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.startsWith('DROP'))

    for (const comando of comandos) {
      console.log(`Executando: ${comando.substring(0, 50)}...`)
      await poolAntigo.query(comando)
      console.log('✅ Executado\n')
    }

    // 6. Verificar se foram removidas
    console.log('🔍 Verificando remoção...\n')
    
    const verificacao = await poolAntigo.query(`
      SELECT 
        table_name,
        table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name = 'fato_movimentacao' OR table_name = 'vw_movimentacao_detalhada')
      ORDER BY table_name
    `)

    if (verificacao.rows.length === 0) {
      console.log('✅ SUCESSO! Todas as tabelas antigas foram removidas!\n')
      console.log('📊 Resumo:')
      console.log(`  - Banco antigo: LIMPO`)
      console.log(`  - Banco auditoria: ${countAuditoria.rows[0].total} registros`)
      console.log(`  - Backend: Usando poolAuditoria`)
      console.log('\n🎉 Migração 100% concluída!')
    } else {
      console.log('⚠️  Algumas tabelas ainda existem:')
      verificacao.rows.forEach(t => {
        console.log(`  - ${t.table_name}`)
      })
    }

  } catch (error) {
    console.error('\n❌ Erro ao executar limpeza:', error)
    throw error
  } finally {
    await poolAntigo.end()
    await poolAuditoria.end()
  }
}

executarLimpeza()
