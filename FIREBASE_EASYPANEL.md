# 🔔 Configuração Firebase no Easypanel

## 📋 Visão Geral

O Firebase é usado para **notificações push** no sistema. Esta configuração é **opcional** - o sistema funciona normalmente sem ela, mas as notificações push ficam desabilitadas.

---

## 🔑 Obter Credenciais do Firebase

### 1. Acesse o Console do Firebase
- URL: https://console.firebase.google.com/
- Selecione seu projeto: **logilink-9a32d**

### 2. Gerar Chave Privada
1. Vá em **Project Settings** (⚙️ no canto superior esquerdo)
2. Aba **Service Accounts**
3. Clique em **"Generate new private key"**
4. Salve o arquivo JSON baixado

### 3. Extrair Informações do JSON

O arquivo JSON terá este formato:

```json
{
  "type": "service_account",
  "project_id": "logilink-9a32d",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@logilink-9a32d.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  ...
}
```

**Você precisa de 3 valores:**
- `project_id`
- `private_key`
- `client_email`

---

## ⚙️ Configurar no Easypanel

### Passo 1: Acessar Environment Variables

1. No Easypanel, vá no seu serviço `logilink-app`
2. Clique na aba **"Environment"**
3. Role até **"Environment Variables"**

### Passo 2: Adicionar Variáveis

**⚠️ IMPORTANTE:** Configure como **Environment Variables** (não Build Arguments)

Adicione as 3 variáveis:

#### 1. FIREBASE_PROJECT_ID
```
Key: FIREBASE_PROJECT_ID
Value: logilink-9a32d
```

#### 2. FIREBASE_CLIENT_EMAIL
```
Key: FIREBASE_CLIENT_EMAIL
Value: firebase-adminsdk-fbsvc@logilink-9a32d.iam.gserviceaccount.com
```

#### 3. FIREBASE_PRIVATE_KEY

**⚠️ ATENÇÃO:** Esta é a mais importante e precisa de cuidado especial!

```
Key: FIREBASE_PRIVATE_KEY
Value: -----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(cole toda a chave aqui, incluindo as quebras de linha)
...
-----END PRIVATE KEY-----
```

**Formato correto:**
- ✅ Incluir `-----BEGIN PRIVATE KEY-----` no início
- ✅ Incluir `-----END PRIVATE KEY-----` no final
- ✅ Manter as quebras de linha (Enter) entre as linhas
- ✅ Não adicionar aspas extras
- ❌ NÃO usar `\n` - use quebras de linha reais (Enter)

**Exemplo visual:**
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDgoJIn8TD3IA+j
bWqxRdXlJU8Dg2+mcwNHEk7oUxbO9ejl/9NSSuDnmcrHe6mQGIjdhayBiZeiJaZH
zPr1g/SD7nlHYYGSiWGt7p83GssWNBFMGx6spj5sJrCx/GMUvoOAKj91/gEm0Zvs
...
(mais linhas)
...
-----END PRIVATE KEY-----
```

### Passo 3: Salvar e Fazer Redeploy

1. Clique em **"Save"**
2. Clique em **"Deploy"** para aplicar as mudanças

---

## ✅ Verificar se Funcionou

### 1. Verificar Logs do Container

Após o deploy, verifique os logs do container:

**Se Firebase configurado corretamente:**
```
✅ Firebase Admin inicializado com sucesso
```

**Se Firebase com erro:**
```
⚠️ Firebase: Chave privada com formato inválido - notificações push desabilitadas
```

**Se Firebase não configurado:**
```
⚠️ Firebase não configurado - notificações push desabilitadas
```

### 2. Testar Endpoint

Teste o endpoint de notificações:

```bash
curl -X POST https://seu-dominio.com/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Teste",
    "body": "Notificação de teste"
  }'
```

**Resposta esperada se funcionando:**
```json
{
  "success": false,
  "error": "Nenhum dispositivo registrado"
}
```

**Resposta se Firebase não configurado:**
```json
{
  "success": false,
  "error": "Notificações push não disponíveis - Firebase não configurado"
}
```

---

## 🐛 Troubleshooting

### Erro: "Failed to parse private key"

**Causa:** Chave privada com formato incorreto

**Solução:**
1. Verifique se copiou a chave completa (incluindo BEGIN e END)
2. Certifique-se de que usou quebras de linha reais (Enter), não `\n`
3. Não adicione aspas extras ao redor da chave
4. Copie direto do arquivo JSON baixado do Firebase

### Erro: "Invalid credential"

**Causa:** Credenciais incorretas ou expiradas

**Solução:**
1. Gere uma nova chave privada no Firebase Console
2. Verifique se o `project_id` está correto
3. Verifique se o `client_email` está correto

### Sistema funciona mas notificações não

**Causa:** Firebase configurado mas sem dispositivos registrados

**Solução:**
1. Registre um token FCM usando o endpoint `/api/notifications/register`
2. Verifique se o frontend está configurado para obter o token FCM

---

## 📱 Configurar Frontend para Notificações

### 1. Arquivo de Configuração

O frontend já está configurado em:
- `frontend/src/lib/firebase.ts`
- `frontend/public/firebase-messaging-sw.js`

### 2. Configuração Firebase Web

Você precisa adicionar as credenciais web do Firebase no frontend:

**Arquivo:** `frontend/src/lib/firebase.ts`

```typescript
const firebaseConfig = {
  apiKey: "sua-api-key",
  authDomain: "logilink-9a32d.firebaseapp.com",
  projectId: "logilink-9a32d",
  storageBucket: "logilink-9a32d.appspot.com",
  messagingSenderId: "seu-sender-id",
  appId: "seu-app-id"
}
```

**Onde encontrar:**
1. Firebase Console → Project Settings
2. Aba **General**
3. Seção **"Your apps"**
4. Selecione o app web ou crie um novo

---

## 🔗 Documentação Relacionada

- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Easypanel Environment Variables](https://easypanel.io/docs/environment-variables)

---

## 📝 Resumo

**Variáveis necessárias:**
1. `FIREBASE_PROJECT_ID` - ID do projeto
2. `FIREBASE_CLIENT_EMAIL` - Email da service account
3. `FIREBASE_PRIVATE_KEY` - Chave privada (com quebras de linha reais)

**Onde configurar:**
- Easypanel → Service → Environment → Environment Variables (não Build Arguments)

**Como testar:**
- Verificar logs do container após deploy
- Testar endpoint `/api/notifications/send`

**Se não funcionar:**
- Sistema continua funcionando normalmente
- Apenas notificações push ficam desabilitadas
