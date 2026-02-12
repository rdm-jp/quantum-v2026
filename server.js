// server.js
import express from "express";
import cors from "cors";  // Adicionado para evitar problemas de CORS no front (mesmo sendo full-stack)
import dotenv from "dotenv";
import fetch from "node-fetch";

 
dotenv.config();

const app = express();

// Middlewares essenciais
app.use(express.json());                  // Parseia body JSON
app.use(express.urlencoded({ extended: true })); // Para forms se precisar
app.use(cors({ origin: "*" }));           // Permite qualquer origem (teste). Depois mude para URL específica se separar front

// Sirva os arquivos estáticos do front-end (HTML, CSS, JS)
app.use(express.static("public"));        // Pasta "public" com login.html, principal.html, css, js, etc.

// Rota raiz: serve a página de login automaticamente
app.get("/", (req, res) => {
  res.sendFile("public/index.html", { root: "." }); // Ajuste se o HTML estiver em outra pasta
});

// Rota de login (atualizada e mais segura)
app.post("/login", async (req, res) => {
  const { usuario, email } = req.body;
  if (!usuario || !email) {
    return res.status(400).json({ success: false, message: "Usuário e email são obrigatórios" });
  }

  const agora = new Date().toISOString();

  try {
    // Verifica se o usuário já existe no Airtable
    const checkResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.BASE_ID}/${process.env.TABLE_NAME}?filterByFormula={Email}='${encodeURIComponent(email)}'`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
        },
      }
    );

    if (!checkResponse.ok) {
      throw new Error(`Erro Airtable check: ${checkResponse.status}`);
    }

    const checkData = await checkResponse.json();

    if (checkData.records.length > 0) {
      // Usuário existe → atualiza último login
      const userId = checkData.records[0].id;
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
        }
      );

      if (!patchResponse.ok) {
        throw new Error(`Erro ao atualizar login: ${patchResponse.status}`);
      }

      return res.json({ success: true, message: "Login realizado com sucesso!" });
    } else {
      // Novo usuário → cria registro
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
        }
      );

      if (!createResponse.ok) {
        throw new Error(`Erro ao criar usuário: ${createResponse.status}`);
      }

      return res.json({ success: true, message: "Novo usuário cadastrado com sucesso!" });
    }
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ success: false, message: "Erro na conexão com Airtable: " + error.message });
  }
});

// Porta dinâmica para Vercel (obrigatório!)
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

// Export para Vercel (essencial em serverless)
export default app;