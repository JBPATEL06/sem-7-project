async function test() {
  const res = await fetch('http://localhost:3000/api/screens/generate-stitch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: '5 containers each having 10 text items with distinct titles and descriptions',
      mode: 'create',
      projectId: 'acme-api',
      theme: 'dark'
    })
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response body:', text);
}

test().catch(console.error);
