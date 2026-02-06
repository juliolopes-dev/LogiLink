/**
 * Webhook para notificação de pedidos DRP gerados
 * Envia dados do pedido para o n8n via POST
 */

const WEBHOOK_URL = 'https://n8n-n8n.tbs25p.easypanel.host/webhook/197fdaf9-a28c-4e34-ba63-1fd37a79523b'

interface PedidoWebhook {
  numero_pedido: string
  cod_filial: string
  nome_filial: string
  total_itens: number
  total_quantidade: number
}

interface DadosWebhookPedido {
  tipo: 'pedido_drp'
  origem: 'DRP-NF' | 'DRP-PROD'
  numero_nf_origem: string
  filial_origem: string
  nome_filial_origem: string
  fornecedor?: string | null
  usuario: string
  data: string
  pedido: PedidoWebhook
  pedido_index: number
  total_pedidos: number
}

const DELAY_ENTRE_WEBHOOKS = 2000 // 2 segundos entre cada disparo

/**
 * Retorna data/hora atual no fuso horário de Brasília (UTC-3)
 */
function getDataBrasil(): string {
  return new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Envia 1 webhook por pedido com delay de 500ms entre cada disparo
 * Não bloqueia nem lança erro se falhar (fire and forget)
 */
export async function enviarWebhookPedido(dados: {
  origem: 'DRP-NF' | 'DRP-PROD'
  numero_nf_origem: string
  filial_origem: string
  nome_filial_origem: string
  fornecedor?: string | null
  usuario: string
  pedidos: PedidoWebhook[]
}): Promise<void> {
  const dataBrasil = getDataBrasil()
  const totalPedidos = dados.pedidos.length

  console.log(`📡 Enviando ${totalPedidos} webhook(s) pedido DRP (${dados.origem})...`)

  for (let i = 0; i < totalPedidos; i++) {
    try {
      const payload: DadosWebhookPedido = {
        tipo: 'pedido_drp',
        origem: dados.origem,
        numero_nf_origem: dados.numero_nf_origem,
        filial_origem: dados.filial_origem,
        nome_filial_origem: dados.nome_filial_origem,
        fornecedor: dados.fornecedor || null,
        usuario: dados.usuario,
        data: dataBrasil,
        pedido: dados.pedidos[i],
        pedido_index: i + 1,
        total_pedidos: totalPedidos
      }

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        console.log(`✅ Webhook ${i + 1}/${totalPedidos} enviado: ${dados.pedidos[i].numero_pedido}`)
      } else {
        console.error(`⚠️ Webhook ${i + 1}/${totalPedidos} retornou status ${response.status}`)
      }

      // Delay entre disparos (exceto no último)
      if (i < totalPedidos - 1) {
        await delay(DELAY_ENTRE_WEBHOOKS)
      }
    } catch (error) {
      console.error(`⚠️ Erro webhook ${i + 1}/${totalPedidos} (não bloqueante):`, error)
    }
  }

  console.log(`📡 ${totalPedidos} webhook(s) finalizados`)
}
