import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Log imediato para confirmar que o arquivo começou
console.log("Iniciando api/index.js...");

// Carrega dotenv (em produção, env vars do dashboard sobrescrevem)
dotenv.config();

console.log("dotenv carregado. NODE_ENV:", process.env.NODE_ENV || "não definido");

// Compatibilidade com ESM para __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Paths configurados. __dirname:", __dirname);

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*" })); // Mantenha * por enquanto; depois restrinja

console.log("Middlewares configurados");

// Servir arquivos estáticos da pasta public
app.use(express.static(path.join(__dirname, "..", "public")));

// Rota raiz (servir index.html)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// Rota de login com logs e timeout
app.post("/login", async (req, res) => {
  console.log("Requisição /login recebida com body:", req.body);

  const { usuario, email } = req.body;

  if (!usuario || !email) {
    console.log("Campos obrigatórios faltando");
    return res.status(400).json({
      success: false,
      message: "Usuário e email são obrigatórios",
    });
  }

  const agora = new Date().toISOString();

  try {
    console.log("Iniciando verificação no Airtable para email:", email);

    // Timeout de 20 segundos para o GET
    const controllerCheck = new AbortController();
    const timeoutCheck = setTimeout(() => controllerCheck.abort(), 20000);

    const checkResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.BASE_ID}/${process.env.TABLE_NAME}?filterByFormula={Email}='${encodeURIComponent(email)}'`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
        },
        signal: controllerCheck.signal,
      }
    );

    clearTimeout(timeoutCheck);

    console.log("Resposta do check Airtable - Status:", checkResponse.status);

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error("Airtable check falhou:", checkResponse.status, errorText);
      throw new Error(`Airtable check falhou: ${checkResponse.status} - ${errorText}`);
    }

    const checkData = await checkResponse.json();
    console.log("Registros encontrados:", checkData.records.length);

    if (checkData.records.length > 0) {
      // Atualiza usuário existente
      const userId = checkData.records[0].id;
      console.log("Atualizando usuário existente - ID:", userId);

      const controllerPatch = new AbortController();
      const timeoutPatch = setTimeout(() => controllerPatch.abort(), 15000);

      const patchResponse = await fetch(
        `https://api.airtable.com/v0/${process.env.BASE_ID}/${process.env.TABLE_NAME}/${userId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: { UltimoLogin: agora },
          }),
          signal: controllerPatch.signal,
        }
      );

      clearTimeout(timeoutPatch);

      console.log("Resposta do PATCH - Status:", patchResponse.status);

      if (!patchResponse.ok) {
        const errorText = await patchResponse.text();
        console.error("Falha no PATCH:", patchResponse.status, errorText);
        throw new Error(`Falha ao atualizar login: ${patchResponse.status} - ${errorText}`);
      }

      return res.json({ success: true, message: "Login realizado com sucesso!" });
    } else {
      // Cria novo usuário
      console.log("Criando novo usuário");

      const controllerPost = new AbortController();
      const timeoutPost = setTimeout(() => controllerPost.abort(), 15000);

      const createResponse = await fetch(
        `https://api.airtable.com/v0/${process.env.BASE_ID}/${process.env.TABLE_NAME}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: {
              Usuários: usuario,
              Email: email,
              DataCadastro: agora,
              UltimoLogin: agora,
            },
          }),
          signal: controllerPost.signal,
        }
      );

      clearTimeout(timeoutPost);

      console.log("Resposta do POST - Status:", createResponse.status);

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error("Falha no POST:", createResponse.status, errorText);
        throw new Error(`Falha ao criar usuário: ${createResponse.status} - ${errorText}`);
      }

      return res.json({ success: true, message: "Novo usuário cadastrado com sucesso!" });
    }
  } catch (error) {
    console.error("Erro completo no /login:", error.message, error.stack);
    return res.status(500).json({
      success: false,
      message: "Erro na conexão com Airtable: " + error.message,
    });
  }
});

// Listen na porta do ambiente (Render fornece via env)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log("BASE_ID:", process.env.BASE_ID);
  console.log("TABLE_NAME:", process.env.TABLE_NAME);
  console.log("AIRTABLE_TOKEN presente:", !!process.env.AIRTABLE_TOKEN);
});

console.log("App configurado e listen chamado com sucesso");