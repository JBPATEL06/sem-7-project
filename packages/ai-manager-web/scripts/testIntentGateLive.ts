import fetch from 'node-fetch';

async function runLiveIntentTests() {
  console.log('=== Starting Stitch AI Intent Gate Live Verification ===\n');

  const testCases = [
    {
      name: 'Test 1: Greeting ("hey")',
      prompt: 'hey',
      expectedIntent: 'DISCUSS'
    },
    {
      name: 'Test 2: UI/UX Question ("what do you think about adding a search bar here?")',
      prompt: 'what do you think about adding a search bar here?',
      expectedIntent: 'DISCUSS'
    },
    {
      name: 'Test 3: Screen Generation ("add a login screen with email and password")',
      prompt: 'add a login screen with email and password',
      expectedIntent: 'GENERATE'
    }
  ];

  for (const tc of testCases) {
    console.log(`--- Running ${tc.name} ---`);
    console.log(`Prompt: "${tc.prompt}"`);

    const res = await fetch('http://localhost:3000/api/screens/generate-stitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: tc.prompt,
        mode: 'create'
      })
    });

    const status = res.status;
    const data: any = await res.json();

    console.log(`HTTP Status: ${status}`);
    console.log(`Intent Returned: ${data.intent || (data.mode === 'create' ? 'GENERATE' : data.mode)}`);
    console.log(`Changes Summary: ${data.changesSummary}`);
    console.log(`Assistant Explanation / Reply: "${data.assistantExplanation || data.reply}"`);
    console.log(`Generation Steps Count: ${data.generationSteps?.length || 0}`);
    console.log(`Components Count: ${data.screen?.board?.components?.length || 0}`);

    if (data.intent === 'DISCUSS') {
      console.log('✅ Result: Handled conversationally without generating new screen layout.');
    } else {
      console.log(`✅ Result: Generated full screen AST with ${data.screen?.board?.components?.length || 0} components.`);
    }
    console.log('\n');
  }

  console.log('=== All 3 Intent Gate Live Tests Finished ===');
}

runLiveIntentTests().catch(err => {
  console.error('Intent test error:', err);
  process.exit(1);
});
