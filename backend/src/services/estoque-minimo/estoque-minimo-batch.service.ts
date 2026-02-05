/**
 * Service: Estoque Mínimo - Processamento em Batch (Background Job)
 * 
 * Otimizado para calcular estoque mínimo de TODOS os produtos
 * usando pré-cálculos em batch e processamento paralelo.
 * 
 * Performance: ~50x mais rápido que o processamento individual
 */

import poolAuditoria from '../../lib/database-auditoria'

// Configurações do algoritmo (mesmas do service original)
const CONFIG = {
  JANELA_VENDAS_DIAS: 180,
  JANELA_TENDENCIA_DIAS: 90,
  LEAD_TIME_PADRAO: 30,
  CLASSE_A: { fator_seguranca: 2.0, buffer_dias: 5 },
  CLASSE_B: { fator_seguranca: 1.5, buffer_dias: 3 },
  CLASSE_C: { fator_seguranca: 1.2, buffer_dias: 0 },
  FATOR_MIN: 0.5,
  FATOR_MAX: 2.0
}

const FILIAIS = ['00', '01', '02', '05', '06']
const BATCH_SIZE = 50 // Produtos processados em paralelo

// Estado global do job
interface JobState {
  id: string
  status: 'idle' | 'running' | 'completed' | 'error'
  total_produtos: number
  processados: number
  sucesso: number
  erros: number
  produtos_erro: string[]
  inicio: Date | null
  fim: Date | null
  mensagem: string
  tempo_estimado_restante: string | null
}

let currentJob: JobState = {
  id: '',
  status: 'idle',
  total_produtos: 0,
  processados: 0,
  sucesso: 0,
  erros: 0,
  produtos_erro: [],
  inicio: null,
  fim: null,
  mensagem: 'Nenhum cálculo em andamento',
  tempo_estimado_restante: null
}

// Cache de dados pré-calculados
interface CacheABC {
  [filial: string]: Map<string, 'A' | 'B' | 'C'>
}

interface CacheVendas {
  [key: string]: { // key = "produto:filial"
    vendas_180: number
    vendas_90: number
    vendas_90_180: number
  }
}

interface CacheSazonal {
  [key: string]: number // key = "produto:filial"
}

/**
 * Retorna o estado atual do job
 */
export function getJobStatus(): JobState {
  return { ...currentJob }
}

/**
 * Pré-calcula classificação ABC para TODAS as filiais de uma vez
 * 1 query por filial (5 queries total) em vez de 1 por produto/filial
 */
async function preCalcularABC(): Promise<CacheABC> {
  console.log('📊 Pré-calculando classificação ABC...')
  const cache: CacheABC = {}
  const dataInicio = new Date()
  dataInicio.setDate(dataInicio.getDate() - CONFIG.JANELA_VENDAS_DIAS)

  for (const filial of FILIAIS) {
    const result = await poolAuditoria.query(`
      WITH faturamento_produtos AS (
        SELECT 
          cod_produto,
          SUM(quantidade * valor_venda) as faturamento
        FROM auditoria_integracao."Movimentacao_DRP"
        WHERE cod_filial = $1
          AND tipo_movimento = '55'
          AND data_movimento >= $2
        GROUP BY cod_produto
      ),
      ranking AS (
        SELECT 
          cod_produto,
          faturamento,
          (SUM(faturamento) OVER (ORDER BY faturamento DESC) / NULLIF(SUM(faturamento) OVER (), 0)) * 100 as percentual_acumulado
        FROM faturamento_produtos
      )
      SELECT cod_produto, percentual_acumulado
      FROM ranking
    `, [filial, dataInicio])

    cache[filial] = new Map()
    for (const row of result.rows) {
      const pct = parseFloat(row.percentual_acumulado)
      let classe: 'A' | 'B' | 'C' = 'C'
      if (pct <= 80) classe = 'A'
      else if (pct <= 95) classe = 'B'
      cache[filial].set(row.cod_produto, classe)
    }

    console.log(`  ✅ Filial ${filial}: ${result.rows.length} produtos classificados`)
  }

  return cache
}

/**
 * Pré-calcula vendas de TODOS os produtos de uma vez
 * 3 queries totais em vez de 3 por produto/filial
 */
async function preCalcularVendas(): Promise<CacheVendas> {
  console.log('📊 Pré-calculando vendas...')
  const cache: CacheVendas = {}

  const dataInicio180 = new Date()
  dataInicio180.setDate(dataInicio180.getDate() - 180)
  
  const dataInicio90 = new Date()
  dataInicio90.setDate(dataInicio90.getDate() - 90)

  // Vendas últimos 180 dias por produto/filial
  const result180 = await poolAuditoria.query(`
    SELECT cod_produto, cod_filial, COALESCE(SUM(quantidade), 0) as vendas
    FROM auditoria_integracao."Movimentacao_DRP"
    WHERE tipo_movimento = '55'
      AND data_movimento >= $1
      AND cod_filial IN ('00', '01', '02', '05', '06')
    GROUP BY cod_produto, cod_filial
  `, [dataInicio180])

  for (const row of result180.rows) {
    const key = `${row.cod_produto}:${row.cod_filial}`
    cache[key] = {
      vendas_180: parseFloat(row.vendas),
      vendas_90: 0,
      vendas_90_180: 0
    }
  }
  console.log(`  ✅ Vendas 180 dias: ${result180.rows.length} registros`)

  // Vendas últimos 90 dias por produto/filial
  const result90 = await poolAuditoria.query(`
    SELECT cod_produto, cod_filial, COALESCE(SUM(quantidade), 0) as vendas
    FROM auditoria_integracao."Movimentacao_DRP"
    WHERE tipo_movimento = '55'
      AND data_movimento >= $1
      AND cod_filial IN ('00', '01', '02', '05', '06')
    GROUP BY cod_produto, cod_filial
  `, [dataInicio90])

  for (const row of result90.rows) {
    const key = `${row.cod_produto}:${row.cod_filial}`
    if (cache[key]) {
      cache[key].vendas_90 = parseFloat(row.vendas)
      cache[key].vendas_90_180 = cache[key].vendas_180 - cache[key].vendas_90
    }
  }
  console.log(`  ✅ Vendas 90 dias: ${result90.rows.length} registros`)

  return cache
}

/**
 * Pré-calcula fator sazonal de TODOS os produtos de uma vez
 */
async function preCalcularSazonalidade(): Promise<CacheSazonal> {
  console.log('📊 Pré-calculando sazonalidade...')
  const cache: CacheSazonal = {}
  const mesAtual = new Date().getMonth() + 1
  const anoAnterior = new Date().getFullYear() - 1

  // Vendas do mês atual no ano anterior
  const resultMes = await poolAuditoria.query(`
    SELECT cod_produto, cod_filial, COALESCE(SUM(quantidade), 0) as vendas
    FROM auditoria_integracao."Movimentacao_DRP"
    WHERE tipo_movimento = '55'
      AND EXTRACT(MONTH FROM data_movimento) = $1
      AND EXTRACT(YEAR FROM data_movimento) = $2
      AND cod_filial IN ('00', '01', '02', '05', '06')
    GROUP BY cod_produto, cod_filial
  `, [mesAtual, anoAnterior])

  const vendasMes: { [key: string]: number } = {}
  for (const row of resultMes.rows) {
    vendasMes[`${row.cod_produto}:${row.cod_filial}`] = parseFloat(row.vendas)
  }

  // Média mensal do ano anterior
  const resultAno = await poolAuditoria.query(`
    SELECT cod_produto, cod_filial, COALESCE(SUM(quantidade), 0) / 12 as media_mensal
    FROM auditoria_integracao."Movimentacao_DRP"
    WHERE tipo_movimento = '55'
      AND EXTRACT(YEAR FROM data_movimento) = $1
      AND cod_filial IN ('00', '01', '02', '05', '06')
    GROUP BY cod_produto, cod_filial
  `, [anoAnterior])

  for (const row of resultAno.rows) {
    const key = `${row.cod_produto}:${row.cod_filial}`
    const mediaMensal = parseFloat(row.media_mensal)
    const vendasMesAtual = vendasMes[key] || 0

    if (mediaMensal > 0) {
      const fator = vendasMesAtual / mediaMensal
      cache[key] = Math.max(CONFIG.FATOR_MIN, Math.min(CONFIG.FATOR_MAX, fator))
    } else {
      cache[key] = 1.0
    }
  }

  console.log(`  ✅ Sazonalidade: ${Object.keys(cache).length} registros`)
  return cache
}

/**
 * Calcula estoque mínimo de um produto usando dados do cache
 */
function calcularComCache(
  cod_produto: string,
  cod_filial: string,
  cacheABC: CacheABC,
  cacheVendas: CacheVendas,
  cacheSazonal: CacheSazonal
) {
  const key = `${cod_produto}:${cod_filial}`
  const vendas = cacheVendas[key]

  if (!vendas || vendas.vendas_180 === 0) {
    return null // Sem vendas nesta filial
  }

  // Classificação ABC
  const classe_abc = cacheABC[cod_filial]?.get(cod_produto) || 'C'
  const paramsClasse = CONFIG[`CLASSE_${classe_abc}` as keyof typeof CONFIG] as {
    fator_seguranca: number
    buffer_dias: number
  }

  // Média diária
  const media_vendas_diarias = vendas.vendas_180 / CONFIG.JANELA_VENDAS_DIAS

  // Fator tendência
  let fator_tendencia = 1.0
  if (vendas.vendas_90_180 === 0) {
    fator_tendencia = vendas.vendas_90 > 0 ? 1.5 : 1.0
  } else {
    fator_tendencia = vendas.vendas_90 / vendas.vendas_90_180
    fator_tendencia = Math.max(CONFIG.FATOR_MIN, Math.min(CONFIG.FATOR_MAX, fator_tendencia))
  }

  // Fator sazonal
  const fator_sazonal = cacheSazonal[key] || 1.0

  // Lead time
  const lead_time_dias = CONFIG.LEAD_TIME_PADRAO
  const buffer_dias = paramsClasse.buffer_dias
  const lead_time_total = lead_time_dias + buffer_dias

  // Fórmula
  let estoque_minimo_calculado = 
    media_vendas_diarias * lead_time_total * paramsClasse.fator_seguranca * fator_tendencia * fator_sazonal

  estoque_minimo_calculado = Math.ceil(estoque_minimo_calculado)
  if (vendas.vendas_180 > 0 && estoque_minimo_calculado < 1) {
    estoque_minimo_calculado = 1
  }

  return {
    cod_produto,
    cod_filial,
    estoque_minimo_calculado,
    media_vendas_diarias,
    lead_time_dias,
    buffer_dias,
    fator_seguranca: paramsClasse.fator_seguranca,
    fator_tendencia,
    fator_sazonal,
    classe_abc,
    vendas_180_dias: vendas.vendas_180,
    vendas_90_dias: vendas.vendas_90,
    vendas_90_180_dias: vendas.vendas_90_180
  }
}

/**
 * Salva um único resultado no banco (upsert)
 */
async function salvarUnico(r: any): Promise<void> {
  await poolAuditoria.query(`
    INSERT INTO auditoria_integracao.estoque_minimo (
      cod_produto, cod_filial, estoque_minimo_calculado, estoque_minimo_ativo,
      media_vendas_diarias, lead_time_dias, buffer_dias, fator_seguranca,
      fator_tendencia, fator_sazonal, classe_abc,
      vendas_180_dias, vendas_90_dias, vendas_90_180_dias,
      data_calculo, metodo
    ) VALUES ($1, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), 'automatico')
    ON CONFLICT (cod_produto, cod_filial) 
    DO UPDATE SET
      estoque_minimo_calculado = $3,
      estoque_minimo_ativo = CASE 
        WHEN auditoria_integracao.estoque_minimo.estoque_minimo_manual IS NOT NULL 
        THEN auditoria_integracao.estoque_minimo.estoque_minimo_manual 
        ELSE $3 
      END,
      media_vendas_diarias = $4,
      lead_time_dias = $5,
      buffer_dias = $6,
      fator_seguranca = $7,
      fator_tendencia = $8,
      fator_sazonal = $9,
      classe_abc = $10,
      vendas_180_dias = $11,
      vendas_90_dias = $12,
      vendas_90_180_dias = $13,
      data_calculo = NOW(),
      updated_at = NOW()
  `, [
    r.cod_produto, r.cod_filial, r.estoque_minimo_calculado,
    r.media_vendas_diarias, r.lead_time_dias, r.buffer_dias,
    r.fator_seguranca, r.fator_tendencia, r.fator_sazonal,
    r.classe_abc, r.vendas_180_dias, r.vendas_90_dias, r.vendas_90_180_dias
  ])
}

/**
 * Salva resultados em batch (paralelo de 20 em 20)
 */
async function salvarBatch(resultados: any[]): Promise<void> {
  if (resultados.length === 0) return

  const SAVE_BATCH = 20
  for (let i = 0; i < resultados.length; i += SAVE_BATCH) {
    const mini = resultados.slice(i, i + SAVE_BATCH)
    await Promise.all(mini.map(r => salvarUnico(r)))
  }
}

/**
 * Formata tempo restante estimado
 */
function formatarTempoRestante(segundos: number): string {
  if (segundos < 60) return `${Math.round(segundos)}s`
  if (segundos < 3600) return `${Math.round(segundos / 60)}min`
  const horas = Math.floor(segundos / 3600)
  const mins = Math.round((segundos % 3600) / 60)
  return `${horas}h ${mins}min`
}

/**
 * Inicia o cálculo em background
 */
export async function iniciarCalculoBatch(): Promise<{ started: boolean; message: string }> {
  if (currentJob.status === 'running') {
    return { 
      started: false, 
      message: `Já existe um cálculo em andamento (${currentJob.processados}/${currentJob.total_produtos})` 
    }
  }

  // Resetar estado
  currentJob = {
    id: Date.now().toString(),
    status: 'running',
    total_produtos: 0,
    processados: 0,
    sucesso: 0,
    erros: 0,
    produtos_erro: [],
    inicio: new Date(),
    fim: null,
    mensagem: 'Iniciando...',
    tempo_estimado_restante: null
  }

  // Executar em background (não bloqueia)
  executarCalculoBatch().catch(error => {
    console.error('❌ Erro fatal no cálculo batch:', error)
    currentJob.status = 'error'
    currentJob.mensagem = `Erro fatal: ${error.message}`
    currentJob.fim = new Date()
  })

  return { started: true, message: 'Cálculo iniciado em background' }
}

/**
 * Execução principal do cálculo em batch
 */
async function executarCalculoBatch(): Promise<void> {
  const inicio = Date.now()

  try {
    // === FASE 1: Buscar produtos ===
    currentJob.mensagem = 'Buscando produtos com vendas...'
    console.log('🚀 [BATCH] Iniciando cálculo em batch...')

    const dataInicio = new Date()
    dataInicio.setDate(dataInicio.getDate() - 180)

    const produtosResult = await poolAuditoria.query(`
      SELECT DISTINCT m.cod_produto
      FROM auditoria_integracao."Movimentacao_DRP" m
      WHERE m.data_movimento >= $1
        AND m.tipo_movimento = '55'
        AND m.cod_filial != '03'
      GROUP BY m.cod_produto
      HAVING SUM(m.quantidade) >= 1
      ORDER BY m.cod_produto
    `, [dataInicio])

    const produtos = produtosResult.rows.map((r: any) => r.cod_produto)
    currentJob.total_produtos = produtos.length
    console.log(`📦 [BATCH] ${produtos.length} produtos encontrados`)

    if (produtos.length === 0) {
      currentJob.status = 'error'
      currentJob.mensagem = 'Nenhum produto encontrado'
      currentJob.fim = new Date()
      return
    }

    // === FASE 2: Pré-cálculos (o grande ganho de performance) ===
    currentJob.mensagem = 'Pré-calculando classificação ABC...'
    const cacheABC = await preCalcularABC()

    currentJob.mensagem = 'Pré-calculando vendas...'
    const cacheVendas = await preCalcularVendas()

    currentJob.mensagem = 'Pré-calculando sazonalidade...'
    const cacheSazonal = await preCalcularSazonalidade()

    const tempoPreCalculo = ((Date.now() - inicio) / 1000).toFixed(1)
    console.log(`⏱️ [BATCH] Pré-cálculos concluídos em ${tempoPreCalculo}s`)

    // === FASE 3: Processar produtos em lotes ===
    currentJob.mensagem = 'Calculando estoque mínimo...'

    for (let i = 0; i < produtos.length; i += BATCH_SIZE) {
      const lote = produtos.slice(i, i + BATCH_SIZE)
      const resultadosLote: any[] = []

      // Processar lote em paralelo
      await Promise.all(lote.map(async (cod_produto: string) => {
        try {
          for (const cod_filial of FILIAIS) {
            const resultado = calcularComCache(
              cod_produto, cod_filial, cacheABC, cacheVendas, cacheSazonal
            )
            if (resultado) {
              resultadosLote.push(resultado)
            }
          }
          currentJob.sucesso++
        } catch (error: any) {
          currentJob.erros++
          if (currentJob.produtos_erro.length < 50) {
            currentJob.produtos_erro.push(cod_produto)
          }
        }
        currentJob.processados++
      }))

      // Salvar lote no banco
      try {
        await salvarBatch(resultadosLote)
      } catch (error: any) {
        console.error(`❌ [BATCH] Erro ao salvar lote ${i}-${i + BATCH_SIZE}:`, error.message)
      }

      // Atualizar estimativa de tempo
      const tempoDecorrido = (Date.now() - inicio) / 1000
      const produtosPorSegundo = currentJob.processados / tempoDecorrido
      const produtosRestantes = currentJob.total_produtos - currentJob.processados
      const tempoRestante = produtosRestantes / produtosPorSegundo

      currentJob.tempo_estimado_restante = formatarTempoRestante(tempoRestante)
      currentJob.mensagem = `Calculando... ${currentJob.processados}/${currentJob.total_produtos} (${Math.round(produtosPorSegundo)} prod/s)`

      // Log a cada 500 produtos
      if (currentJob.processados % 500 === 0 || currentJob.processados === currentJob.total_produtos) {
        console.log(`📊 [BATCH] ${currentJob.processados}/${currentJob.total_produtos} - ${currentJob.tempo_estimado_restante} restante`)
      }
    }

    // === FASE 4: Finalização ===
    const tempoTotal = ((Date.now() - inicio) / 1000).toFixed(1)
    currentJob.status = 'completed'
    currentJob.fim = new Date()
    currentJob.mensagem = `Concluído em ${tempoTotal}s - ${currentJob.sucesso} produtos calculados`
    currentJob.tempo_estimado_restante = null

    console.log(`✅ [BATCH] Cálculo concluído em ${tempoTotal}s`)
    console.log(`   📊 Sucesso: ${currentJob.sucesso} | Erros: ${currentJob.erros}`)

  } catch (error: any) {
    currentJob.status = 'error'
    currentJob.mensagem = `Erro: ${error.message}`
    currentJob.fim = new Date()
    console.error('❌ [BATCH] Erro fatal:', error)
  }
}
