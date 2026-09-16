import { loadDecryptedCredentials } from '../server/settingsRoutes.js';

async function testFull() {
  const creds = loadDecryptedCredentials();
  const systemPrompt = `You are an elite vector design AI engine synthesizing Figma/OpenPencil SceneGraph layouts from user prompts.
Given a user prompt and design context, generate a complete, custom UI layout from scratch strictly conforming to the prompt instructions.

Output a valid JSON object strictly matching this schema:
{
  "title": "Concise Descriptive Title",
  "description": "Short explanation",
  "theme": {
    "primaryColor": "#7c3aed",
    "backgroundColor": "#0a0e17",
    "surfaceColor": "#131b2e",
    "textColor": "#f8fafc",
    "accentColor": "#10b981",
    "borderRadius": 12
  },
  "boardWidth": 1440,
  "boardHeight": 900,
  "components": [
    {
      "id": "container_1",
      "name": "Container 1",
      "type": "frame",
      "x": 40,
      "y": 40,
      "width": 250,
      "height": 400,
      "fills": [{ "fillColor": "#131b2e", "opacity": 1 }],
      "strokes": [{ "strokeColor": "#1e293b", "strokeWidth": 1 }],
      "borderRadius": 12,
      "children": [
        {
          "id": "t1_1",
          "name": "Text Item 1",
          "type": "text",
          "x": 16,
          "y": 16,
          "width": 200,
          "height": 24,
          "text": "Item 1 Header",
          "fontSize": 14,
          "fontWeight": "bold",
          "color": "#f8fafc"
        }
      ]
    }
  ]
}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + creds.groq
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Create 5 containers with 10 text items inside each container, positioned horizontally across the canvas.' }
      ],
      response_format: { type: 'json_object' }
    })
  });

  const data = await res.json();
  const content = JSON.parse(data.choices[0].message.content);
  console.log('Title:', content.title);
  console.log('Components count:', content.components?.length);
  content.components?.forEach((c: any, idx: number) => {
    console.log(`- Comp ${idx + 1}: ${c.name} (${c.type}, x=${c.x}, y=${c.y}, w=${c.width}, h=${c.height}, children=${c.children?.length})`);
  });
}

testFull().catch(console.error);
