async function main() {
  console.log('=== LIVE TEST 1: REAL PROMPT ("login screen with email and password") ===');
  const realRes = await fetch('http://localhost:3000/api/screens/generate-stitch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'login screen with email and password',
      mode: 'create',
      projectId: 'acme-api'
    })
  });

  const realData = await realRes.json();
  console.log('HTTP Status:', realRes.status);
  console.log('Success:', realData.success);
  console.log('Screen Title:', realData.screen?.name);
  console.log('Total Components Generated:', realData.screen?.board?.components?.length);
  console.log('Components Sample:', realData.screen?.board?.components?.slice(0, 5).map((c: any) => `[${c.type}] ${c.name} (${c.width}x${c.height})`));
  console.log('Changes Summary:', realData.changesSummary);
  console.log('Assistant Message:', realData.assistantMessage);

  console.log('\n=== LIVE TEST 2: GREETING PROMPT ("hey") ===');
  const heyRes = await fetch('http://localhost:3000/api/screens/generate-stitch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'hey',
      mode: 'create',
      projectId: 'acme-api'
    })
  });

  const heyData = await heyRes.json();
  console.log('HTTP Status:', heyRes.status);
  console.log('Success:', heyData.success);
  console.log('Screen Title:', heyData.screen?.name);
  console.log('Total Components Generated:', heyData.screen?.board?.components?.length);
  console.log('Components Sample:', heyData.screen?.board?.components?.slice(0, 5).map((c: any) => `[${c.type}] ${c.name}`));
  console.log('Assistant Message:', heyData.assistantMessage);
}

main().catch(console.error);
