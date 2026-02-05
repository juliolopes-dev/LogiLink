import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function criarTabelaConfigDRP() {
  console.log('🚀 Iniciando criação da tabela config_drp...')

  try {
    // Criar tabela config_drp
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS config_drp (
        id SERIAL PRIMARY KEY,
        cod_produto VARCHAR(20) NOT NULL,
        cod_filial VARCHAR(2),
        estoque_minimo_custom DECIMAL(15,3),
        dias_cobertura_custom INTEGER,
        meta_manual DECIMAL(15,3),
        ativo BOOLEAN DEFAULT true,
        observacao TEXT,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario_criacao VARCHAR(100),
        usuario_atualizacao VARCHAR(100),
        
        -- Constraints
        CONSTRAINT config_drp_produto_filial_unique UNIQUE (cod_produto, cod_filial),
        CONSTRAINT config_drp_estoque_minimo_check CHECK (estoque_minimo_custom >= 0),
        CONSTRAINT config_drp_dias_cobertura_check CHECK (dias_cobertura_custom > 0),
        CONSTRAINT config_drp_meta_manual_check CHECK (meta_manual >= 0)
      )
    `)
    console.log('✅ Tabela config_drp criada com sucesso!')

    // Criar índices
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_config_drp_produto 
      ON config_drp(cod_produto)
    `)
    console.log('✅ Índice idx_config_drp_produto criado!')

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_config_drp_filial 
      ON config_drp(cod_filial)
    `)
    console.log('✅ Índice idx_config_drp_filial criado!')

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_config_drp_ativo 
      ON config_drp(ativo)
    `)
    console.log('✅ Índice idx_config_drp_ativo criado!')

    // Criar comentários nas colunas
    await prisma.$executeRawUnsafe(`
      COMMENT ON TABLE config_drp IS 'Configurações personalizadas para cálculo DRP'
    `)

    await prisma.$executeRawUnsafe(`
      COMMENT ON COLUMN config_drp.cod_produto IS 'Código do produto (FK para dim_produto)'
    `)

    await prisma.$executeRawUnsafe(`
      COMMENT ON COLUMN config_drp.cod_filial IS 'Código da filial (NULL = aplica para todas as filiais)'
    `)

    await prisma.$executeRawUnsafe(`
      COMMENT ON COLUMN config_drp.estoque_minimo_custom IS 'Estoque mínimo personalizado (sobrescreve o padrão)'
    `)

    await prisma.$executeRawUnsafe(`
      COMMENT ON COLUMN config_drp.dias_cobertura_custom IS 'Dias de cobertura personalizados para este produto/filial'
    `)

    await prisma.$executeRawUnsafe(`
      COMMENT ON COLUMN config_drp.meta_manual IS 'Meta de estoque definida manualmente (ignora cálculo automático)'
    `)

    console.log('✅ Comentários adicionados!')

    // Verificar estrutura
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'config_drp'
      ORDER BY ordinal_position
    `)

    console.log('\n📊 Estrutura da tabela config_drp:')
    console.table(result)

    console.log('\n✅ Script executado com sucesso!')
    console.log('\n📝 Próximos passos:')
    console.log('1. Adicionar model no Prisma Schema')
    console.log('2. Criar rotas para CRUD de configurações')
    console.log('3. Criar interface de configuração no frontend')

  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
criarTabelaConfigDRP()
  .then(() => {
    console.log('\n🎉 Processo concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error)
    process.exit(1)
  })
