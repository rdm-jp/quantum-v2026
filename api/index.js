import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

// Carregue dotenv apenas em dev local (não em produção/Vercel)
if (process.env.NODE_ENV !== 'production') {
  const dotenv = await import('dotenv');  // Dynamic import para ESM
  dotenv.config();
}

// Compatibilidade com ESM para __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*" }));  // Em produção, mude para origens específicas

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, "..", "public")));

// Rota raiz
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// Rota de login
app.post("/login", async (req, res) => {
  const { usuario, email } = req.body;

  if (!usuario || !email) {
    return res.status(400).json({
      success: false,
      message: "Usuário e email são obrigatórios",
    });
  }

  const agora = new Date().toISOString();

  try {
    // Log para debug: Veja se env vars estão corretas
    console.log("BASE_ID:", process.env.BASE_ID);
    console.log("TABLE_NAME:", process.env.TABLE_NAME);
    console.log("AIRTABLE_TOKEN presente:", !!process.env.AIRTABLE_TOKEN);

    // Verifica se o usuário já existe
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
      throw new Error(`Airtable check falhou: ${checkResponse.status}`);
    }

    const checkData = await checkResponse.json();

    if (checkData.records.length > 0) {
      // Usuário já existe → atualiza último login
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
        throw new Error(`Falha ao atualizar login: ${patchResponse.status}`);
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
        throw new Error(`Falha ao criar usuário: ${createResponse.status}`);
      }

      return res.json({ success: true, message: "Novo usuário cadastrado com sucesso!" });
    }
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({
      success: false,
      message: "Erro na conexão com Airtable: " + error.message,
    });
  }
});

// Para dev local apenas
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor local rodando → http://localhost:${PORT}`);
  });
}

export default app;  // Essencial para Vercel