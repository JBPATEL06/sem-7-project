import { loadDecryptedCredentials } from '../server/settingsRoutes.js';

async function testWorkingModels() {
  const creds = loadDecryptedCredentials();
  const apiKey = creds.groq;
  const endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  const testModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound', 'groq/compound-mini', 'qwen/qwen3.8-27b'];

  const prompt = 'Modern Cloud Telemetry Dashboard with 4 KPI metrics, latency time-series chart, and cluster services table';
  const systemPrompt = `You are Stitch AI, a world-class UI design engineer synthesizing Figma AST layout specs.
Given a prompt and context, return a JSON object with:
- title: string (concise name)
- description: string
- components: array of component nodes (Each MUST have: id, name, type, x, y, width, height, fills, strokes, borderRadius, text, fontSize, color).
Return valid JSON only.`;

  for (const model of testModels) {
    console.log(`\nTesting Groq Live Model: "${model}"...`);
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
            { role: 'user', content: JSON.stringify({ prompt, mode: 'create' }) }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      console.log(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      if (res.ok) {
        const json = JSON.parse(text);
        const parsed = JSON.parse(json.choices[0].message.content);
        console.log(`>>> MODEL "${model}" SUCCEEDED! Title: "${parsed.title}", Components: ${parsed.components?.length}`);
      } else {
        console.log(`Model "${model}" Failed:`, text.slice(0, 200));
      }
    } catch (e: any) {
      console.log(`Model "${model}" Error:`, e.message);
    }
  }
}

testWorkingModels().catch(console.error);
