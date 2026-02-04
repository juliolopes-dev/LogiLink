import { Pool } from 'pg'
import * as XLSX from 'xlsx'
import * as path from 'path'

const poolAuditoria = new Pool({
  connectionString: 'postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable'
})

async function importarCombinadosExcel() {
  try {
    console.log('📊 Importando Combinados do Excel\n')

    // 1. Criar tabelas
    console.log('📋 1. Criando tabelas...')
    await poolAuditoria.query(`
      CREATE TABLE IF NOT EXISTS auditoria_integracao.combinados (
        id SERIAL PRIMARY KEY,
        cod_grupo VARCHAR(50) NOT NULL UNIQUE,
        descricao VARCHAR(255) NOT NULL,
        ativo BOOLEAN DEFAULT true,
        observacao TEXT,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_combinados_ativo ON auditoria_integracao.combinados(ativo);

      CREATE TABLE IF NOT EXISTS auditoria_integracao.combinados_produtos (
        id SERIAL PRIMARY KEY,
        cod_grupo VARCHAR(50) NOT NULL,
        cod_produto VARCHAR(20) NOT NULL,
        ordem INTEGER DEFAULT 1,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT combinados_produtos_unique UNIQUE (cod_grupo, cod_produto),
        CONSTRAINT fk_combinados_grupo 
          FOREIGN KEY (cod_grupo) 
          REFERENCES auditoria_integracao.combinados(cod_grupo)
          ON DELETE CASCADE
          ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_combinados_produtos_grupo ON auditoria_integracao.combinados_produtos(cod_grupo);
      CREATE INDEX IF NOT EXISTS idx_combinados_produtos_produto ON auditoria_integracao.combinados_produtos(cod_produto);

      CREATE OR REPLACE VIEW auditoria_integracao.vw_combinados_detalhado AS
      SELECT 
        c.cod_grupo,
        c.descricao AS grupo_descricao,
        c.ativo,
        c.observacao,
        cp.cod_produto,
        cp.ordem,
        c.created_at,
        c.updated_at
      FROM auditoria_integracao.combinados c
      JOIN auditoria_integracao.combinados_produtos cp 
        ON c.cod_grupo = cp.cod_grupo
      ORDER BY c.cod_grupo, cp.ordem, cp.cod_produto;
    `)
    console.log('✅ Tabelas criadas!\n')

    // 2. Ler arquivo Excel
    console.log('📂 2. Lendo arquivo COMBINADOS.xlsx...')
    const caminhoExcel = path.join(__dirname, '..', '..', 'COMBINADOS.xlsx')
    const workbook = XLSX.readFile(caminhoExcel)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const dados = XLSX.utils.sheet_to_json(worksheet)

    console.log(`✅ ${dados.length} linhas encontradas!\n`)

    if (dados.length > 0) {
      console.log('📋 Exemplo da primeira linha:')
      console.log(JSON.stringify(dados[0], null, 2))
      console.log('')
    }

    // 3. Processar dados
    console.log('📊 3. Processando dados...\n')

    const grupos = new Map<string, { descricao: string, produtos: Array<{ cod_produto: string, ordem: number }> }>()

    for (const row of dados as any[]) {
      const codGrupo = row['COD_GRUPO'] || row['cod_grupo'] || row['Cod_Grupo']
      const descricao = row['DESCRICAO'] || row['descricao'] || row['Descricao'] || codGrupo
      const codProduto = row['COD_PRODUTO'] || row['cod_produto'] || row['Cod_Produto']
      const ordem = row['ORDEM'] || row['ordem'] || row['Ordem'] || 1

      if (!codGrupo || !codProduto) {
        console.log(`⚠️  Linha ignorada (falta cod_grupo ou cod_produto):`, row)
        continue
      }

      if (!grupos.has(codGrupo)) {
        grupos.set(codGrupo, { descricao, produtos: [] })
      }

      grupos.get(codGrupo)!.produtos.push({
        cod_produto: String(codProduto),
        ordem: Number(ordem)
      })
    }

    console.log(`✅ ${grupos.size} grupos de combinados processados\n`)

    // 4. Inserir no banco
    console.log('💾 4. Inserindo no banco de dados...\n')

    let gruposInseridos = 0
    let produtosInseridos = 0

    for (const [codGrupo, info] of grupos.entries()) {
      // Inserir grupo
      await poolAuditoria.query(`
        INSERT INTO auditoria_integracao.combinados (cod_grupo, descricao, ativo)
        VALUES ($1, $2, true)
        ON CONFLICT (cod_grupo) DO UPDATE SET
          descricao = EXCLUDED.descricao,
          updated_at = CURRENT_TIMESTAMP
      `, [codGrupo, info.descricao])

      gruposInseridos++

      // Inserir produtos
      for (const produto of info.produtos) {
        await poolAuditoria.query(`
          INSERT INTO auditoria_integracao.combinados_produtos (cod_grupo, cod_produto, ordem)
          VALUES ($1, $2, $3)
          ON CONFLICT (cod_grupo, cod_produto) DO UPDATE SET
            ordem = EXCLUDED.ordem
        `, [codGrupo, produto.cod_produto, produto.ordem])

        produtosInseridos++
      }

      if (gruposInseridos % 10 === 0) {
        console.log(`   Processados ${gruposInseridos}/${grupos.size} grupos...`)
      }
    }

    console.log(`\n✅ Importação concluída!`)
    console.log(`   - ${gruposInseridos} grupos inseridos`)
    console.log(`   - ${produtosInseridos} produtos inseridos\n`)

    // 5. Verificar
    console.log('📊 5. Verificando dados importados...\n')

    const stats = await poolAuditoria.query(`
      SELECT 
        (SELECT COUNT(*) FROM auditoria_integracao.combinados) as total_grupos,
        (SELECT COUNT(*) FROM auditoria_integracao.combinados WHERE ativo = true) as grupos_ativos,
        (SELECT COUNT(*) FROM auditoria_integracao.combinados_produtos) as total_produtos,
        (SELECT COUNT(DISTINCT cod_grupo) FROM auditoria_integracao.combinados_produtos) as grupos_com_produtos
    `)

    const st = stats.rows[0]
    console.log('Estatísticas:')
    console.log(`  Total de Grupos:         ${st.total_grupos}`)
    console.log(`  Grupos Ativos:           ${st.grupos_ativos}`)
    console.log(`  Total de Produtos:       ${st.total_produtos}`)
    console.log(`  Grupos com Produtos:     ${st.grupos_com_produtos}`)

    // Testar VIEW
    const viewTest = await poolAuditoria.query(`
      SELECT * FROM auditoria_integracao.vw_combinados_detalhado LIMIT 3
    `)

    console.log(`\n👁️  VIEW vw_combinados_detalhado: ${viewTest.rows.length} registros (teste)`)

    if (viewTest.rows.length > 0) {
      console.log('\n📋 Exemplo de combinado:')
      console.log(JSON.stringify(viewTest.rows[0], null, 2))
    }

    console.log('\n\n✅ Importação concluída com sucesso!')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await poolAuditoria.end()
  }
}

importarCombinadosExcel()
