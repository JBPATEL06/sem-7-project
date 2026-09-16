import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function runTest() {
  console.log('=== STITCH ARCHITECTURE COMPLIANCE TEST ===\n');

  // Step 1: Design Tokens Fetch
  console.log('[1/4] Testing GET /api/screens/design-tokens (Project: acme-api, Theme: violet)...');
  const tokensRes = await fetch(`${BASE_URL}/api/screens/design-tokens?projectId=acme-api&themeName=violet`);
  const tokensData = (await tokensRes.json()) as any;
  console.log('Design Tokens Response Status:', tokensRes.status);
  console.log('Tokens Retrieved:');
  console.log(JSON.stringify({
    id: tokensData.tokens?.id,
    themeName: tokensData.tokens?.themeName,
    colors: {
      primary: tokensData.tokens?.colors?.primary,
      background: tokensData.tokens?.colors?.background,
      surface: tokensData.tokens?.colors?.surface,
      accent: tokensData.tokens?.colors?.accent
    },
    typographyScale: tokensData.tokens?.typography?.scale,
    radii: tokensData.tokens?.radii
  }, null, 2));

  // Step 2: Create a Screen AST with Semantic Component Types
  console.log('\n[2/4] Testing AST Synthesis with Semantic Component Types & Design Tokens...');
  const genRes = await fetch(`${BASE_URL}/api/screens/generate-stitch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'create user analytics dashboard with kpi cards, primary action button, and search input',
      projectId: 'acme-api',
      mode: 'create'
    })
  });
  const genData = (await genRes.json()) as any;
  console.log('Generate Screen Status:', genRes.status);
  console.log('Intent Detected:', genData.intent);
  console.log('Screen ID:', genData.screen?.id);
  console.log('Screen Name:', genData.screen?.name);
  console.log('Total Generated Components:', genData.screen?.board?.components?.length);

  // Inspect semantic types in the generated components
  const components = genData.screen?.board?.components || [];
  const semanticSummary = components.map((c: any) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    semantic: c.semantic || null,
    borderRadius: c.borderRadius,
    fills: c.fills
  }));
  console.log('Semantic Component Samples:');
  console.log(JSON.stringify(semanticSummary.slice(0, 4), null, 2));

  // Step 3: Targeted Mutation Test (Diff-Only Mutation)
  console.log('\n[3/4] Testing POST /api/screens/modify-element (Targeted AST Property Diff)...');
  // Find a target component to mutate
  const targetComp = components.find((c: any) => c.type === 'button' || c.name.toLowerCase().includes('button')) || components[0];
  console.log(`Targeting Component: ${targetComp.id} (${targetComp.name})`);
  console.log('\n--- BEFORE AST STATE ---');
  console.log(JSON.stringify({
    id: targetComp.id,
    name: targetComp.name,
    type: targetComp.type,
    fills: targetComp.fills,
    borderRadius: targetComp.borderRadius,
    semantic: targetComp.semantic
  }, null, 2));

  // Send mutation request
  const modifyRes = await fetch(`${BASE_URL}/api/screens/modify-element`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      screenId: genData.screen?.id,
      selectedCompIds: [targetComp.id],
      prompt: 'make emerald pill button with full radius'
    })
  });
  const modifyData = (await modifyRes.json()) as any;
  console.log('\nModify Element Status:', modifyRes.status);
  console.log('Changes Summary:', modifyData.changesSummary);
  console.log('AST Property Diffs Recorded:');
  console.log(JSON.stringify(modifyData.astDiffs, null, 2));

  // Find the mutated component in the returned screen
  const updatedComps = modifyData.screen?.board?.components || [];
  const mutatedComp = updatedComps.find((c: any) => c.id === targetComp.id);
  console.log('\n--- AFTER AST STATE ---');
  console.log(JSON.stringify({
    id: mutatedComp.id,
    name: mutatedComp.name,
    type: mutatedComp.type,
    fills: mutatedComp.fills,
    borderRadius: mutatedComp.borderRadius,
    semantic: mutatedComp.semantic
  }, null, 2));

  // Verify non-targeted components remained untouched
  const otherBefore = components.filter((c: any) => c.id !== targetComp.id);
  const otherAfter = updatedComps.filter((c: any) => c.id !== targetComp.id);
  const untouchedPreserved = JSON.stringify(otherBefore) === JSON.stringify(otherAfter);
  console.log('\n[4/4] Untouched Siblings Integrity Check:');
  console.log(`All ${otherBefore.length} non-targeted components strictly preserved without recreation: ${untouchedPreserved}`);

  console.log('\n=== TEST RUN FINISHED ===');
}

runTest().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
