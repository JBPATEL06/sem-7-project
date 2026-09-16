import { loadDecryptedCredentials } from '../server/settingsRoutes.js';

async function testModel(modelName: string) {
  const creds = loadDecryptedCredentials();
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + creds.groq
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        {
          role: 'system',
          content: 'You are a vector UI generator. Return JSON with: title, description, components array.'
        },
        {
          role: 'user',
          content: 'Create 5 containers with 10 text items each.'
        }
      ],
      response_format: { type: 'json_object' }
    })
  });

  const data = await res.json();
  console.log(`[${modelName}] Status:`, res.status);
  if (data.choices?.[0]?.message?.content) {
    const parsed = JSON.parse(data.choices[0].message.content);
    console.log(`[${modelName}] Parsed components count:`, parsed.components?.length);
    console.log(`[${modelName}] First comp name:`, parsed.components?.[0]?.name, 'children:', parsed.components?.[0]?.children?.length);
  } else {
    console.log(`[${modelName}] Error:`, data.error || data);
  }
}

async function run() {
  await testModel('openai/gpt-oss-120b');
  await testModel('qwen/qwen3.8-27b');
  await testModel('openai/gpt-oss-20b');
}

run().catch(console.error);
