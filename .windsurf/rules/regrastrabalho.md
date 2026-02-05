---
trigger: always_on
---

# Regras de Trabalho

### 1. Transparência Total e Confirmação

- **SEMPRE PERGUNTE ANTES DE IMPLEMENTAR** quando eu fizer uma pergunta como "é possível...", "dá para...", "tem como...".
- Se eu perguntar SE algo é possível, responda APENAS se é possível e COMO faria, mas **NÃO IMPLEMENTE** sem eu pedir explicitamente.
- Somente implemente diretamente quando eu der um comando claro como "faça...", "implemente...", "corrija...".
- **ANTES** de executar qualquer ação (comando, edição de arquivo ou consulta), você deve explicar em Português o que pretende fazer e o objetivo.
- Sempre que eu solicitar uma **alteração**, você deve primeiro confirmar explicitamente que entendeu o que foi pedido e descrever brevemente sua abordagem e me dizer quais são os riscos dessa mudança.
- Somente após essa confirmação e explicação você deve prosseguir.

### 2. Comunicação

- Responda sempre em Português do Brasil.
- Seja proativo, mas sempre transparente sobre cada passo técnico.
- Sempre use nomes das tabelas e colunas do banco de dados em Português.
- Sempre use timezone America/Sao_Paulo Brasil é UTC-3 em toda aplicação, incluindo banco de dados.

### 3. MCP (Model Context Protocol)

- Use MCP para consultar bancos de dados, Pergunte qual nome do MCP quando precisar usar.
- Sempre prefira MCP ao invés de comandos manuais quando disponível

### 4. Alterações

- Sempre que precisar alterar algo, não mexa no que já está funcionando. Apenas altere o que está errado.

### 5. NUNCA FAÇA

- ❌ Reescrever código funcional sem motivo claro
- ❌ Introduzir novas tecnologias sem discussão
- ❌ Assumir estruturas de banco de dados ou APIs
- ❌ Deletar arquivos ou código sem confirmar
- ❌ Ignorar erros ou warnings existentes
- ❌ Criar soluções excessivamente complexas (overengineering)
- ❌ Repetir trechos de código (use funções/componentes reutilizáveis)
- ❌ Colocar toda lógica em um único arquivo (separe responsabilidades)
- ❌ Reinventar funcionalidades que já existem em bibliotecas consolidadas

### 6. Migrações de Banco de Dados

- Para alterações de schema ou dados em produção, NUNCA use `prisma migrate` ou `prisma db push` 
- Crie scripts Node.js/TypeScript em `backend/scripts/` usando Prisma Client
- Use `$executeRawUnsafe` para DDL (ALTER, CREATE, DROP)
- Use `$executeRaw` para DML (UPDATE, INSERT, DELETE) com type-safety
- Use `$queryRaw` para consultas (SELECT)
- Execute via `npx tsx scripts/nome-do-script.ts` 
- Sempre adicione logs detalhados e verificação de resultados
- Sempre desconecte o Prisma ao final: `await prisma.$disconnect()` 

### 7. Padrão de Desenvolvimento e Deploy

- **Banco de dados**: Sempre fica na VPS (nunca local)
- **Desenvolvimento**: Local, conectando no banco da VPS
- **Deploy**: Dockerfile único que builda backend + frontend juntos
- **Estrutura do Dockerfile**: Backend serve o frontend buildado (arquivos estáticos)
- **Fluxo**: Dev local → Commit → Build Docker → Deploy na VPS

### 8. Testes

- Rodar testes antes de fazer commit em features importantes
- Testar manualmente as funcionalidades alteradas antes de deploy
- Em caso de bug em produção, primeiro reproduzir localmente antes de corrigir

### 9. Git e Commits

- Commits em português, descritivos e objetivos
- Formato sugerido: `tipo: descrição` (ex: `fix: corrige cálculo de estoque`, `feat: adiciona filtro por data`)
- Tipos: `feat` (nova feature), `fix` (correção), `refactor` (refatoração), `docs` (documentação), `style` (formatação)

### 10. Tratamento de Erros

- Backend: sempre retornar erros com estrutura padrão `{ success: false, error: "mensagem" }` 
- Logar erros importantes no console com contexto suficiente para debug
- Nunca expor stack traces ou informações sensíveis para o frontend em produção

### 11. Documentação de Projeto CONTEXTO.MD

- **SEMPRE** atualizar CONTEXTO.MD após cada tarefa significativa concluída
- **OBRIGATÓRIO** atualizar antes de encerrar a sessão de trabalho
- Incluir no arquivo: o que foi feito, o que foi testado, próximos passos claros
- Se o usuário pedir para lembrar de atualizar, faça imediatamente


