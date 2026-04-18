# Relatório Técnico: Execução do LabScheduler em Localhost

**Sistema:** LabScheduler — Sistema de Agendamento de Equipamentos de Laboratório  
**Versão:** Projeto Local (autenticação e-mail/senha)  
**Data:** Abril de 2026  
**Documento:** Guia Técnico de Implantação Local

---

## 1. Visão Geral

O Projeto Local é uma versão do LabScheduler adaptada para funcionar inteiramente em ambiente local (`localhost`), sem dependência de serviços externos da plataforma Manus. A principal diferença em relação à versão hospedada é o mecanismo de autenticação: em vez do Manus OAuth (SSO), o sistema utiliza autenticação por e-mail e senha com hash bcrypt e tokens JWT armazenados em cookie de sessão.

A arquitetura do sistema é composta por um servidor Express 4 que serve tanto a API (via tRPC) quanto o frontend compilado (React 19 + Tailwind CSS 4), tornando o deploy um processo de arquivo único — sem necessidade de configurar servidores separados para frontend e backend.

---

## 2. Pré-requisitos

Antes de iniciar a instalação, certifique-se de que os seguintes componentes estão presentes na máquina:

| Ferramenta | Versão mínima | Finalidade | Download |
| :--- | :--- | :--- | :--- |
| **Node.js** | 18.0 ou superior | Ambiente de execução JavaScript | [nodejs.org](https://nodejs.org) |
| **pnpm** | 8.0 ou superior | Gerenciador de pacotes | `npm install -g pnpm` |
| **MySQL** | 8.0 ou superior | Banco de dados relacional | [dev.mysql.com](https://dev.mysql.com/downloads/) |

### Verificação rápida
Execute os comandos abaixo no terminal para confirmar as versões instaladas:
```bash
node --version # deve retornar v18.x.x ou superior
pnpm --version # deve retornar 8.x.x ou superior
mysql --version # deve retornar 8.x.x ou superior
```

> **Alternativas ao MySQL local:** Para quem não deseja instalar o MySQL na máquina, é possível utilizar serviços gratuitos em nuvem como [TiDB Serverless](https://tidbcloud.com) ou [PlanetScale](https://planetscale.com), que fornecem uma string de conexão compatível com o formato MySQL.

---

## 3. Instalação Passo a Passo

### 3.1 Extrair e Preparar os Arquivos
Extraia o arquivo `Projeto_Local.zip` em um diretório de sua escolha. A estrutura resultante será:
*   `Projeto Local/`
    *   `client/` ← Frontend React
    *   `server/` ← Backend Express + tRPC
    *   `drizzle/` ← Schema e migrações do banco
    *   `shared/` ← Constantes compartilhadas
    *   `.env.example` ← Modelo de variáveis de ambiente
    *   `package.json` ← Dependências e scripts
    *   `README-LOCAL.md` ← Guia rápido

### 3.2 Instalar Dependências
Dentro da pasta `Projeto Local`, execute:
```bash
pnpm install
```
Este comando instala todas as dependências listadas no `package.json`, incluindo as bibliotecas de autenticação (`bcryptjs`, `jsonwebtoken`) e o ORM de banco de dados (`drizzle-orm` com driver `mysql2`).

### 3.3 Configurar Variáveis de Ambiente
Crie o arquivo `.env` a partir do modelo:
```bash
cp .env.example .env
```
Abra o arquivo `.env` em um editor de texto e configure as seguintes variáveis:

| Variável | Exemplo | Descrição |
| :--- | :--- | :--- |
| `DATABASE_URL` | `mysql://root:senha@localhost:3306/labscheduler` | String de conexão com o MySQL |
| `JWT_SECRET` | `minha-chave-secreta-com-32-chars-minimo` | Chave para assinar os tokens de sessão |
| `NODE_ENV` | `development` | Ambiente de execução |
| `PORT` | `3000` | Porta do servidor (padrão: 3000) |

**Importante sobre o `JWT_SECRET`:** Esta chave deve ter no mínimo 32 caracteres e ser mantida em sigilo. Ela é usada para assinar e verificar os tokens JWT de sessão. Em ambiente de produção, utilize uma chave gerada aleatoriamente.

**Exemplo de geração de chave segura:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.4 Preparar o Banco de Dados MySQL
Conecte-se ao MySQL e crie o banco de dados:
```sql
CREATE DATABASE labscheduler
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

Em seguida, aplique o schema do sistema:
```bash
pnpm db:push
```
Este comando executa o `drizzle-kit generate` (gera os arquivos SQL de migração) seguido do `drizzle-kit migrate` (aplica as migrações no banco). Ao final, as seguintes tabelas serão criadas:

| Tabela | Descrição |
| :--- | :--- |
| `users` | Usuários do sistema com e-mail, hash de senha e papel (role) |
| `equipment` | Equipamentos disponíveis para agendamento |
| `equipment_access` | Controle de acesso restrito por equipamento e usuário |
| `bookings` | Agendamentos com status, turno e histórico de aprovação |
| `system_settings` | Configurações globais do sistema (chave-valor) |

### 3.5 Criar o Primeiro Usuário Administrador
O sistema não possui auto-cadastro — todos os usuários são criados pelo administrador. Para criar o primeiro admin, é necessário inserir diretamente no banco de dados.

**Passo 1:** Gere o hash bcrypt da senha desejada:
```bash
node -e "const b = require('bcryptjs'); b.hash('SuaSenhaAqui', 12).then(h => console.log(h))"
```

**Passo 2:** Copie o hash gerado e execute o SQL abaixo no MySQL:
```sql
INSERT INTO users (name, email, passwordHash, mustChangePassword, role, isActive)
VALUES (
  'Administrador',
  'admin@seudominio.com',
  '$2a$12$COLE_O_HASH_GERADO_AQUI',
  0,
  'admin',
  1
);
```
> **Nota:** O campo `mustChangePassword` com valor `0` (falso) indica que o usuário não será obrigado a trocar a senha no primeiro acesso. Defina como `1` se desejar forçar a troca.

---

## 4. Execução do Sistema

### 4.1 Modo Desenvolvimento
O modo desenvolvimento ativa o hot-reload — qualquer alteração nos arquivos do servidor ou do frontend é refletida automaticamente sem necessidade de reiniciar o processo.
```bash
pnpm dev
```
O servidor iniciará na porta configurada (padrão: 3000). Acesse o sistema em: [http://localhost:3000](http://localhost:3000)

### 4.2 Modo Produção
Para executar em modo produção, é necessário primeiro compilar os arquivos:
```bash
pnpm build
```
Em seguida, inicie o servidor compilado:
```bash
pnpm start
```
O comando `build` gera dois artefatos:
*   `dist/` — servidor Express compilado com esbuild (ESM)
*   `client/dist/` — frontend React compilado com Vite (assets estáticos)

### 4.3 Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `pnpm dev` | Inicia em modo desenvolvimento com hot-reload |
| `pnpm build` | Compila frontend e backend para produção |
| `pnpm start` | Inicia o servidor compilado (produção) |
| `pnpm test` | Executa os testes automatizados com Vitest |
| `pnpm check` | Verifica erros de TypeScript sem compilar |
| `pnpm db:push` | Gera e aplica migrações do banco de dados |
| `pnpm format` | Formata o código com Prettier |

---

## 5. Estrutura de Autenticação Local

A autenticação no Projeto Local funciona de forma completamente independente, sem chamadas a serviços externos.

### 5.1 Fluxo de Login
1.  Usuário → `POST /api/trpc/auth.login`
2.  Servidor valida e-mail e senha (`bcrypt.compare`)
3.  Gera token JWT assinado com `JWT_SECRET`
4.  Define cookie "lab_session" (`httpOnly`, `sameSite: lax`)
5.  Retorna dados do usuário

### 5.2 Verificação de Sessão
Em cada requisição autenticada, o servidor:
1.  Lê o cookie `lab_session`
2.  Verifica e decodifica o JWT usando `JWT_SECRET`
3.  Busca o usuário no banco pelo `id` contido no token
4.  Injeta o usuário no contexto tRPC (`ctx.user`)

### 5.3 Papéis de Usuário

| Papel | Permissões |
| :--- | :--- |
| `collaborator` | Visualizar equipamentos, criar e cancelar próprios agendamentos |
| `supervisor` | Tudo do colaborador + aprovar/rejeitar agendamentos, acessar relatórios |
| `admin` | Acesso total: gerenciar usuários, equipamentos, configurações e relatórios |

---

## 6. Gerenciamento de Usuários

Após o primeiro login como administrador, novos usuários podem ser criados diretamente pelo painel:
1.  Acesse **Admin > Usuários** no menu lateral
2.  Clique em **Novo Usuário**
3.  Preencha nome, e-mail, papel e senha temporária
4.  O usuário poderá fazer login imediatamente com as credenciais fornecidas

Para alterar o papel de um usuário existente, o administrador pode usar o seletor de papel na listagem de usuários. Para desativar um usuário sem excluí-lo, utilize o toggle de status ativo/inativo.

---

## 7. Banco de Dados — Detalhamento das Tabelas

### Tabela `users`
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | INT (PK, auto) | Identificador único |
| `name` | VARCHAR(255) | Nome completo |
| `email` | VARCHAR(320) | E-mail (único) |
| `passwordHash` | VARCHAR(255) | Hash bcrypt da senha |
| `mustChangePassword` | BOOLEAN | Forçar troca de senha no próximo login |
| `role` | ENUM | `collaborator`, `supervisor` ou `admin` |
| `teamsWebhook` | TEXT | URL do webhook do Microsoft Teams (opcional) |
| `isActive` | BOOLEAN | Conta ativa ou desativada |
| `createdAt` | TIMESTAMP | Data de criação |
| `lastSignedIn` | TIMESTAMP | Último acesso |

### Tabela `equipment`
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | INT (PK, auto) | Identificador único |
| `name` | VARCHAR(255) | Nome do equipamento |
| `category` | VARCHAR(100) | Categoria (ex.: Microscopia, Cromatografia) |
| `description` | TEXT | Descrição detalhada |
| `location` | VARCHAR(255) | Localização física no laboratório |
| `isActive` | BOOLEAN | Disponível para agendamento |
| `requiresApproval` | BOOLEAN | Agendamento requer aprovação do supervisor |
| `isRestrictedAccess` | BOOLEAN | Acesso restrito a usuários autorizados |

### Tabela `bookings`
| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | INT (PK, auto) | Identificador único |
| `equipmentId` | INT (FK) | Referência ao equipamento |
| `userId` | INT (FK) | Referência ao usuário solicitante |
| `bookingDate` | VARCHAR(10) | Data no formato YYYY-MM-DD |
| `shift` | ENUM | `morning`, `afternoon` ou `full_day` |
| `status` | ENUM | `pending`, `approved`, `rejected` ou `cancelled` |
| `purpose` | TEXT | Finalidade do uso |
| `approvedBy` | INT (FK) | Usuário que aprovou/rejeitou |
| `rejectionReason` | TEXT | Motivo da rejeição (quando aplicável) |

---

## 8. Solução de Problemas

### 8.1 Erros de Conexão com o Banco
*   **Sintoma:** `Error: Access denied for user 'root'@'localhost'`
    *   **Causa:** Credenciais incorretas na `DATABASE_URL`.
    *   **Solução:** Verifique usuário, senha e nome do banco na string de conexão.
*   **Sintoma:** `Error: connect ECONNREFUSED 127.0.0.1:3306`
    *   **Causa:** O serviço MySQL não está em execução.
    *   **Solução:** Inicie o serviço MySQL (ex: `sudo systemctl start mysql`).

### 8.2 Erros de Variáveis de Ambiente
*   **Sintoma:** `Error: DATABASE_URL is required`
    *   **Causa:** O arquivo `.env` não existe ou não contém a variável.
    *   **Solução:** Verifique se o arquivo foi criado a partir do `.env.example`.
*   **Sintoma:** `JsonWebTokenError: invalid signature`
    *   **Causa:** O `JWT_SECRET` foi alterado após sessões existentes.
    *   **Solução:** Limpe os cookies do navegador e faça login novamente.

### 8.3 Porta em Uso
*   **Sintoma:** `Error: listen EADDRINUSE: address already in use :::3000`
    *   **Causa:** Outro processo está usando a porta 3000.
    *   **Solução:** Defina outra porta no `.env` (`PORT=3001`) ou encerre o processo conflitante.

### 8.4 Erros de Migração do Banco
*   **Sintoma:** `Error: Table 'labscheduler.users' doesn't exist`
    *   **Causa:** As migrações não foram aplicadas.
    *   **Solução:** Execute `pnpm db:push`.
*   **Sintoma:** `Error: Unknown column 'passwordHash'`
    *   **Causa:** O banco foi criado com uma versão anterior do schema.
    *   **Solução:** Descarte e recrie o banco (atenção: apaga todos os dados) e execute `pnpm db:push` novamente.

---

## 9. Considerações de Segurança para Ambiente Local

Embora o Projeto Local seja destinado a uso interno, algumas práticas de segurança são recomendadas mesmo em localhost:
*   **JWT_SECRET:** Utilize sempre uma chave longa e aleatória. Nunca utilize o valor padrão do `.env.example`.
*   **Senha do banco de dados:** Evite usar o usuário `root` do MySQL sem senha. Crie um usuário dedicado para a aplicação.
*   **Acesso à rede local:** Se o servidor for acessível por outros dispositivos na rede, considere configurar HTTPS com um certificado autoassinado.

---

## 10. Resumo dos Comandos Essenciais

| Etapa | Comando |
| :--- | :--- |
| Instalar dependências | `pnpm install` |
| Configurar ambiente | `cp .env.example .env` (editar manualmente) |
| Criar banco de dados | `CREATE DATABASE labscheduler ...` (via MySQL) |
| Aplicar schema | `pnpm db:push` |
| Gerar hash de senha | `node -e "require('bcryptjs').hash('senha', 12).then(console.log)"` |
| Iniciar (Dev) | `pnpm dev` |
| Compilar (Prod) | `pnpm build` |
| Iniciar (Prod) | `pnpm start` |
| Executar testes | `pnpm test` |

---
*Documento gerado em Abril de 2026 — LabScheduler Projeto Local*

