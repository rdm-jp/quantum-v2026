const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  console.log('--- Function login invocada ---');
  console.log('Método:', event.httpMethod);
  console.log('Body raw:', event.body);
  console.log('Node version:', process.version);

  if (event.httpMethod !== "POST") {
    console.log('Método inválido');
    return { statusCode: 405, body: 'Método não permitido' };
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(event.body || '{}');
    console.log('Body parseado:', parsedBody);
  } catch (err) {
    console.error('Erro ao parsear body:', err.message);
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'JSON inválido' }) };
  }

  const { usuario, email } = parsedBody;

  if (!usuario || !email) {
    console.log('Campos obrigatórios faltando');
    return { statusCode: 400, body: JSON.stringify({ success: false, message: 'Usuário e email são obrigatórios' }) };
  }

  console.log('Variáveis de ambiente disponíveis:');
  console.log('AIRTABLE_TOKEN presente:', !!process.env.AIRTABLE_TOKEN);
  console.log('BASE_ID:', process.env.BASE_ID || 'faltando');
  console.log('TABLE_NAME:', process.env.TABLE_NAME || 'faltando');

  const agora = new Date().toISOString();

  try {
    console.log('Iniciando GET no Airtable para email:', email);

    const checkResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.BASE_ID}/${process.env.TABLE_NAME}?filterByFormula={Email}='${encodeURIComponent(email)}'`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` }
      }
    );

    console.log('Resposta GET - Status:', checkResponse.status);

    if (!checkResponse.ok) {
      const errText = await checkResponse.text();
      console.error('GET falhou:', checkResponse.status, errText);
      throw new Error(`Airtable GET falhou: ${checkResponse.status}`);
    }

    const checkData = await checkResponse.json();
    console.log('Registros encontrados:', checkData.records.length);

    if (checkData.records.length > 0) {
      const userId = checkData.records[0].id;
      console.log('Atualizando usuário ID:', userId);

      const patchResponse = await fetch(
        `https://api.airtable.com/v0/${process.env.BASE_ID}/${process.env.TABLE_NAME}/${userId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ fields: { UltimoLogin: agora } })
        }
      );

      console.log('PATCH - Status:', patchResponse.status);

      if (!patchResponse.ok) throw new Error('PATCH falhou');

      return { statusCode: 200, body: JSON.stringify({ success: true, message: "Login realizado com sucesso!" }) };
    } else {
      console.log('Criando novo usuário');

      const createResponse = await fetch(
        `https://api.airtable.com/v0/${process.env.BASE_ID}/${process.env.TABLE_NAME}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            fields: { Usuários: usuario, Email: email, DataCadastro: agora, UltimoLogin: agora }
          })
        }
      );

      console.log('POST - Status:', createResponse.status);

      if (!createResponse.ok) throw new Error('POST falhou');

      return { statusCode: 200, body: JSON.stringify({ success: true, message: "Novo usuário cadastrado com sucesso!" }) };
    }
  } catch (error) {
    console.error('Erro geral na function:', error.message, error.stack);
    return { statusCode: 500, body: JSON.stringify({ success: false, message: "Erro interno: " + error.message }) };
  }
};