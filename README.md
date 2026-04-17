# LabScheduler

# 🧪 LabScheduler - Sistema de Agendamento de Laboratórios

![Status do Projeto](https://img.shields.io/badge/Status-Em%20Desenvolvimento-green)
![Node Version](https://img.shields.io/badge/Node-v18%2B-blue)
![License](https://img.shields.io/badge/License-MIT-brightgreen)

O **LabScheduler** é uma plataforma completa para a gestão de reservas e agendamentos de equipamentos laboratoriais. Projetado para organizar o fluxo de trabalho em ambientes de pesquisa, o sistema evita conflitos de horários e garante o controle de acesso aos recursos do laboratório.

## 🚀 Funcionalidades

- **Gestão de Usuários:** Controle de níveis de acesso (Admin/Técnico).
- **Controle de Equipamentos:** Cadastro, status de manutenção e disponibilidade.
- **Agendamentos Inteligentes:** Interface intuitiva para reservas de horários.
- **Segurança:** Autenticação via JWT e criptografia de senhas com BCrypt.
- **Notificações:** Suporte a Webhooks (Microsoft Teams) para alertas de reserva.

## 🛠️ Tecnologias

- **Frontend/Backend:** [Next.js 14 (App Router)](https://nextjs.org/)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **Banco de Dados:** [TiDB Cloud](https://tidb.com/) (MySQL-compatible Serverless)
- **Deploy:** [Render](https://render.com/)

## 📋 Pré-requisitos

- Node.js v18 ou superior.
- Gerenciador de pacotes **pnpm** (recomendado), npm ou yarn.
- Instância de banco de dados MySQL (TiDB Cloud recomendada).

## 🔧 Instalação e Configuração Local

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/seu-usuario/lab-equipment-scheduler.git](https://github.com/seu-usuario/lab-equipment-scheduler.git)
   cd lab-equipment-scheduler

   Instale as dependências:

Bash
pnpm install
Configure as variáveis de ambiente:
Crie um arquivo .env na raiz do projeto e preencha conforme o exemplo:

Fragmento do código
# Conexão com o Banco de Dados (TiDB Cloud)
DATABASE_URL="mysql://USUARIO:SENHA@HOST:4000/labscheduler?ssl={\"rejectUnauthorized\":true}"

# Segurança
JWT_SECRET="gere_uma_chave_aleatoria_e_longa"

# Servidor
PORT=3000
NODE_ENV=development
Sincronize o banco de dados:

Bash
pnpm db:push
Inicie o servidor:

Bash
pnpm dev
🗄️ Estrutura do Banco de Dados
O banco de dados é composto por 5 tabelas principais:

users: Armazena dados de perfis e credenciais.

equipment: Lista de ativos disponíveis no laboratório.

bookings: Registros de agendamentos e horários.

equipment_access: Define quais usuários podem usar quais máquinas.

system_settings: Configurações globais do sistema.

🔑 Criando o Primeiro Acesso (Admin)
Como o sistema é fechado para segurança, o primeiro administrador deve ser inserido via SQL (DBeaver ou console TiDB):

SQL
INSERT INTO users (name, email, passwordHash, mustChangePassword, role, isActive)
VALUES ('Administrador', 'admin@teste.com', 'HASH_GERADO_PELO_BCRYPT', 0, 'admin', 1);
📦 Deploy no Render
Crie um novo Web Service no Render conectado ao seu repositório.

No campo Environment Variables, adicione as chaves do .env (DATABASE_URL, JWT_SECRET, etc.).

Certifique-se de que a DATABASE_URL no Render contenha o parâmetro de SSL para comunicação com o TiDB.

Build Command: pnpm build

Start Command: pnpm start

📄 Licença
Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.
