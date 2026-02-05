# ⚠️ URGENTE: Atualizar arquivo .env

## 🔴 Problema Identificado

O arquivo `.env` está apontando para o **banco ANTIGO**:
```
DATABASE_URL="postgres://postgres:12be35dd1e93eead5a07@147.93.144.135:1254/dados-bezerra"
```

Por isso a VIEW `Movimentacao_DRP` não existe - ela está no banco novo!

---

## ✅ Solução

Edite manualmente o arquivo `backend/.env` e altere:

### DE:
```env
DATABASE_URL="postgres://postgres:12be35dd1e93eead5a07@147.93.144.135:1254/dados-bezerra?sslmode=disable"
```

### PARA:
```env
DATABASE_URL="postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable"
```

---

## 📝 Arquivo .env Completo Correto

```env
# Banco de Dados Principal (Pool pg - DRP)
DATABASE_URL="postgres://postgres:d2c0655c520bab6ccea5@95.111.255.122:4214/banco-dados-bezerra?sslmode=disable"

# Servidor
PORT=3333
HOST=0.0.0.0

# Timezone
TZ=America/Sao_Paulo
```

---

## 🚀 Após Atualizar

1. Salve o arquivo `.env`
2. Reinicie o servidor backend (Ctrl+C e `npm run dev`)
3. Teste novamente a API

---

**O erro vai sumir imediatamente após a correção!** ✅
