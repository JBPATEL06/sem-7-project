import { loadDecryptedCredentials } from '../server/settingsRoutes.js';

async function testGroqDirect() {
  const creds = loadDecryptedCredentials();
  const apiKey = creds.groq;
  console.log('Using Groq API Key from credentials.enc:', apiKey ? `${apiKey.slice(0, 8)}... (Length: ${apiKey.length})` : 'None');

  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  const models = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'mixtral-8x7b-32768'];

  const prompt = 'Modern Cloud Telemetry Dashboard with 4 KPI metrics, latency time-series chart, and cluster services table';
  const systemPrompt = `You are Stitch AI, a world-class UI design engineer synthesizing Figma AST layout specs.
Given a prompt and context, return a JSON object with:
- title: string (concise name)
- description: string
- components: array of component nodes (Each MUST have: id, name, type, x, y, width, height, fills, strokes, borderRadius, text, fontSize, color).
Generate complete, rich, high-fidelity UI elements matching the user prompt.
Return valid JSON only.`;

  for (const model of models) {
    console.log(`\nTesting Model: "${model}" on endpoint ${endpoint}...`);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: JSON.stringify({ prompt, mode: 'create', isDark: true })
            }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      console.log(`HTTP Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log('Raw Response Body:', text.slice(0, 500));

      if (res.ok) {
        const json = JSON.parse(text);
        const parsedContent = JSON.parse(json.choices[0].message.content);
        console.log('Parsed Title:', parsedContent.title);
        console.log('Parsed Components Count:', parsedContent.components?.length);
        console.log('SUCCESS! Groq generated valid AST.');
        break;
      } else {
        console.error(`FAILED with HTTP ${res.status}:`, text);
      }
    } catch (err: any) {
      console.error(`Exception on model ${model}:`, err.message);
    }
  }
}

testGroqDirect().catch(console.error);
