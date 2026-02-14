// netlify/functions/login.js
import fetch from "node-fetch";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método não permitido" };
  }

  const { usuario, email } = JSON.parse(event.body || "{}");

  if (!usuario || !email) {
    return {
      statusCode: 400,
      body: JSON.stringify({ success: false, message: "Usuário e email são obrigatórios" }),
    };
  }

  const agora = new Date().toISOString();

  try {
    // Check se usuário existe
    const checkResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.BASE_ID}/${process.env.TABLE_NAME}?filterByFormula={Email}='${encodeURIComponent(email)}'`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
      }
    );

    if (!checkResponse.ok) {
      const errorText = await checkResponse.text();
      console.error("Airtable check error:", checkResponse.status, errorText);
      throw new Error(`Airtable check falhou: ${checkResponse.status}`);
    }

    const checkData = await checkResponse.json();

    if (checkData.records.length > 0) {
      // Atualiza
      const userId = checkData.records[0].id;
      const patchResponse = await fetch(
        `https://api.airtable.com/v0/${process.env.BASE_ID}/${process.env.TABLE_NAME}/${userId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fields: { UltimoLogin: agora } }),
        }
      );

      if (!patchResponse.ok) throw new Error("Falha ao atualizar login");

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Login realizado com sucesso!" }),
      };
    } else {
      // Cria novo
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

      if (!createResponse.ok) throw new Error("Falha ao criar usuário");

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Novo usuário cadastrado com sucesso!" }),
      };
    }
  } catch (error) {
    console.error("Erro na function login:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: "Erro na conexão com Airtable" }),
    };
  }
};