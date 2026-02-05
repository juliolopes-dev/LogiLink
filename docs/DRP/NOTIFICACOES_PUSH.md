# Notificações Push - Firebase Cloud Messaging

## 📱 Como Funciona

O sistema usa Firebase Cloud Messaging (FCM) para enviar notificações push que aparecem no Windows/Mac/Linux, mesmo com o navegador minimizado.

## 🔧 Configuração (Produção)

### 1. Gerar Nova Chave Privada no Firebase

⚠️ **IMPORTANTE:** A chave atual está exposta e deve ser trocada.

1. Acesse [Firebase Console](https://console.firebase.google.com/project/logilink-9a32d/settings/serviceaccounts/adminsdk)
2. Clique em **Contas de serviço**
3. **Delete a chave atual** (exposta)
4. Clique em **Gerar nova chave privada**
5. Baixe o arquivo JSON

### 2. Configurar Variáveis de Ambiente

Edite o arquivo `backend/.env` e adicione:

```env
# Firebase Cloud Messaging
FIREBASE_PROJECT_ID="logilink-9a32d"
FIREBASE_PRIVATE_KEY_ID="cole-aqui-o-private_key_id-do-json"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nCOLE_AQUI_A_PRIVATE_KEY_DO_JSON\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-fbsvc@logilink-9a32d.iam.gserviceaccount.com"
FIREBASE_CLIENT_ID="cole-aqui-o-client_id-do-json"
```

**Dica:** Para a `FIREBASE_PRIVATE_KEY`, copie o valor do campo `private_key` do JSON baixado, incluindo as quebras de linha como `\n`.

### 3. Reiniciar o Backend

```bash
cd backend
npm run dev
```

## 🧪 Como Testar

### 1. Ativar Notificações no Navegador

1. Acesse `http://localhost:5173`
2. Clique no ícone de **sino** 🔔 no header
3. Permita as notificações quando o navegador perguntar
4. O sino deve ficar **verde** ✅

### 2. Enviar Notificação de Teste

No terminal:

```bash
curl.exe -X POST http://localhost:3333/api/notifications/test
```

Ou no PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost:3333/api/notifications/test" -Method POST
```

Você deve receber uma notificação no PC.

## 📡 API de Notificações

### Registrar Dispositivo

```typescript
POST /api/notifications/register
Content-Type: application/json

{
  "token": "fcm-token-do-dispositivo"
}
```

### Enviar para Todos os Dispositivos

```typescript
POST /api/notifications/send
Content-Type: application/json

{
  "title": "Título da Notificação",
  "body": "Mensagem da notificação",
  "url": "/produtos", // Opcional: página para abrir ao clicar
  "data": { // Opcional: dados customizados
    "type": "estoque_zerado",
    "cod_produto": "052680"
  }
}
```

### Enviar para Dispositivo Específico

```typescript
POST /api/notifications/send-to-token
Content-Type: application/json

{
  "token": "fcm-token-do-dispositivo",
  "title": "Título",
  "body": "Mensagem",
  "url": "/produtos"
}
```

### Listar Tokens Registrados

```typescript
GET /api/notifications/tokens
```

## 💡 Exemplos de Uso

### Notificar Estoque Zerado

```typescript
await fetch('http://localhost:3333/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '⚠️ Estoque Zerado',
    body: 'Produto 052680 (Velas NGK) zerou em Petrolina',
    url: '/produtos',
    data: {
      type: 'estoque_zerado',
      cod_produto: '052680',
      filial: '00'
    }
  })
})
```

### Notificar NF Recebida

```typescript
await fetch('http://localhost:3333/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '📦 NF Recebida',
    body: 'NF 123456 chegou no CD - 150 itens',
    url: '/nf-entrada',
    data: {
      type: 'nf_recebida',
      numero_nf: '123456'
    }
  })
})
```

### Notificar Ruptura Iminente

```typescript
await fetch('http://localhost:3333/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: '🚨 Alerta de Ruptura',
    body: '5 produtos em risco de ruptura em Juazeiro',
    url: '/drp',
    data: {
      type: 'ruptura_iminente',
      filial: '01',
      quantidade: 5
    }
  })
})
```

## 🔒 Segurança

- **Nunca commite** o arquivo `.env` no Git
- **Troque a chave privada** periodicamente
- Use variáveis de ambiente em produção
- Mantenha o `firebase-messaging-sw.js` público (necessário para Service Worker)

## 🐛 Troubleshooting

### Notificações não aparecem

1. Verifique se o navegador permitiu notificações (cadeado na barra de endereço)
2. Verifique se o Service Worker está registrado (DevTools → Application → Service Workers)
3. Limpe o cache e recarregue a página (Ctrl+Shift+R)
4. Verifique o console do navegador para erros

### "Nenhum dispositivo registrado"

1. Clique no sino e permita notificações
2. Verifique no Network (DevTools) se `/api/notifications/register` retornou 200
3. Verifique se o backend está rodando na porta 3333

### Service Worker não registra

1. Verifique se o `appId` está correto em `firebase-messaging-sw.js`
2. Limpe os Service Workers antigos (DevTools → Application → Service Workers → Unregister)
3. Recarregue a página

## 📚 Referências

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Web Push Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
