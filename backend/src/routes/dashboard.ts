import { FastifyInstance } from 'fastify'
import poolAuditoria from '../lib/database-auditoria.js'

export async function dashboardRoutes(fastify: FastifyInstance) {
  
  // GET /api/dashboard/compras-vendas - Dados de compras e vendas dos últimos 6 meses
  fastify.get('/dashboard/compras-vendas', async (request, reply) => {
    try {
      const query = `
        WITH meses AS (
          SELECT 
            TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + (n || ' months')::INTERVAL), 'YYYY-MM') as mes,
            CASE 
              WHEN EXTRACT(MONTH FROM DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + (n || ' months')::INTERVAL)) = 1 THEN 'Jan'
              WHEN EXTRACT(MONTH FROM DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + (n || ' months')::INTERVAL)) = 2 THEN 'Fev'
              WHEN EXTRACT(MONTH FROM DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + (n || ' months')::INTERVAL)) = 3 THEN 'Mar'
              WHEN EXTRACT(MONTH FROM DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + (n || ' months')::INTERVAL)) = 4 THEN 'Abr'
              WHEN EXTRACT(MONTH FROM DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + (n || ' months')::INTERVAL)) = 5 THEN 'Mai'
              WHEN EXTRACT(MONTH FROM DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + (n || ' months')::INTERVAL)) = 6 THEN 'Jun'
              WHEN EXTRACT(MONTH FROM DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + (n || ' months')::INTERVAL)) = 7 THEN 'Jul'
              WHEN EXTRACT(MONTH FROM DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + (n || ' months')::INTERVAL)) = 8 THEN 'Ago'
              WHEN EXTRACT(MONTH FROM DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + (n || ' months')::INTERVAL)) = 9 THEN 'Set'
              WHEN EXTRACT(MONTH FROM DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + (n || ' months')::INTERVAL)) = 10 THEN 'Out'
              WHEN EXTRACT(MONTH FROM DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + (n || ' months')::INTERVAL)) = 11 THEN 'Nov'
              WHEN EXTRACT(MONTH FROM DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + (n || ' months')::INTERVAL)) = 12 THEN 'Dez'
            END || '/' || TO_CHAR(DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months' + (n || ' months')::INTERVAL), 'YY') as mes_label
          FROM generate_series(0, 5) n
        ),
        vendas_mes AS (
          SELECT 
            TO_CHAR(DATE_TRUNC('month', data_movimento), 'YYYY-MM') as mes,
            SUM(quantidade) as total_vendas,
            SUM(quantidade * valor_venda) as valor_vendas
          FROM auditoria_integracao."Movimentacao_DRP"
          WHERE 
            tipo_movimento = '55'
            AND data_movimento >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
            AND data_movimento < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
          GROUP BY TO_CHAR(DATE_TRUNC('month', data_movimento), 'YYYY-MM')
        ),
        compras_mes AS (
          SELECT 
            TO_CHAR(DATE_TRUNC('month', data_entrada), 'YYYY-MM') as mes,
            SUM(quantidade) as total_compras,
            SUM(quantidade * preco_custo) as valor_compras
          FROM auditoria_integracao.auditoria_nf_entrada_juazeiro
          WHERE 
            data_entrada >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months')
            AND data_entrada < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
          GROUP BY TO_CHAR(DATE_TRUNC('month', data_entrada), 'YYYY-MM')
        )
        SELECT 
          m.mes,
          m.mes_label,
          COALESCE(v.valor_vendas, 0) as total_vendas,
          COALESCE(c.valor_compras, 0) as total_compras
        FROM meses m
        LEFT JOIN vendas_mes v ON m.mes = v.mes
        LEFT JOIN compras_mes c ON m.mes = c.mes
        ORDER BY m.mes
      `

      const result = await poolAuditoria.query(query)

      return reply.send({
        success: true,
        data: result.rows
      })
    } catch (error) {
      console.error('Erro ao buscar dados de compras/vendas:', error)
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar dados de compras/vendas'
      })
    }
  })
}
