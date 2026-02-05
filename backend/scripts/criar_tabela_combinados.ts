import prisma from '../src/lib/prisma.js'

async function criarTabelaCombinados() {
  try {
    console.log('🔧 Criando tabela de combinados...')

    // Criar tabela de grupos de combinados
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS combinados (
        id SERIAL PRIMARY KEY,
        cod_grupo VARCHAR(50) NOT NULL UNIQUE,
        descricao VARCHAR(255) NOT NULL,
        ativo BOOLEAN DEFAULT true,
        observacao TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    console.log('✅ Tabela combinados criada')

    // Criar tabela de produtos do combinado
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS combinados_produtos (
        id SERIAL PRIMARY KEY,
        cod_grupo VARCHAR(50) NOT NULL,
        cod_produto VARCHAR(20) NOT NULL,
        ordem INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cod_grupo) REFERENCES combinados(cod_grupo) ON DELETE CASCADE,
        UNIQUE(cod_grupo, cod_produto)
      )
    `)

    console.log('✅ Tabela combinados_produtos criada')

    // Criar índices para performance
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_combinados_ativo 
      ON combinados(ativo)
    `)

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_combinados_produtos_grupo 
      ON combinados_produtos(cod_grupo)
    `)

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_combinados_produtos_produto 
      ON combinados_produtos(cod_produto)
    `)

    console.log('✅ Índices criados')

    // Criar view para facilitar consultas
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE VIEW vw_combinados_detalhado AS
      SELECT 
        c.cod_grupo,
        c.descricao as grupo_descricao,
        c.ativo,
        c.observacao,
        cp.cod_produto,
        p.descricao as produto_descricao,
        cp.ordem,
        c.created_at,
        c.updated_at
      FROM combinados c
      INNER JOIN combinados_produtos cp ON c.cod_grupo = cp.cod_grupo
      LEFT JOIN dim_produto p ON cp.cod_produto = p.cod_produto
      ORDER BY c.cod_grupo, cp.ordem, cp.cod_produto
    `)

    console.log('✅ View vw_combinados_detalhado criada')

    console.log('\n📊 Estrutura de Combinados criada com sucesso!')
    console.log('\n📋 Tabelas criadas:')
    console.log('  - combinados (grupos de produtos intercambiáveis)')
    console.log('  - combinados_produtos (produtos de cada grupo)')
    console.log('  - vw_combinados_detalhado (view para consultas)')

  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

criarTabelaCombinados()
