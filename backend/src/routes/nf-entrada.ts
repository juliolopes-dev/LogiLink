import { FastifyInstance } from 'fastify'
import { 
  buscarNFEntrada, 
  buscarNFPorNumero, 
  buscarNFPorProduto, 
  buscarNFPorFornecedor
} from '../lib/database-auditoria.js'
import poolAuditoria from '../lib/database-auditoria.js'
import prisma from '../lib/prisma'
import * as XLSX from 'xlsx'

/**
 * Busca estoque mínimo dinâmico (novo sistema) com fallback para tabela antiga
 */
async function buscarEstoqueMinimoAtualizado(codProduto: string, codFilial: string): Promise<number> {
  try {
    // 1. Tentar buscar do novo sistema (estoque mínimo dinâmico)
    const resultadoDinamico = await poolAuditoria.query(`
      SELECT estoque_minimo_calculado
      FROM auditoria_integracao.estoque_minimo
      WHERE cod_produto = $1 
        AND cod_filial = $2
        AND manual = false
      ORDER BY data_calculo DESC
      LIMIT 1
    `, [codProduto, codFilial])

    if (resultadoDinamico.rows.length > 0) {
      return parseFloat(resultadoDinamico.rows[0].estoque_minimo_calculado || '0')
    }

    // 2. Se não encontrar, buscar da tabela antiga (fallback)
    const resultadoAntigo = await poolAuditoria.query(`
      SELECT COALESCE(estoque_minimo, 0) as estoque_minimo
      FROM auditoria_integracao."Estoque_DRP"
      WHERE cod_produto = $1 AND cod_filial = $2
    `, [codProduto, codFilial])

    return parseFloat(resultadoAntigo.rows[0]?.estoque_minimo || '0')
  } catch (error) {
    console.error(`Erro ao buscar estoque mínimo para ${codProduto}/${codFilial}:`, error)
    return 0
  }
}

import { calcularFrequenciaSaida } from '../utils/drp/frequencia-saida'
import { enviarNotificacao } from './notifications.js'

const CD_FILIAL = '04'

const FILIAIS_MAP: Record<string, string> = {
  '00': 'Petrolina',
  '01': 'Juazeiro',
  '02': 'Salgueiro',
  '05': 'Bonfim',
  '06': 'Picos'
}

export async function nfEntradaRoutes(fastify: FastifyInstance) {
  
  // Listar NFs com filtros
  fastify.get('/nf-entrada', async (request, reply) => {
    try {
      const { 
        cod_produto, 
        cod_fornecedor, 
        numero_nota, 
        cod_filial,
        data_inicio,
        data_fim,
        limit = '100',
        offset = '0'
      } = request.query as any

      // Validação e sanitização de entrada
      const parsedLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 1000)
      const parsedOffset = Math.max(parseInt(offset) || 0, 0)

      const filtros: any = {
        limit: parsedLimit,
        offset: parsedOffset
      }

      if (cod_produto) filtros.codProduto = cod_produto
      if (cod_fornecedor) filtros.codFornecedor = cod_fornecedor
      if (numero_nota) filtros.numeroNota = numero_nota
      if (cod_filial) filtros.codFilial = cod_filial
      if (data_inicio) filtros.dataInicio = new Date(data_inicio)
      if (data_fim) filtros.dataFim = new Date(data_fim)

      const nfs = await buscarNFEntrada(filtros)

      return reply.send({
        success: true,
        data: nfs,
        total: nfs.length
      })
    } catch (error) {
      console.error('Erro ao buscar NFs:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar NFs'
      })
    }
  })

  // Buscar NF por número
  fastify.get<{
    Params: { numero_nota: string }
    Querystring: { cod_filial?: string }
  }>('/nf-entrada/:numero_nota', async (request, reply) => {
    try {
      const { numero_nota } = request.params
      const { cod_filial } = request.query

      const nfs = await buscarNFPorNumero(numero_nota, cod_filial)

      if (nfs.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Nota fiscal não encontrada'
        })
      }

      // Agrupar dados da NF
      const nf = {
        numero_nota: nfs[0].numero_nota,
        cod_filial: nfs[0].cod_filial,
        cod_fornecedor: nfs[0].cod_fornecedor,
        data_emissao: nfs[0].data_emissao,
        data_entrada: nfs[0].data_entrada,
        itens: nfs.map(item => ({
          id: item.id,
          cod_produto: item.cod_produto,
          quantidade: item.quantidade,
          preco_custo: item.preco_custo
        })),
        total_itens: nfs.length,
        valor_total: nfs.reduce((sum, item) => sum + (parseFloat(item.preco_custo || '0') * parseFloat(item.quantidade || '0')), 0)
      }

      return reply.send({
        success: true,
        data: nf
      })
    } catch (error) {
      console.error('Erro ao buscar NF:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar NF'
      })
    }
  })

  // Buscar NFs por produto
  fastify.get<{
    Params: { cod_produto: string }
    Querystring: { limit?: string }
  }>('/nf-entrada/produto/:cod_produto', async (request, reply) => {
    try {
      const { cod_produto } = request.params
      const { limit = '50' } = request.query

      const nfs = await buscarNFPorProduto(cod_produto, parseInt(limit))

      return reply.send({
        success: true,
        data: nfs,
        total: nfs.length
      })
    } catch (error) {
      console.error('Erro ao buscar NFs do produto:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar NFs do produto'
      })
    }
  })

  // Buscar NFs por fornecedor
  fastify.get<{
    Params: { cod_fornecedor: string }
    Querystring: { limit?: string }
  }>('/nf-entrada/fornecedor/:cod_fornecedor', async (request, reply) => {
    try {
      const { cod_fornecedor } = request.params
      const { limit = '100' } = request.query

      const nfs = await buscarNFPorFornecedor(cod_fornecedor, parseInt(limit))

      return reply.send({
        success: true,
        data: nfs,
        total: nfs.length
      })
    } catch (error) {
      console.error('Erro ao buscar NFs do fornecedor:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar NFs do fornecedor'
      })
    }
  })

  // ==========================================
  // ROTAS PARA DRP POR NF DE ENTRADA NO CD
  // ==========================================

  // Buscar NFs recentes do CD para autocomplete
  fastify.get('/nf-entrada/cd/recentes', async (request, reply) => {
    try {
      const { q, limit = '20' } = request.query as { q?: string; limit?: string }

      let whereClause = `WHERE cod_filial = '${CD_FILIAL}'`
      if (q && q.length >= 1) {
        whereClause += ` AND numero_nota ILIKE '%${q}%'`
      }

      const result = await poolAuditoria.query(`
        SELECT 
          numero_nota,
          cod_fornecedor,
          COUNT(DISTINCT cod_produto) as total_itens,
          SUM(quantidade) as qtd_total,
          MAX(data_extracao) as data_extracao
        FROM auditoria_integracao."NF_Entrada_DRP"
        ${whereClause}
        GROUP BY numero_nota, cod_fornecedor
        ORDER BY MAX(data_extracao) DESC
        LIMIT ${parseInt(limit)}
      `)

      return reply.send({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('Erro ao buscar NFs do CD:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar NFs do CD'
      })
    }
  })

  // Buscar detalhes de uma NF do CD
  fastify.get<{
    Params: { numero_nota: string }
  }>('/nf-entrada/cd/:numero_nota', async (request, reply) => {
    try {
      const { numero_nota } = request.params

      // Buscar itens da NF
      const itensResult = await poolAuditoria.query(`
        SELECT 
          nf.cod_produto,
          nf.quantidade,
          nf.preco_custo,
          p.descricao,
          p.referencia_fabricante,
          COALESCE(g.descricao, 'Sem Grupo') as grupo_descricao,
          COALESCE(e.estoque, 0) as estoque_cd
        FROM auditoria_integracao."NF_Entrada_DRP" nf
        LEFT JOIN auditoria_integracao.auditoria_produtos_drp p ON nf.cod_produto = p.cod_produto
        LEFT JOIN auditoria_integracao."Grupo" g ON p.cod_grupo = g.codgrupo
        LEFT JOIN auditoria_integracao."Estoque_DRP" e ON nf.cod_produto = e.cod_produto AND e.cod_filial = '${CD_FILIAL}'
        WHERE nf.numero_nota = $1 AND nf.cod_filial = '${CD_FILIAL}'
        ORDER BY p.descricao
      `, [numero_nota])

      if (itensResult.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Nota fiscal não encontrada no CD'
        })
      }

      // Buscar info do fornecedor
      const fornecedorResult = await poolAuditoria.query(`
        SELECT DISTINCT cod_fornecedor, MAX(data_extracao) as data_extracao
        FROM auditoria_integracao."NF_Entrada_DRP"
        WHERE numero_nota = $1 AND cod_filial = '${CD_FILIAL}'
        GROUP BY cod_fornecedor
      `, [numero_nota])

      return reply.send({
        success: true,
        data: {
          numero_nota,
          cod_filial: CD_FILIAL,
          cod_fornecedor: fornecedorResult.rows[0]?.cod_fornecedor,
          data_extracao: fornecedorResult.rows[0]?.data_extracao,
          total_itens: itensResult.rows.length,
          itens: itensResult.rows
        }
      })
    } catch (error) {
      console.error('Erro ao buscar NF do CD:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar NF do CD'
      })
    }
  })

  // Calcular DRP para uma NF do CD
  fastify.post<{
    Body: {
      numero_nota: string
      periodo_dias: number
      filiais?: string[]
    }
  }>('/nf-entrada/cd/calcular-drp', async (request, reply) => {
    try {
      const { numero_nota, periodo_dias = 90, filiais } = request.body

      const filiaisDestino = filiais || Object.keys(FILIAIS_MAP)

      // 1. Buscar produtos da NF
      const produtosNFResult = await poolAuditoria.query(`
        SELECT DISTINCT 
          nf.cod_produto,
          nf.quantidade as qtd_nf,
          p.descricao,
          p.referencia_fabricante,
          COALESCE(g.descricao, 'Sem Grupo') as grupo_descricao,
          COALESCE(e.estoque, 0) as estoque_cd
        FROM auditoria_integracao."NF_Entrada_DRP" nf
        LEFT JOIN auditoria_integracao.auditoria_produtos_drp p ON nf.cod_produto = p.cod_produto
        LEFT JOIN auditoria_integracao."Grupo" g ON p.cod_grupo = g.codgrupo
        LEFT JOIN auditoria_integracao."Estoque_DRP" e ON nf.cod_produto = e.cod_produto AND e.cod_filial = '${CD_FILIAL}'
        WHERE nf.numero_nota = $1 AND nf.cod_filial = '${CD_FILIAL}'
        ORDER BY p.descricao
      `, [numero_nota])

      if (produtosNFResult.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Nota fiscal não encontrada no CD'
        })
      }

      const produtos = produtosNFResult.rows
      const resultados: any[] = []
      let necessidadeTotal = 0
      let deficitTotal = 0

      // Função para arredondar para o múltiplo mais próximo
      const arredondarMultiplo = (valor: number, multiplo: number): number => {
        if (multiplo <= 1) return Math.round(valor)
        return Math.ceil(valor / multiplo) * multiplo
      }

      // 2. Para cada produto, calcular necessidade por filial
      for (const produto of produtos) {
        const codProduto = produto.cod_produto
        const qtdNF = parseFloat(produto.qtd_nf || '0')
        // Para DRP por NF, o volume a distribuir é a quantidade recebida na NF
        // (não o estoque já existente no CD).
        const estoqueCD = qtdNF

        // Buscar multiplo_venda do produto
        const configResult = await poolAuditoria.query(
          `SELECT COALESCE(multiplo_venda, 1) as multiplo_venda 
           FROM auditoria_integracao."Produto_Config_DRP" 
           WHERE cod_produto = $1 AND ativo = true`,
          [codProduto]
        )
        const multiploVenda = parseInt(configResult.rows[0]?.multiplo_venda || '1')
        
        const analisePorFilial: any[] = []
        let necessidadeProduto = 0

        for (const codFilial of filiaisDestino) {
          // Buscar estoque da filial
          const estoqueFilialResult = await poolAuditoria.query(`
            SELECT 
              COALESCE(estoque, 0) as estoque_disponivel
            FROM auditoria_integracao."Estoque_DRP"
            WHERE cod_produto = $1 AND cod_filial = $2
          `, [codProduto, codFilial])

          const estoqueAtual = parseFloat(estoqueFilialResult.rows[0]?.estoque_disponivel || '0')
          
          // Buscar estoque mínimo do novo sistema dinâmico (com fallback para tabela antiga)
          const estoqueMinimo = await buscarEstoqueMinimoAtualizado(codProduto, codFilial)

          // Buscar vendas do período (usando DISTINCT para evitar duplicatas)
          const vendasResult = await poolAuditoria.query(`
            SELECT COALESCE(SUM(quantidade), 0) as vendas
            FROM (
              SELECT DISTINCT ON (numero_documento, cod_produto, data_movimento::date)
                quantidade
              FROM auditoria_integracao."Movimentacao_DRP"
              WHERE cod_produto = $1 
                AND cod_filial = $2
                AND tipo_movimento = '55'
                AND data_movimento >= CURRENT_DATE - INTERVAL '${periodo_dias} days'
              ORDER BY numero_documento, cod_produto, data_movimento::date, sequencia
            ) vendas_unicas
          `, [codProduto, codFilial])

          const vendas = parseFloat(vendasResult.rows[0]?.vendas || '0')

          // Calcular média diária
          const mediaDiaria = vendas / periodo_dias

          // Meta inicial = vendas (sem considerar estoque mínimo ainda)
          let meta = vendas
          let usouEstoqueMinimo = false

          // Necessidade = Meta - Estoque
          const necessidade = Math.max(0, meta - estoqueAtual)
          necessidadeProduto += necessidade

          analisePorFilial.push({
            cod_filial: codFilial,
            nome: FILIAIS_MAP[codFilial] || codFilial,
            estoque_atual: estoqueAtual,
            estoque_minimo: estoqueMinimo,
            vendas_periodo: vendas,
            media_diaria: mediaDiaria,
            meta: meta,
            necessidade: necessidade,
            alocacao_sugerida: 0, // Será calculado depois
            usou_estoque_minimo: usouEstoqueMinimo
          })
        }

        // Verificar se é produto novo (sem vendas em nenhuma filial)
        const produtoSemVendas = analisePorFilial.every(f => f.vendas_periodo === 0)

        // Buscar grupo combinado do produto
        const grupoCombResult = await poolAuditoria.query(`
          SELECT cod_grupo 
          FROM auditoria_integracao."Produtos_Combinado_DRP"
          WHERE cod_produto = $1
          LIMIT 1
        `, [codProduto])

        const grupoCombinado = grupoCombResult.rows[0]?.cod_grupo || null
        let produtosCombinados: string[] = []

        if (grupoCombinado) {
          // Buscar todos os produtos do grupo combinado
          const produtosCombResult = await poolAuditoria.query(`
            SELECT cod_produto 
            FROM auditoria_integracao."Produtos_Combinado_DRP"
            WHERE cod_grupo = $1
          `, [grupoCombinado])
          produtosCombinados = produtosCombResult.rows.map(r => r.cod_produto)
        }

        // PRIORIDADE DE CÁLCULO:
        // 1. Vendas próprias (já calculado acima)
        // 2. Produtos combinados (se sem vendas próprias)
        // 3. Estoque mínimo (último recurso)
        
        // Se produto sem vendas, tentar usar vendas do grupo combinado
        if (produtoSemVendas && grupoCombinado && produtosCombinados.length > 1) {
          // Recalcular necessidades usando vendas do grupo combinado
          necessidadeProduto = 0 // Reset para recalcular
          
          for (const filial of analisePorFilial) {
            // Buscar vendas de TODOS os produtos do grupo combinado
            const vendasCombResult = await poolAuditoria.query(`
              SELECT COALESCE(SUM(quantidade), 0) as vendas
              FROM (
                SELECT DISTINCT ON (numero_documento, cod_produto, data_movimento::date)
                  quantidade
                FROM auditoria_integracao."Movimentacao_DRP"
                WHERE cod_produto = ANY($1)
                  AND cod_filial = $2
                  AND tipo_movimento = '55'
                  AND data_movimento >= CURRENT_DATE - INTERVAL '${periodo_dias} days'
                ORDER BY numero_documento, cod_produto, data_movimento::date, sequencia
              ) vendas_unicas
            `, [produtosCombinados, filial.cod_filial])
            
            const vendasComb = parseFloat(vendasCombResult.rows[0]?.vendas || '0')
            
            // Atualizar vendas da filial com vendas do grupo combinado
            filial.vendas_periodo = vendasComb
            filial.media_diaria = vendasComb / periodo_dias
            
            // Meta = vendas do grupo combinado
            filial.meta = vendasComb
            
            // IMPORTANTE: DRP por NF NÃO considera estoque combinado
            // Sempre calcula necessidade baseado apenas no estoque do produto principal
            filial.necessidade = Math.max(0, vendasComb - filial.estoque_atual)
            necessidadeProduto += filial.necessidade
          }
        }
        
        // PRIORIDADE 3: Estoque mínimo (último recurso)
        // Se ainda não tem necessidade (sem vendas E sem combinados), usar estoque mínimo
        if (necessidadeProduto === 0) {
          // Primeiro: verificar se alguma filial tem estoque mínimo configurado
          for (const filial of analisePorFilial) {
            if (filial.estoque_minimo > 0 && filial.meta === 0) {
              // Usar estoque mínimo como meta
              filial.meta = filial.estoque_minimo
              filial.usou_estoque_minimo = true
              filial.necessidade = Math.max(0, filial.estoque_minimo - filial.estoque_atual)
              necessidadeProduto += filial.necessidade
            }
          }
        }
        
        // SEMPRE distribuir 1 unidade para filiais com estoque 0 e sem necessidade
        // Isso garante que filiais zeradas recebam ao menos 1 unidade, independente de outras filiais terem vendas
        if (estoqueCD > 0) {
          const prioridadeFiliais = ['00', '01', '02', '05', '06']
          
          // Ordenar filiais por prioridade
          const filiaisOrdenadas = [...analisePorFilial].sort((a, b) => {
            const prioA = prioridadeFiliais.indexOf(a.cod_filial)
            const prioB = prioridadeFiliais.indexOf(b.cod_filial)
            return prioA - prioB
          })
          
          // Distribuir 1 unidade por filial com estoque 0 que ainda não tem necessidade
          for (const filial of filiaisOrdenadas) {
            if (necessidadeProduto < estoqueCD) {
              // Se filial tem estoque 0 E ainda não tem necessidade calculada
              if (filial.estoque_atual === 0 && filial.necessidade === 0) {
                filial.meta = 1
                filial.necessidade = 1
                filial.usou_estoque_minimo = true
                necessidadeProduto += 1
              }
            }
          }
        }

        // Calcular alocação sugerida
        // Prioridade de filiais quando não há estoque suficiente: Pet(00) > Jua(01) > Sal(02) > Bon(05) > Pic(06)
        const prioridadeFiliais = ['00', '01', '02', '05', '06']
        
        if (necessidadeProduto > 0 && estoqueCD > 0) {
          // Não distribuir mais do que a necessidade total: o que sobrar fica no CD
          const estoqueParaDistribuir = Math.min(estoqueCD, necessidadeProduto)
          let estoqueRestante = estoqueParaDistribuir
          
          if (estoqueParaDistribuir >= necessidadeProduto) {
            // Estoque suficiente: distribuir proporcional à necessidade com arredondamento inteligente
            const alocacoes: Array<{ filial: any; valorExato: number; fracao: number }> = []
            let totalAlocado = 0
            
            for (const filial of analisePorFilial) {
              if (filial.necessidade > 0) {
                const proporcao = filial.necessidade / necessidadeProduto
                const valorExato = estoqueParaDistribuir * proporcao
                
                // Aplicar arredondamento por múltiplo
                const valorArredondado = arredondarMultiplo(valorExato, multiploVenda)
                const valorBase = Math.floor(valorArredondado)
                const fracao = valorExato - valorBase
                
                filial.alocacao_sugerida = valorBase
                totalAlocado += valorBase
                
                alocacoes.push({ filial, valorExato, fracao })
              }
            }
            
            // Distribuir o restante (devido aos arredondamentos) para as filiais com maior fração
            let restante = Math.round(estoqueParaDistribuir) - totalAlocado
            
            if (restante > 0) {
              // Ordenar por fração decrescente (quem mais "perdeu" no arredondamento)
              // Em caso de empate na fração, usar prioridade de filial (já definida acima)
              alocacoes.sort((a, b) => {
                const diferencaFracao = b.fracao - a.fracao
                if (Math.abs(diferencaFracao) < 0.0001) {
                  // Empate: usar prioridade de filial
                  const prioA = prioridadeFiliais.indexOf(a.filial.cod_filial)
                  const prioB = prioridadeFiliais.indexOf(b.filial.cod_filial)
                  return prioA - prioB
                }
                return diferencaFracao
              })
              
              // Primeiro, tentar alocar para filiais que ainda não atingiram sua necessidade
              for (const alocacao of alocacoes) {
                if (restante > 0 && alocacao.filial.necessidade > alocacao.filial.alocacao_sugerida) {
                  alocacao.filial.alocacao_sugerida++
                  restante--
                }
              }
              
              // Se ainda sobrou estoque após atender todas as necessidades,
              // distribuir como estoque de segurança seguindo a prioridade de filiais
              if (restante > 0) {
                for (const alocacao of alocacoes) {
                  if (restante > 0 && alocacao.filial.necessidade > 0) {
                    alocacao.filial.alocacao_sugerida++
                    restante--
                  }
                }
              }
            }
          } else {
            // Estoque insuficiente: distribuir múltiplos por filial em ordem de prioridade
            // Ordenar filiais por prioridade
            const filiaisOrdenadas = [...analisePorFilial].sort((a, b) => {
              const prioA = prioridadeFiliais.indexOf(a.cod_filial)
              const prioB = prioridadeFiliais.indexOf(b.cod_filial)
              return prioA - prioB
            })
            
            // Distribuir múltiplos por vez para cada filial que tem necessidade, em ordem de prioridade
            // Continuar até acabar o estoque
            let continuarDistribuindo = true
            while (estoqueRestante > 0 && continuarDistribuindo) {
              continuarDistribuindo = false
              for (const filial of filiaisOrdenadas) {
                if (estoqueRestante <= 0) break
                // Só aloca se a filial ainda precisa (alocação < necessidade)
                if (filial.necessidade > 0 && filial.alocacao_sugerida < filial.necessidade) {
                  // Alocar pelo menos o múltiplo, se houver estoque suficiente
                  const quantidadeAlocar = Math.min(multiploVenda, estoqueRestante, filial.necessidade - filial.alocacao_sugerida)
                  filial.alocacao_sugerida += quantidadeAlocar
                  estoqueRestante -= quantidadeAlocar
                  continuarDistribuindo = true
                }
              }
            }
          }
        }

        // Calcular déficit
        const alocacaoTotal = analisePorFilial.reduce((sum, f) => sum + f.alocacao_sugerida, 0)
        const deficit = Math.max(0, necessidadeProduto - estoqueCD)

        necessidadeTotal += necessidadeProduto
        deficitTotal += deficit

        // Determinar tipo de cálculo usado
        let tipoCalculo = 'vendas'
        const usouEstoqueMin = analisePorFilial.some(f => f.usou_estoque_minimo)
        if (produtoSemVendas && !usouEstoqueMin) {
          tipoCalculo = 'combinado'
        } else if (usouEstoqueMin) {
          tipoCalculo = 'estoque_minimo'
        } else if (produtoSemVendas && necessidadeProduto === 0) {
          tipoCalculo = 'sem_historico'
        }

        // Se há déficit e produto pertence a grupo combinado, buscar alternativas no CD
        let combinadosDisponiveis: Array<{
          cod_produto: string
          descricao: string
          estoque_cd: number
        }> = []

        if (deficit > 0 && grupoCombinado && produtosCombinados.length > 1) {
          // Buscar outros produtos do grupo que tenham estoque no CD
          const outrosProdutos = produtosCombinados.filter(p => p !== codProduto)
          
          const combinadosResult = await poolAuditoria.query(`
            SELECT 
              e.cod_produto,
              p.descricao,
              COALESCE(e.estoque - COALESCE(e.quantidade_bloqueada, 0), 0) as estoque_disponivel
            FROM auditoria_integracao."Estoque_DRP" e
            JOIN auditoria_integracao.auditoria_produtos_drp p ON e.cod_produto = p.cod_produto
            WHERE e.cod_produto = ANY($1)
              AND e.cod_filial = '${CD_FILIAL}'
              AND e.estoque > COALESCE(e.quantidade_bloqueada, 0)
            ORDER BY e.estoque DESC
          `, [outrosProdutos])

          combinadosDisponiveis = combinadosResult.rows.map(r => ({
            cod_produto: r.cod_produto,
            descricao: r.descricao || 'Sem descrição',
            estoque_cd: parseFloat(r.estoque_disponivel || '0')
          }))
        }

        resultados.push({
          cod_produto: codProduto,
          descricao: produto.descricao || 'Sem descrição',
          referencia_fabricante: produto.referencia_fabricante || '-',
          grupo: produto.grupo_descricao,
          qtd_nf: qtdNF,
          estoque_cd: estoqueCD,
          tipo_calculo: tipoCalculo,
          necessidade_total: necessidadeProduto,
          deficit: deficit,
          status: deficit > 0 ? 'deficit' : necessidadeProduto > estoqueCD ? 'rateio' : 'ok',
          grupo_combinado: grupoCombinado,
          combinados_disponiveis: combinadosDisponiveis,
          filiais: analisePorFilial
        })
      }

      // Enviar notificação push após cálculo concluído
      enviarNotificacao({
        title: '✅ DRP Calculado',
        body: `NF ${numero_nota}: ${produtos.length} produto(s) processado(s)`,
        data: {
          tipo: 'drp_calculado',
          numero_nota: numero_nota,
          total_produtos: produtos.length.toString(),
          necessidade_total: necessidadeTotal.toFixed(0),
          deficit_total: deficitTotal.toFixed(0)
        },
        url: `/drp/nf/${numero_nota}`
      }).catch(err => {
        console.error('Erro ao enviar notificação:', err)
        // Não bloqueia a resposta se notificação falhar
      })

      return reply.send({
        success: true,
        data: {
          numero_nota,
          periodo_dias,
          total_produtos: produtos.length,
          necessidade_total: necessidadeTotal,
          deficit_total: deficitTotal,
          produtos: resultados
        }
      })
    } catch (error) {
      console.error('Erro ao calcular DRP da NF:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao calcular DRP da NF'
      })
    }
  })

  // POST /nf-entrada/cd/gerar-pedidos - Gerar pedidos para cada filial a partir do DRP calculado
  fastify.post('/nf-entrada/cd/gerar-pedidos', async (request, reply) => {
    try {
      const { numero_nota, produtos, usuario } = request.body as {
        numero_nota: string
        usuario?: string
        produtos: Array<{
          cod_produto: string
          descricao: string
          tipo_calculo: string
          filiais: Array<{
            cod_filial: string
            nome: string
            estoque_atual: number
            necessidade: number
            alocacao_sugerida: number
          }>
        }>
      }

      if (!numero_nota || !produtos || produtos.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Número da NF e produtos são obrigatórios'
        })
      }

      console.log(`📦 Gerando pedidos para NF ${numero_nota}...`)

      // Buscar fornecedor da NF
      const fornecedorNFResult = await poolAuditoria.query(`
        SELECT DISTINCT nf.cod_fornecedor, f.nome as nome_fornecedor
        FROM auditoria_integracao."NF_Entrada_DRP" nf
        LEFT JOIN auditoria_integracao."Fornecedor" f ON f.codfornec = nf.cod_fornecedor
        WHERE nf.numero_nota = $1 AND nf.cod_filial = '04'
        LIMIT 1
      `, [numero_nota])

      const codFornecedor = fornecedorNFResult.rows[0]?.cod_fornecedor || null
      const nomeFornecedor = fornecedorNFResult.rows[0]?.nome_fornecedor || 'Fornecedor não identificado'

      console.log(`📋 Fornecedor: ${codFornecedor} - ${nomeFornecedor}`)

      // Agrupar itens por filial
      const itensPorFilial: Record<string, Array<{
        cod_produto: string
        descricao: string
        quantidade: number
        tipo_calculo: string
        necessidade_original: number
        estoque_filial: number
      }>> = {}

      for (const produto of produtos) {
        for (const filial of produto.filiais) {
          if (filial.alocacao_sugerida > 0) {
            if (!itensPorFilial[filial.cod_filial]) {
              itensPorFilial[filial.cod_filial] = []
            }
            itensPorFilial[filial.cod_filial].push({
              cod_produto: produto.cod_produto,
              descricao: produto.descricao,
              quantidade: filial.alocacao_sugerida,
              tipo_calculo: produto.tipo_calculo,
              necessidade_original: filial.necessidade,
              estoque_filial: filial.estoque_atual
            })
          }
        }
      }

      const pedidosCriados: Array<{
        numero_pedido: string
        cod_filial: string
        nome_filial: string
        total_itens: number
        total_quantidade: number
      }> = []

      // Criar um pedido para cada filial que tem itens
      for (const [codFilial, itens] of Object.entries(itensPorFilial)) {
        if (itens.length === 0) continue

        const nomeFilial = FILIAIS_MAP[codFilial] || codFilial
        const totalItens = itens.length
        const totalQuantidade = itens.reduce((sum, item) => sum + item.quantidade, 0)

        // Gerar número do pedido
        const numeroPedidoResult = await poolAuditoria.query(
          `SELECT auditoria_integracao.gerar_numero_pedido_drp($1) as numero`,
          [codFilial]
        )
        const numeroPedido = numeroPedidoResult.rows[0].numero

        // Inserir pedido
        const pedidoResult = await poolAuditoria.query(`
          INSERT INTO auditoria_integracao."Pedido_DRP" (
            numero_pedido, numero_nf_origem, cod_filial_destino, nome_filial_destino,
            usuario, total_itens, total_quantidade, status, cod_fornecedor, nome_fornecedor
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendente', $8, $9)
          RETURNING id
        `, [numeroPedido, numero_nota, codFilial, nomeFilial, usuario || 'Sistema', totalItens, totalQuantidade, codFornecedor, nomeFornecedor])

        const pedidoId = pedidoResult.rows[0].id

        // Inserir itens do pedido
        for (const item of itens) {
          await poolAuditoria.query(`
            INSERT INTO auditoria_integracao."Pedido_DRP_Itens" (
              pedido_id, cod_produto, descricao_produto, quantidade,
              tipo_calculo, necessidade_original, estoque_filial
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [pedidoId, item.cod_produto, item.descricao, item.quantidade,
              item.tipo_calculo, item.necessidade_original, item.estoque_filial])
        }

        pedidosCriados.push({
          numero_pedido: numeroPedido,
          cod_filial: codFilial,
          nome_filial: nomeFilial,
          total_itens: totalItens,
          total_quantidade: totalQuantidade
        })

        console.log(`✅ Pedido ${numeroPedido} criado para ${nomeFilial}: ${totalItens} itens, ${totalQuantidade} unidades`)
      }

      return reply.send({
        success: true,
        message: `${pedidosCriados.length} pedido(s) gerado(s) com sucesso`,
        data: {
          numero_nf_origem: numero_nota,
          pedidos: pedidosCriados
        }
      })

    } catch (error) {
      console.error('Erro ao gerar pedidos:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao gerar pedidos'
      })
    }
  })

  // GET /nf-entrada/pedidos - Listar pedidos gerados
  fastify.get('/nf-entrada/pedidos', async (request, reply) => {
    try {
      const { status, filial, nf_origem } = request.query as {
        status?: string
        filial?: string
        nf_origem?: string
      }

      let where = 'WHERE 1=1'
      const params: any[] = []
      let paramIndex = 1

      if (status) {
        where += ` AND status = $${paramIndex++}`
        params.push(status)
      }
      if (filial) {
        where += ` AND cod_filial_destino = $${paramIndex++}`
        params.push(filial)
      }
      if (nf_origem) {
        where += ` AND numero_nf_origem = $${paramIndex++}`
        params.push(nf_origem)
      }

      const result = await poolAuditoria.query(`
        SELECT 
          id, numero_pedido, numero_nf_origem, cod_filial_destino, nome_filial_destino,
          data_pedido, status, usuario, total_itens, total_quantidade, observacao,
          cod_fornecedor, nome_fornecedor
        FROM auditoria_integracao."Pedido_DRP"
        ${where}
        ORDER BY data_pedido DESC
        LIMIT 100
      `, params)

      return reply.send({
        success: true,
        data: result.rows
      })

    } catch (error) {
      console.error('Erro ao listar pedidos:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao listar pedidos'
      })
    }
  })

  // GET /nf-entrada/pedidos/:id - Detalhes de um pedido
  fastify.get('/nf-entrada/pedidos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }

      // Buscar pedido
      const pedidoResult = await poolAuditoria.query(`
        SELECT * FROM auditoria_integracao."Pedido_DRP" WHERE id = $1
      `, [id])

      if (pedidoResult.rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Pedido não encontrado'
        })
      }

      // Buscar itens do pedido
      const itensResult = await poolAuditoria.query(`
        SELECT * FROM auditoria_integracao."Pedido_DRP_Itens" 
        WHERE pedido_id = $1
        ORDER BY cod_produto
      `, [id])

      return reply.send({
        success: true,
        data: {
          ...pedidoResult.rows[0],
          itens: itensResult.rows
        }
      })

    } catch (error) {
      console.error('Erro ao buscar pedido:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar pedido'
      })
    }
  })

  // POST /nf-entrada/cd/exportar-drp-xlsx - Exportar DRP em formato XLSX
  fastify.post('/nf-entrada/cd/exportar-drp-xlsx', async (request, reply) => {
    try {
      const { numero_nota, produtos, periodo_dias } = request.body as {
        numero_nota: string
        periodo_dias: number
        produtos: Array<{
          cod_produto: string
          descricao: string
          qtd_nf: number
          estoque_cd: number
          filiais: Array<{
            cod_filial: string
            nome: string
            estoque_atual: number
            vendas_periodo: number
            necessidade: number
            alocacao_sugerida: number
          }>
        }>
      }

      console.log(`📊 Gerando exportação XLSX para NF ${numero_nota}...`)

      // Buscar referência do fabricante para todos os produtos
      const referenciaResult = await poolAuditoria.query(`
        SELECT cod_produto, referencia_fabricante
        FROM auditoria_integracao.auditoria_produtos_drp
        WHERE cod_produto = ANY($1)
      `, [produtos.map(p => p.cod_produto)])

      const referenciaMap = new Map(
        referenciaResult.rows.map((r: any) => [r.cod_produto, r.referencia_fabricante || ''])
      )

      // Buscar quantidade bloqueada do CD (origem)
      const bloqueadoOrigemResult = await poolAuditoria.query(`
        SELECT cod_produto, COALESCE(SUM(quantidade_bloqueada), 0) as qtd_bloqueada
        FROM auditoria_integracao."Estoque_DRP"
        WHERE cod_filial = '04' 
          AND cod_produto = ANY($1)
        GROUP BY cod_produto
      `, [produtos.map(p => p.cod_produto)])

      const bloqueadoOrigemMap = new Map(
        bloqueadoOrigemResult.rows.map((r: any) => [r.cod_produto, parseFloat(r.qtd_bloqueada)])
      )

      // Preparar dados para o Excel
      const dadosExcel: any[] = []

      for (const produto of produtos) {
        // Buscar quantidade bloqueada e estoque mínimo por filial (destino)
        const estoqueDestinoResult = await poolAuditoria.query(`
          SELECT 
            cod_filial, 
            COALESCE(quantidade_bloqueada, 0) as qtd_bloqueada,
            COALESCE(estoque_minimo, 0) as estoque_minimo
          FROM auditoria_integracao."Estoque_DRP"
          WHERE cod_produto = $1 
            AND cod_filial IN ('00', '01', '02', '05', '06')
        `, [produto.cod_produto])

        const bloqueadoDestinoMap = new Map(
          estoqueDestinoResult.rows.map((r: any) => [r.cod_filial, parseFloat(r.qtd_bloqueada)])
        )
        
        const estoqueMinDestinoMap = new Map(
          estoqueDestinoResult.rows.map((r: any) => [r.cod_filial, parseFloat(r.estoque_minimo)])
        )

        // Calcular frequência de saída para cada filial usando função utilitária
        for (const filial of produto.filiais) {
          const resultadoFrequencia = await calcularFrequenciaSaida(
            produto.cod_produto,
            filial.cod_filial,
            periodo_dias
          )

          dadosExcel.push({
            'Produto': produto.cod_produto,
            'Referência': referenciaMap.get(produto.cod_produto) || '',
            'Descrição': produto.descricao,
            'Filial Destino': `${filial.cod_filial} - ${filial.nome}`,
            'Estoque Origem (CD)': produto.estoque_cd,
            'Bloqueado Origem': bloqueadoOrigemMap.get(produto.cod_produto) || 0,
            'Estoque Destino': filial.estoque_atual,
            'Bloqueado Destino': bloqueadoDestinoMap.get(filial.cod_filial) || 0,
            'Estoque Mínimo': estoqueMinDestinoMap.get(filial.cod_filial) || 0,
            [`Saída ${periodo_dias}d`]: filial.vendas_periodo,
            'Frequência Saída': resultadoFrequencia.frequencia,
            'Necessidade': filial.necessidade,
            'Sugestão': filial.alocacao_sugerida
          })
        }
      }

      // Criar workbook
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(dadosExcel)

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 12 }, // Produto
        { wch: 20 }, // Referência
        { wch: 40 }, // Descrição
        { wch: 20 }, // Filial Destino
        { wch: 18 }, // Estoque Origem
        { wch: 18 }, // Bloqueado Origem
        { wch: 18 }, // Estoque Destino
        { wch: 18 }, // Bloqueado Destino
        { wch: 16 }, // Estoque Mínimo
        { wch: 15 }, // Saída
        { wch: 18 }, // Frequência Saída
        { wch: 15 }, // Necessidade
        { wch: 12 }  // Sugestão
      ]
      ws['!cols'] = colWidths

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'DRP')

      // Gerar buffer do arquivo
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

      // Enviar arquivo
      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="DRP_NF_${numero_nota}_${new Date().toISOString().split('T')[0]}.xlsx"`)
        .send(buffer)

    } catch (error) {
      console.error('❌ Erro ao exportar XLSX:', error)
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao exportar XLSX'
      })
    }
  })
}
