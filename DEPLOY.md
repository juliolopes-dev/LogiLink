# 🚀 Deploy no Easypanel - LogiLink DRP System

Este guia explica como fazer deploy da aplicação completa (backend + frontend) no Easypanel usando Docker.

---

## 📋 Pré-requisitos

- Conta no Easypanel
- Repositório Git (GitHub, GitLab, etc.)
- Banco de dados PostgreSQL configurado

---

## 🏗️ Arquitetura do Deploy

O projeto usa um **Dockerfile único** que:
1. Builda o frontend (React/Vite) → gera arquivos estáticos
2. Builda o backend (Node.js/Fastify) → compila TypeScript
3. Backend serve os arquivos estáticos do frontend em produção

**Estrutura final:**
```
/app/
├── dist/           # Backend compilado
├── public/         # Frontend buildado (arquivos estáticos)
├── prisma/         # Schema do Prisma
└── node_modules/   # Dependências de produção
```

---

## 🔧 Configuração no Easypanel

### 1. Criar Novo Projeto

1. Acesse o Easypanel
2. Clique em **"Create Project"**
3. Nome: `logilink-drp`

### 2. Adicionar Serviço

1. Clique em **"Add Service"**
2. Escolha **"App"**
3. Configurações:

#### **General**
- **Name:** `logilink-app`
- **Source:** GitHub/GitLab
- **Repository:** `seu-usuario/LogiLink`
- **Branch:** `main` (ou sua branch principal)

#### **Build**
- **Build Method:** Dockerfile
- **Dockerfile Path:** `./Dockerfile`
- **Build Context:** `.` (raiz do projeto)

#### **Domains**
- Adicione seu domínio ou use o domínio fornecido pelo Easypanel
- Exemplo: `logilink-drp.easypanel.host`

#### **Environment Variables**
Configure as seguintes variáveis:

```bash
# Ambiente
NODE_ENV=production
PORT=3000

# Banco de Dados Principal (Prisma)
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public

# Banco de Dados de Auditoria
DB_AUDITORIA_HOST=seu-host-postgres
DB_AUDITORIA_PORT=5432
DB_AUDITORIA_USER=seu-usuario
DB_AUDITORIA_PASSWORD=sua-senha
DB_AUDITORIA_DATABASE=auditoria
DB_AUDITORIA_SCHEMA=auditoria_integracao

# Firebase (Notificações Push)
FIREBASE_PROJECT_ID=seu-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSua chave privada\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@seu-project.iam.gserviceaccount.com

# Timezone
TZ=America/Sao_Paulo
```

#### **Resources**
- **CPU:** 0.5 - 1 vCPU (ajuste conforme necessário)
- **Memory:** 512MB - 1GB (ajuste conforme necessário)

#### **Port**
- **Container Port:** `3000`
- **Protocol:** HTTP

---

## 🗄️ Configuração do Banco de Dados

### Opção 1: Usar PostgreSQL do Easypanel

1. No mesmo projeto, clique em **"Add Service"**
2. Escolha **"PostgreSQL"**
3. Configure:
   - **Name:** `logilink-db`
   - **Version:** 15 ou superior
   - **Database:** `logilink`
   - **User:** `logilink_user`
   - **Password:** (gere uma senha segura)

4. Anote a **connection string** gerada
5. Use essa connection string na variável `DATABASE_URL`

### Opção 2: Usar PostgreSQL Externo

Se você já tem um PostgreSQL na VPS:
- Use o IP/host da VPS nas variáveis de ambiente
- Certifique-se que o firewall permite conexões do Easypanel

---

## 🚀 Deploy

### 1. Fazer Deploy Inicial

1. Commit e push do código para o repositório
2. No Easypanel, clique em **"Deploy"**
3. Aguarde o build (pode levar 5-10 minutos)
4. Verifique os logs para confirmar que está rodando

### 2. Verificar Deploy

Acesse as seguintes URLs para testar:

```bash
# Health check da API
https://seu-dominio.com/api/health

# Frontend (página inicial)
https://seu-dominio.com/

# Teste de conexão com banco
https://seu-dominio.com/api/db-test
```

---

## 🔄 Atualizações

### Deploy Automático (Recomendado)

Configure **Auto Deploy** no Easypanel:
1. Vá em **Settings** do serviço
2. Ative **"Auto Deploy"**
3. Escolha a branch (ex: `main`)

Agora, todo push para a branch configurada fará deploy automático.

### Deploy Manual

1. Faça commit e push das alterações
2. No Easypanel, clique em **"Deploy"**
3. Aguarde o rebuild

---

## 📊 Monitoramento

### Logs

Acesse os logs em tempo real:
1. Vá no serviço `logilink-app`
2. Clique em **"Logs"**
3. Veja logs do build e runtime

### Métricas

Monitore:
- **CPU Usage**
- **Memory Usage**
- **Network Traffic**
- **Response Time**

---

## 🐛 Troubleshooting

### Build Falha

**Erro:** `npm ci failed`
- **Solução:** Verifique se `package-lock.json` está commitado

**Erro:** `Prisma generate failed`
- **Solução:** Verifique se `prisma/schema.prisma` existe

### Runtime Falha

**Erro:** `Cannot connect to database`
- **Solução:** Verifique as variáveis `DATABASE_URL` e `DB_AUDITORIA_*`

**Erro:** `Port 3000 already in use`
- **Solução:** Não deve acontecer no Docker, mas verifique a configuração de porta

### Frontend não carrega

**Erro:** 404 nas rotas do frontend
- **Solução:** Verifique se `NODE_ENV=production` está configurado
- **Solução:** Verifique logs para confirmar que `fastifyStatic` foi registrado

---

## 🔐 Segurança

### Variáveis Sensíveis

- ✅ Use o sistema de **Environment Variables** do Easypanel
- ❌ NUNCA commite arquivos `.env` com credenciais
- ✅ Use senhas fortes para banco de dados
- ✅ Configure HTTPS (Easypanel faz automaticamente)

### CORS

Em produção, ajuste o CORS no `backend/src/server.ts`:

```typescript
fastify.register(cors, {
  origin: ['https://seu-dominio.com'], // Seu domínio específico
  credentials: true
})
```

---

## 📝 Checklist de Deploy

- [ ] Código commitado e pushed para o repositório
- [ ] Variáveis de ambiente configuradas no Easypanel
- [ ] Banco de dados PostgreSQL configurado e acessível
- [ ] Dockerfile na raiz do projeto
- [ ] `.dockerignore` configurado
- [ ] Build bem-sucedido
- [ ] `/api/health` retorna sucesso
- [ ] `/api/db-test` conecta no banco
- [ ] Frontend carrega corretamente
- [ ] Autenticação funciona
- [ ] Notificações push configuradas (Firebase)

---

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os **logs** no Easypanel
2. Teste localmente com Docker: `docker build -t logilink .`
3. Verifique as **variáveis de ambiente**
4. Confirme que o banco está acessível

---

## 📚 Recursos Adicionais

- [Documentação Easypanel](https://easypanel.io/docs)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

---

*Última atualização: 04/Fevereiro/2026*
