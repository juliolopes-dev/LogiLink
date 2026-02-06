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
  pedidos: PedidoWebhook[]
}

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

/**
 * Envia webhook com dados do pedido DRP gerado
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
  try {
    const payload: DadosWebhookPedido = {
      tipo: 'pedido_drp',
      origem: dados.origem,
      numero_nf_origem: dados.numero_nf_origem,
      filial_origem: dados.filial_origem,
      nome_filial_origem: dados.nome_filial_origem,
      fornecedor: dados.fornecedor || null,
      usuario: dados.usuario,
      data: getDataBrasil(),
      pedidos: dados.pedidos
    }

    console.log(`📡 Enviando webhook pedido DRP (${dados.origem})...`)

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      console.log(`✅ Webhook pedido enviado com sucesso`)
    } else {
      console.error(`⚠️ Webhook pedido retornou status ${response.status}`)
    }
  } catch (error) {
    console.error('⚠️ Erro ao enviar webhook pedido (não bloqueante):', error)
  }
}
