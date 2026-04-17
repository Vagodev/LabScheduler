# LabScheduler — Projeto Local

Este é o **Projeto Local** do sistema LabScheduler, adaptado para rodar inteiramente em `localhost` sem dependência de nenhum serviço externo da plataforma Manus.

A autenticação foi substituída do **Manus OAuth** para **E-mail e Senha** com JWT, tornando o sistema completamente autossuficiente.

---

## Pré-requisitos

| Ferramenta | Versão mínima | Instalação |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| pnpm | 8+ | `npm install -g pnpm` |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/ |

> **Alternativa ao MySQL:** É possível usar [TiDB Serverless](https://tidbcloud.com) (gratuito) ou [PlanetScale](https://planetscale.com) como banco de dados em nuvem, mantendo o projeto rodando localmente.

---

## Configuração Inicial

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo de exemplo e edite com suas credenciais:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
# Banco de dados MySQL local
DATABASE_URL=mysql://root:suasenha@localhost:3306/labscheduler

# Chave secreta para tokens JWT (mínimo 32 caracteres — troque em produção!)
JWT_SECRET=mude-esta-chave-secreta-para-producao-min-32-chars

# Ambiente
NODE_ENV=development
PORT=3000
```

### 3. Criar o banco de dados

No MySQL, crie o banco de dados:

```sql
CREATE DATABASE labscheduler CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Aplicar o schema do banco

```bash
pnpm db:push
```

Este comando gera e aplica as migrações automaticamente.

### 5. Criar o primeiro usuário administrador

Execute o seguinte SQL no MySQL para criar o primeiro admin (substitua os valores):

```sql
-- Gerar hash bcrypt para a senha "admin123" (12 rounds)
-- Use o script abaixo ou gere via: node -e "require('bcryptjs').hash('admin123', 12).then(console.log)"

INSERT INTO users (name, email, passwordHash, mustChangePassword, role, isActive)
VALUES (
  'Administrador',
  'admin@seudominio.com',
  '$2a$12$HASH_GERADO_AQUI',
  1,
  'admin',
  1
);
```

**Para gerar o hash da senha via Node.js:**

```bash
node -e "require('bcryptjs').hash('admin123', 12).then(h => console.log(h))"
```

Copie o hash gerado e substitua `$2a$12$HASH_GERADO_AQUI` no SQL acima.

---

## Executar o Projeto

### Modo desenvolvimento (com hot-reload)

```bash
pnpm dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

### Modo produção

```bash
pnpm build
pnpm start
```

---

## Estrutura do Projeto

```
Projeto Local/
├── client/              ← Frontend React 19 + Tailwind 4
│   └── src/
│       ├── pages/       ← Páginas da aplicação
│       ├── components/  ← Componentes reutilizáveis
│       └── lib/         ← Utilitários e cliente tRPC
├── server/              ← Backend Express + tRPC
│   ├── auth.ts          ← Autenticação e-mail/senha (bcrypt + JWT)
│   ├── db.ts            ← Queries do banco de dados
│   ├── routers.ts       ← Procedures tRPC
│   └── _core/           ← Infraestrutura (contexto, env, etc.)
├── drizzle/             ← Schema e migrações do banco
├── shared/              ← Constantes compartilhadas
├── .env.example         ← Modelo de variáveis de ambiente
└── package.json
```

---

## Papéis de Usuário

| Papel | Acesso |
|---|---|
| `collaborator` | Visualizar equipamentos, fazer agendamentos, ver próprios agendamentos |
| `supervisor` | Tudo do colaborador + aprovar/rejeitar agendamentos, ver relatórios |
| `admin` | Acesso total: gerenciar usuários, equipamentos, configurações |

---

## Gerenciamento de Usuários

No Projeto Local, **não há auto-cadastro**. Todos os usuários são criados pelo administrador:

1. Faça login como admin
2. Acesse **Admin > Usuários**
3. Clique em **Novo Usuário** e preencha nome, e-mail e senha temporária
4. O usuário receberá a senha temporária e será solicitado a alterá-la no primeiro acesso

---

## Notificações Microsoft Teams (opcional)

Para receber notificações de agendamentos via Teams:

1. Crie um **Incoming Webhook** no canal Teams desejado
2. No painel Admin > Usuários, configure o webhook para cada usuário no campo "Teams Webhook"

---

## Diferenças em Relação ao Projeto Manus

| Funcionalidade | Projeto Manus | Projeto Local |
|---|---|---|
| Autenticação | Manus OAuth (SSO) | E-mail + Senha (JWT) |
| Banco de dados | TiDB gerenciado | MySQL local ou nuvem |
| Armazenamento de arquivos | S3 Manus | Não configurado |
| Notificações push | Manus Notifications | Não disponível |
| Deploy | Plataforma Manus | Manual (Railway, Render, VPS) |
| Geração de IA (LLM/Imagens) | Manus Forge API | Não disponível |

---

## Solução de Problemas

**Erro: `DATABASE_URL is required`**
→ Verifique se o arquivo `.env` existe e contém a variável `DATABASE_URL`.

**Erro: `Access denied for user`**
→ Verifique usuário, senha e permissões no MySQL.

**Erro: `ECONNREFUSED 127.0.0.1:3306`**
→ O MySQL não está rodando. Inicie o serviço: `sudo systemctl start mysql` (Linux) ou pelo MySQL Workbench (Windows/Mac).

**Porta 3000 já em uso**
→ Defina outra porta no `.env`: `PORT=3001`

---

## Deploy em Produção

Para hospedar o Projeto Local em um servidor:

1. Configure as variáveis de ambiente no servidor (especialmente `JWT_SECRET` e `NODE_ENV=production`)
2. Execute `pnpm build` para gerar os arquivos de produção
3. Execute `pnpm start` para iniciar o servidor
4. Configure um proxy reverso (Nginx ou Caddy) apontando para a porta configurada

Plataformas recomendadas: [Railway](https://railway.app), [Render](https://render.com), [Fly.io](https://fly.io)
