## 🧪 LabScheduler - Sistema de Agendamento de Laboratórios

![Status do Projeto](https://img.shields.io/badge/Status-Em%20Desenvolvimento-green)
![Node Version](https://img.shields.io/badge/Node-v18%2B-blue)
![License](https://img.shields.io/badge/License-MIT-brightgreen)

O **LabScheduler** é uma plataforma completa para a gestão de reservas e agendamentos de equipamentos laboratoriais. Projetado para organizar o fluxo de trabalho em ambientes de pesquisa, o sistema evita conflitos de horários e garante o controle de acesso aos recursos do laboratório.

---

## 🚀 Funcionalidades

- **Gestão de Usuários:** Controle de níveis de acesso (Admin/Técnico).
- **Controle de Equipamentos:** Cadastro, status de manutenção e disponibilidade.
- **Agendamentos Inteligentes:** Interface intuitiva para reservas de horários.
- **Segurança:** Autenticação via JWT e criptografia de senhas com BCrypt.
- **Notificações:** Suporte a Webhooks (Microsoft Teams) para alertas de reserva.

---

## 🛠️ Tecnologias

- **Frontend/Backend:** [Next.js 14 (App Router)](https://nextjs.org/)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Banco de Dados:** [TiDB Cloud](https://tidb.com/) (MySQL-compatible Serverless)
- **Deploy:** [Render](https://render.com/)

---

## 📋 Pré-requisitos

- Node.js v18 ou superior
- Gerenciador de pacotes **pnpm** (recomendado), npm ou yarn
- Instância de banco de dados MySQL (TiDB Cloud recomendada)

---

## 🔧 Instalação e Configuração Local

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/lab-equipment-scheduler.git
   cd lab-equipment-scheduler


2. **Instale as dependências:**

```bash
 pnpm install
```


3. Configure as variáveis de ambiente:

Crie um arquivo .env na raiz do projeto e preencha conforme o exemplo:

```bash
 cp.env.example.env
```
# Conexão com o Banco de Dados (TiDB Cloud)
DATABASE_URL="mysql://USUARIO:SENHA@HOST:4000/labscheduler?ssl={\"rejectUnauthorized\":true}"

# Segurança
JWT_SECRET="gere_uma_chave_aleatoria_e_longa"
```node
 node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
### Variáveis de ambiente:

| Variável | Exemplo| Descrição |
|---|---|---|
| DATABASE_URL |mysql://root:senha@localhost:3306/labscheduler |String de conexão com o MySQL |
| JWT_SECRET | minha-chave-secreta-com-32-chars-minimo |Chave para assinar os tokens de sessão |
| NODE_ENV | development | Ambiente de execução |
| PORT| 1000 / 3000 | Porta do servidor Render ou Node |

4. Sincronize o banco de dados:**

```bash
 pnpm db:push
```


5. Inicie o servidor:**

```bash
 pnpm dev
```


🗄️ Estrutura do Banco de Dados

## O banco de dados é composto por 5 tabelas principais:


- **users**: Armazena dados de perfis e credenciais.
- **equipment**: Lista de ativos disponíveis no laboratório.
- **bookings**: Registros de agendamentos e horários.
- **equipment_access**: Define quais usuários podem usar quais máquinas.
- **system_settings**: Configurações globais do sistema.


🔑 Criando o Primeiro Acesso (Admin)
Como o sistema é fechado para segurança, o primeiro administrador deve ser inserido via SQL (DBeaver ou console TiDB):

```sql
 NSERT INTO users (name, email, passwordHash, mustChangePassword, role, isActive)
VALUES ('Administrador', 'admin@teste.com', 'HASH_GERADO_PELO_BCRYPT', 0, 'admin', 1);
```


