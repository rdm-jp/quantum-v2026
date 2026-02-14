import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";  // agora import normal (instalado como dep)

// Log imediato para confirmar que o arquivo começou a rodar
console.log("Iniciando api/index.js...");

// Carrega .env sempre (em produção, env vars vêm do dashboard, ignora .env)
dotenv.config();

console.log("dotenv carregado. NODE_ENV:", process.env.NODE_ENV || "não definido");

// Compatibilidade ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Paths configurados. __dirname:", __dirname);

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*" }));

console.log("Middlewares configurados");

// Servir estáticos
app.use(express.static(path.join(__dirname, "..", "public")));

// Rota raiz
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// Rota login (mantida igual, mas adicione log no início dela se quiser)
app.post("/login", async (req, res) => {
  console.log("Requisição /login recebida");
  // ... resto do código igual ...
});

// Listen sempre
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log("BASE_ID:", process.env.BASE_ID);
  console.log("TABLE_NAME:", process.env.TABLE_NAME);
  console.log("AIRTABLE_TOKEN presente:", !!process.env.AIRTABLE_TOKEN);
});

// Log final para confirmar que chegou aqui
console.log("App configurado e listen chamado");