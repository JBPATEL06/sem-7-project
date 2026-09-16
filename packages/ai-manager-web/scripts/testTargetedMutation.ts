async function testMutation() {
  console.log('=== 1. Create Initial Screen ===');
  const createRes = await fetch('http://localhost:3000/api/screens/generate-stitch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: '3 analytics cards with header',
      mode: 'create',
      projectId: 'acme-api',
      theme: 'dark'
    })
  });

  const createData = await createRes.json();
  console.log('Initial screen created:', createData.screen?.name, 'ID:', createData.screen?.id);
  const comps = createData.screen?.board?.components || [];
  console.log('Comps count:', comps.length);
  if (comps.length === 0) throw new Error('Failed to create base screen');

  const targetCompId = comps[0].id;
  console.log(`\n=== 2. Target Component ID "${targetCompId}" for Mutation ===`);
  console.log('Before mutation comp 0:', comps[0].name, 'Fills:', JSON.stringify(comps[0].fills));

  const mutateRes = await fetch('http://localhost:3000/api/screens/generate-stitch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Change fill color to emerald green (#10b981) and make border radius 24px',
      mode: 'modify',
      screenId: createData.screen.id,
      selectedCompIds: [targetCompId],
      existingBoard: createData.screen.board,
      projectId: 'acme-api',
      theme: 'dark'
    })
  });

  const mutateData = await mutateRes.json();
  console.log('\n=== 3. Mutation Result ===');
  console.log('Status:', mutateRes.status);
  console.log('Success:', mutateData.success);
  console.log('Changes summary:', mutateData.changesSummary);
  const updatedComps = mutateData.screen?.board?.components || [];
  const updatedTarget = updatedComps.find((c: any) => c.id === targetCompId) || updatedComps[0];
  console.log('After mutation target comp:', updatedTarget?.name, 'Fills:', JSON.stringify(updatedTarget?.fills), 'Radius:', updatedTarget?.borderRadius);
  console.log('Untouched sibling comp 1:', updatedComps[1]?.name, 'Fills:', JSON.stringify(updatedComps[1]?.fills));
}

testMutation().catch(console.error);
