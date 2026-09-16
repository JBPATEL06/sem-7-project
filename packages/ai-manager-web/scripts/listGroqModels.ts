import { loadDecryptedCredentials } from '../server/settingsRoutes.js';

async function listModels() {
  const creds = loadDecryptedCredentials();
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: 'Bearer ' + creds.groq }
  });
  const data = await res.json();
  if (data.data) {
    console.log('Available Groq models:', data.data.map((m: any) => m.id).join(', '));
  } else {
    console.log('Groq models error:', data);
  }
}

listModels().catch(console.error);
