import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const { AIRTABLE_TOKEN, BASE_ID, TABLE_NAME, PORT } = process.env;

// Rota de login
app.post("/login", async (req, res) => {
  const { usuario, email } = req.body;
  const agora = new Date().toISOString();

  try {
    // Verifica se usuário já existe
    const checkResponse = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}?filterByFormula={Email}='${email}'`,
      { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } }
    );
    const checkData = await checkResponse.json();

    if (checkData.records.length > 0) {
      const userId = checkData.records[0].id;
      await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${userId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ fields: { UltimoLogin: agora } })
      });
      return res.json({ success: true, message: "Login realizado com sucesso!" });
    } else {
      await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fields: {
            Usuários: usuario,
            Email: email,
            DataCadastro: agora,
            UltimoLogin: agora
          }
        })
      });
      return res.json({ success: true, message: "Novo usuário cadastrado com sucesso!" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erro na conexão com Airtable." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
