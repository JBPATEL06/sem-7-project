import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function testIntentAndLogger() {
  console.log('=== TESTING CONVERSATIONAL INTENTS ("hey", "hey you there") & STRUCTURED LOGS ===\n');

  // Test 1: "hey"
  console.log('[Test 1] Sending prompt: "hey"...');
  const res1 = await fetch(`${BASE_URL}/api/screens/generate-stitch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'hey',
      projectId: 'acme-api'
    })
  });
  const data1 = (await res1.json()) as any;
  console.log('HTTP Status:', res1.status);
  console.log('Intent Detected:', data1.intent);
  console.log('Mode:', data1.mode);
  console.log('AI Reply Text:', data1.reply || data1.assistantExplanation);
  console.log('Canvas Components Count (Should be unchanged):', data1.screen?.board?.components?.length);

  // Test 2: "hey you there"
  console.log('\n[Test 2] Sending prompt: "hey you there"...');
  const res2 = await fetch(`${BASE_URL}/api/screens/generate-stitch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'hey you there',
      projectId: 'acme-api'
    })
  });
  const data2 = (await res2.json()) as any;
  console.log('HTTP Status:', res2.status);
  console.log('Intent Detected:', data2.intent);
  console.log('Mode:', data2.mode);
  console.log('AI Reply Text:', data2.reply || data2.assistantExplanation);
  console.log('Canvas Components Count (Should be unchanged):', data2.screen?.board?.components?.length);

  // Test 3: Read and print daily structured log trace
  console.log('\n[Test 3] Reading daily log trace from .ai-manager/logs/...');
  const dateStr = new Date().toISOString().slice(0, 10);
  const logPath = path.resolve(process.cwd(), '.ai-manager', 'logs', `app-${dateStr}.log`);

  if (fs.existsSync(logPath)) {
    const rawLogs = fs.readFileSync(logPath, 'utf-8');
    const logLines = rawLogs.trim().split('\n');
    console.log(`\nFound log file: ${logPath}`);
    console.log(`Total Log Lines: ${logLines.length}`);
    console.log('\n--- RECENT STRUCTURED LOG TRACES ---');
    console.log(logLines.slice(-15).join('\n'));
  } else {
    console.error('Log file not found at:', logPath);
  }

  console.log('\n=== INTENT & LOGGER TEST FINISHED ===');
}

testIntentAndLogger().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
