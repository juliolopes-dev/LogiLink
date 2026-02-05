/**
 * Serviço para cálculo de DRP por Produto
 */

import { Pool } from 'pg'
import poolAuditoria from '../../lib/database-auditoria'
import {
  CalcularDRPProdutoRequest,
  ProdutoAnalise,
  FilialAnalise
} from '../../types/drp'
import {
  arredondarMultiplo,
  distribuirRestante,
  carregarCombinados,
  buscarDadosCombinados,
  FILIAIS_MAP,
  CD_FILIAL,
  FILIAL_GARANTIA,
  PRIORIDADE_FILIAIS,
  validarPeriodo,
  getFiliaisExceto,
  buscarMultiploVenda
} from '../../utils/drp'

export class DRPProdutoService {
  constructor(private pool: Pool = poolAuditoria) {}

  /**
   * Calcula DRP por Produto
   */
  async calcular(request: CalcularDRPProdutoRequest): Promise<ProdutoAnalise[]> {
    const { periodo_dias, filial_origem = CD_FILIAL, filtros } = request

    // Validar período
    const validacao = validarPeriodo(periodo_dias)
    if (!validacao.valido) {
      throw new Error(validacao.erro)
    }

    const origemFilial = filial_origem || CD_FILIAL

    // Filiais destino: todas exceto a origem e garantia
    const filiais = (filtros?.filiais || getFiliaisExceto(origemFilial)).filter(
      f => f !== FILIAL_GARANTIA
    )

    console.log(`🔍 Calculando DRP para ${periodo_dias} dias...`)

    // 1. Carregar todos os combinados em memória
    console.log('📦 Carregando combinados...')
    const mapas = await carregarCombinados(this.pool)
    console.log(`✅ ${mapas.grupoParaProdutos.size} grupos de combinados carregados`)

    // 2. Buscar produtos COM ESTOQUE NO CD
    let whereProduto = `
      WHERE p.ativo = 'S'
        AND e.estoque > 0
    `

    if (filtros?.grupo) {
      whereProduto += ` AND p.cod_grupo = '${filtros.grupo}'`
    }

    if (filtros?.busca) {
      whereProduto += ` AND (p.cod_produto ILIKE '%${filtros.busca}%' OR p.descricao ILIKE '%${filtros.busca}%')`
    }

    // Limite de produtos (pode ser configurado via filtros)
    const limite = filtros?.limite || 10000 // Padrão: 10000 produtos
    
    const produtosResult = await this.pool.query(`
      SELECT DISTINCT
        p.cod_produto,
        p.descricao,
        COALESCE(g.descricao, 'Sem Grupo') as grupo,
        e.estoque as estoque_cd
      FROM auditoria_integracao.auditoria_produtos_drp p
      LEFT JOIN auditoria_integracao."Grupo" g ON p.cod_grupo = g.codgrupo
      LEFT JOIN auditoria_integracao."Estoque_DRP" e ON p.cod_produto = e.cod_produto AND e.cod_filial = '${origemFilial}'
      ${whereProduto}
      ORDER BY p.descricao
      LIMIT ${limite}
    `)

    const produtos = produtosResult.rows
    console.log(`📊 ${produtos.length} produtos encontrados com estoque no CD`)

    const resultados: ProdutoAnalise[] = []

    // 3. Para cada produto, calcular necessidade por filial
    for (const produto of produtos) {
      const codProduto = produto.cod_produto
      const estoqueCD = parseFloat(produto.estoque_cd || '0')

      // Buscar múltiplo de venda
      const multiploVenda = await buscarMultiploVenda(codProduto, this.pool)

      const analisePorFilial: FilialAnalise[] = []
      let necessidadeTotal = 0

      // Analisar cada filial
      for (const codFilial of filiais) {
        const nomeFilial = FILIAIS_MAP[codFilial] || codFilial

        // Buscar vendas do produto na filial
        const vendasResult = await this.pool.query(`
          SELECT COALESCE(SUM(quantidade), 0) as vendas
          FROM (
            SELECT DISTINCT numero_documento, cod_produto, data_movimento::date, sequencia, quantidade
            FROM auditoria_integracao."Movimentacao_DRP"
            WHERE cod_produto = $1
              AND cod_filial = $2
              AND tipo_movimento = '55'
              AND data_movimento >= CURRENT_DATE - INTERVAL '${periodo_dias} days'
            ORDER BY numero_documento, cod_produto, data_movimento::date, sequencia
          ) vendas_unicas
        `, [codProduto, codFilial])

        let vendas = parseFloat(vendasResult.rows[0]?.vendas || '0')
        let usouCombinado = false
        let estoqueCombinado = 0

        // Se não tem vendas, buscar combinados
        if (vendas === 0) {
          const dadosCombinados = await buscarDadosCombinados(
            codProduto,
            codFilial,
            periodo_dias,
            mapas,
            this.pool
          )

          if (dadosCombinados.vendas > 0) {
            vendas = dadosCombinados.vendas
            usouCombinado = true
          }
          
          // Guardar estoque combinado para usar no cálculo
          estoqueCombinado = dadosCombinados.estoque
        } else {
          // Mesmo com vendas próprias, buscar estoque combinado
          const dadosCombinados = await buscarDadosCombinados(
            codProduto,
            codFilial,
            periodo_dias,
            mapas,
            this.pool
          )
          estoqueCombinado = dadosCombinados.estoque
        }

        // Buscar estoque atual e estoque mínimo na filial
        const estoqueResult = await this.pool.query(`
          SELECT 
            COALESCE(estoque, 0) as estoque,
            COALESCE(estoque_minimo, 0) as estoque_minimo
          FROM auditoria_integracao."Estoque_DRP"
          WHERE cod_produto = $1 AND cod_filial = $2
        `, [codProduto, codFilial])

        const estoqueAtual = parseFloat(estoqueResult.rows[0]?.estoque || '0')
        const estoqueMinimo = parseFloat(estoqueResult.rows[0]?.estoque_minimo || '0')
        
        // Estoque total = estoque do produto + estoque de combinados
        const estoqueTotal = estoqueAtual + estoqueCombinado

        // Calcular meta: MAIOR entre vendas (ou combinado) e estoque mínimo
        // Mesma lógica do DRP por NF
        let meta = vendas
        let usouEstoqueMinimo = false
        
        if (estoqueMinimo > vendas) {
          meta = estoqueMinimo
          usouEstoqueMinimo = true
        }

        // Verificar se tem combinado em estoque
        const temCombinadoEstoque = estoqueCombinado > 0

        // LÓGICA DE NECESSIDADE:
        // Se tem produtos combinados na filial: enviar apenas estoque mínimo do produto principal
        // Se NÃO tem combinados: enviar a meta completa
        let necessidade = 0
        
        if (temCombinadoEstoque) {
          // Tem combinados: garantir apenas estoque mínimo do produto principal
          necessidade = Math.max(0, estoqueMinimo - estoqueAtual)
        } else {
          // Não tem combinados: enviar meta completa
          necessidade = Math.max(0, meta - estoqueAtual)
        }
        
        necessidadeTotal += necessidade
        const necessidadeSemCombinado = Math.max(0, meta - estoqueAtual)

        // Buscar lista de produtos combinados com estoque na filial atual (para cálculo)
        let combinadosEmEstoque: Array<{
          cod_produto: string
          descricao: string
          referencia_fabricante: string
          estoque: number
        }> = []

        if (temCombinadoEstoque) {
          const grupoCombinado = mapas.produtoParaGrupo.get(codProduto)
          if (grupoCombinado) {
            const produtosCombinados = mapas.grupoParaProdutos.get(grupoCombinado) || []
            
            const combinadosResult = await this.pool.query(`
              SELECT 
                p.cod_produto,
                p.descricao,
                COALESCE(p.referencia_fabricante, '-') as referencia_fabricante,
                COALESCE(e.estoque, 0) as estoque
              FROM auditoria_integracao.auditoria_produtos_drp p
              INNER JOIN auditoria_integracao."Estoque_DRP" e 
                ON p.cod_produto = e.cod_produto 
                AND e.cod_filial = $1
              WHERE p.cod_produto = ANY($2)
                AND p.cod_produto != $3
                AND e.estoque > 0
              ORDER BY e.estoque DESC
            `, [codFilial, produtosCombinados, codProduto])

            combinadosEmEstoque = combinadosResult.rows.map((r: any) => ({
              cod_produto: r.cod_produto,
              descricao: r.descricao,
              referencia_fabricante: r.referencia_fabricante,
              estoque: parseFloat(r.estoque)
            }))
          }
        }

        analisePorFilial.push({
          cod_filial: codFilial,
          nome: nomeFilial,
          estoque_atual: estoqueAtual,
          estoque_minimo: estoqueMinimo,
          saida_periodo: vendas,
          meta,
          necessidade,
          alocacao_sugerida: 0,
          usou_combinado: usouCombinado,
          usou_estoque_minimo: usouEstoqueMinimo,
          tem_combinado_estoque: temCombinadoEstoque,
          estoque_combinado: estoqueCombinado,
          necessidade_reduzida_por_combinado: temCombinadoEstoque ? necessidadeSemCombinado - necessidade : 0,
          combinados_em_estoque: combinadosEmEstoque.length > 0 ? combinadosEmEstoque : undefined
        })
      }

      // 4. Calcular alocações
      if (necessidadeTotal > 0 && estoqueCD > 0) {
        const estoqueParaDistribuir = Math.min(estoqueCD, necessidadeTotal)
        let estoqueRestante = estoqueParaDistribuir

        if (estoqueParaDistribuir >= necessidadeTotal) {
          // Estoque suficiente: distribuir proporcional com arredondamento
          const alocacoes: Array<{
            filial: FilialAnalise
            valorExato: number
            fracao: number
          }> = []
          let totalAlocado = 0

          for (const filial of analisePorFilial) {
            if (filial.necessidade > 0) {
              const proporcao = filial.necessidade / necessidadeTotal
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

          // Distribuir o restante
          const restante = Math.round(estoqueParaDistribuir) - totalAlocado
          if (restante > 0) {
            distribuirRestante(alocacoes, restante, PRIORIDADE_FILIAIS)
          }
        } else {
          // Estoque insuficiente: rateio proporcional
          for (const filial of analisePorFilial) {
            if (filial.necessidade > 0) {
              const proporcao = filial.necessidade / necessidadeTotal
              const alocacao = estoqueParaDistribuir * proporcao
              filial.alocacao_sugerida = arredondarMultiplo(alocacao, multiploVenda)
            }
          }
        }
      }

      // 5. Determinar status
      const deficit = Math.max(0, necessidadeTotal - estoqueCD)
      let status: 'ok' | 'rateio' | 'deficit' = 'ok'
      let proporcaoAtendimento = 1.0

      if (estoqueCD === 0) {
        status = 'deficit'
        proporcaoAtendimento = 0
      } else if (estoqueCD < necessidadeTotal) {
        status = 'rateio'
        proporcaoAtendimento = estoqueCD / necessidadeTotal
      }

      // Buscar grupo combinado
      const grupoCombinado = mapas.produtoParaGrupo.get(codProduto) || null

      // Buscar todos produtos combinados do grupo com estoque em todas filiais
      let todosCombinados: Array<{
        cod_produto: string
        descricao: string
        referencia_fabricante: string
        estoque_petrolina: number
        estoque_juazeiro: number
        estoque_salgueiro: number
        estoque_bonfim: number
        estoque_picos: number
      }> = []

      if (grupoCombinado) {
        const produtosCombinados = mapas.grupoParaProdutos.get(grupoCombinado) || []
        
        const todosCombinadosResult = await this.pool.query(`
          SELECT 
            p.cod_produto,
            p.descricao,
            COALESCE(p.referencia_fabricante, '-') as referencia_fabricante,
            COALESCE(e_00.estoque, 0) as estoque_petrolina,
            COALESCE(e_01.estoque, 0) as estoque_juazeiro,
            COALESCE(e_02.estoque, 0) as estoque_salgueiro,
            COALESCE(e_05.estoque, 0) as estoque_bonfim,
            COALESCE(e_06.estoque, 0) as estoque_picos
          FROM auditoria_integracao.auditoria_produtos_drp p
          LEFT JOIN auditoria_integracao."Estoque_DRP" e_00 ON p.cod_produto = e_00.cod_produto AND e_00.cod_filial = '00'
          LEFT JOIN auditoria_integracao."Estoque_DRP" e_01 ON p.cod_produto = e_01.cod_produto AND e_01.cod_filial = '01'
          LEFT JOIN auditoria_integracao."Estoque_DRP" e_02 ON p.cod_produto = e_02.cod_produto AND e_02.cod_filial = '02'
          LEFT JOIN auditoria_integracao."Estoque_DRP" e_05 ON p.cod_produto = e_05.cod_produto AND e_05.cod_filial = '05'
          LEFT JOIN auditoria_integracao."Estoque_DRP" e_06 ON p.cod_produto = e_06.cod_produto AND e_06.cod_filial = '06'
          WHERE p.cod_produto = ANY($1)
            AND p.cod_produto != $2
          ORDER BY p.cod_produto
        `, [produtosCombinados, codProduto])

        todosCombinados = todosCombinadosResult.rows.map((r: any) => ({
          cod_produto: r.cod_produto,
          descricao: r.descricao,
          referencia_fabricante: r.referencia_fabricante,
          estoque_petrolina: parseFloat(r.estoque_petrolina),
          estoque_juazeiro: parseFloat(r.estoque_juazeiro),
          estoque_salgueiro: parseFloat(r.estoque_salgueiro),
          estoque_bonfim: parseFloat(r.estoque_bonfim),
          estoque_picos: parseFloat(r.estoque_picos)
        }))
      }

      // Se há déficit e produto pertence a grupo combinado, buscar combinados disponíveis no CD
      let combinadosDisponiveis: Array<{
        cod_produto: string
        descricao: string
        estoque_cd: number
      }> = []

      if (deficit > 0 && grupoCombinado) {
        const produtosCombinados = mapas.grupoParaProdutos.get(grupoCombinado) || []
        
        // Buscar produtos combinados que têm estoque no CD (exceto o produto atual)
        const combinadosResult = await this.pool.query(`
          SELECT 
            p.cod_produto,
            p.descricao,
            COALESCE(e.estoque, 0) as estoque_cd
          FROM auditoria_integracao.auditoria_produtos_drp p
          LEFT JOIN auditoria_integracao."Estoque_DRP" e 
            ON p.cod_produto = e.cod_produto 
            AND e.cod_filial = $1
          WHERE p.cod_produto = ANY($2)
            AND p.cod_produto != $3
            AND p.ativo = 'S'
            AND COALESCE(e.estoque, 0) > 0
          ORDER BY e.estoque DESC
        `, [origemFilial, produtosCombinados, codProduto])

        combinadosDisponiveis = combinadosResult.rows.map((r: any) => ({
          cod_produto: r.cod_produto,
          descricao: r.descricao,
          estoque_cd: parseFloat(r.estoque_cd)
        }))
      }

      resultados.push({
        cod_produto: codProduto,
        descricao: produto.descricao,
        grupo: produto.grupo,
        cod_grupo_combinado: grupoCombinado,
        estoque_cd: estoqueCD,
        necessidade_total: necessidadeTotal,
        deficit,
        status,
        proporcao_atendimento: proporcaoAtendimento,
        combinados_disponiveis: combinadosDisponiveis.length > 0 ? combinadosDisponiveis : undefined,
        todos_combinados: todosCombinados.length > 0 ? todosCombinados : undefined,
        filiais: analisePorFilial
      })
    }

    console.log(`✅ DRP calculado para ${resultados.length} produtos`)
    return resultados
  }
}
