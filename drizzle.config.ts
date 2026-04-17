import { defineConfig } from "drizzle-kit";

// Extraímos os dados da string de conexão para evitar erros de caractere no Windows
export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: "gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com",
    port: 4000,
    user: "3P3YNZ8RiAzhgqe.root",
    password: "iWUBjRznsNma2J6j",
    database: "labscheduler", // Nome do banco que você criou no DBeaver
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
  },
});