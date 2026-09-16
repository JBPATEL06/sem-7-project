import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

async function runTest() {
  console.log('=== TEST: Screen Modify Wipe Guard Verification ===\n');

  // 1. Initial State: Create 19-component screen
  const dummy19Components = [
    { id: 'comp_topbar', name: 'Top Navigation Bar', type: 'frame', x: 0, y: 0, width: 1200, height: 60, fills: [{ color: '#1e293b' }] },
    { id: 'comp_brand', name: 'Brand Logo & Title', type: 'text', x: 20, y: 15, width: 180, height: 30, characters: 'Analytics Pro' },
    { id: 'comp_search', name: 'Global Search Input', type: 'input', x: 250, y: 10, width: 300, height: 40 },
    { id: 'comp_user_avatar', name: 'User Profile Avatar', type: 'frame', x: 1140, y: 10, width: 40, height: 40 },
    { id: 'comp_sidebar', name: 'Left Sidebar Container', type: 'frame', x: 0, y: 60, width: 220, height: 840 },
    { id: 'comp_nav_overview', name: 'Nav Item: Overview', type: 'text', x: 20, y: 90, width: 180, height: 30 },
    { id: 'comp_nav_reports', name: 'Nav Item: Reports', type: 'text', x: 20, y: 130, width: 180, height: 30 },
    { id: 'comp_nav_users', name: 'Nav Item: Users', type: 'text', x: 20, y: 170, width: 180, height: 30 },
    { id: 'comp_nav_settings', name: 'Nav Item: Settings', type: 'text', x: 20, y: 210, width: 180, height: 30 },
    { id: 'comp_card_kpi1', name: 'Total Revenue KPI Card', type: 'card', x: 250, y: 80, width: 220, height: 120 },
    { id: 'comp_card_kpi2', name: 'Active Users KPI Card', type: 'card', x: 490, y: 80, width: 220, height: 120 },
    { id: 'comp_card_kpi3', name: 'Conversion Rate KPI Card', type: 'card', x: 730, y: 80, width: 220, height: 120 },
    { id: 'comp_card_kpi4', name: 'Avg Session KPI Card', type: 'card', x: 970, y: 80, width: 220, height: 120 },
    { id: 'comp_chart_main', name: 'Main Traffic Line Chart', type: 'chart', x: 250, y: 220, width: 620, height: 320 },
    { id: 'comp_pie_sources', name: 'Traffic Sources Pie Chart', type: 'chart', x: 890, y: 220, width: 300, height: 320 },
    { id: 'comp_table_header', name: 'Recent Transactions Header', type: 'text', x: 250, y: 560, width: 400, height: 30 },
    { id: 'comp_table_grid', name: 'Transactions Data Table', type: 'table', x: 250, y: 600, width: 940, height: 260 },
    { id: 'comp_footer', name: 'Dashboard Footer', type: 'frame', x: 220, y: 870, width: 980, height: 30 },
    { id: 'comp_export_btn', name: 'Export Report Button', type: 'button', x: 1040, y: 15, width: 90, height: 32, fills: [{ color: '#7c3aed' }] }
  ];

  const screenId = 'screen_stitch_test_dashboard_' + Date.now();
  const screenTitle = 'User Analytics Dashboard';

  console.log(`[Step 1] Creating test screen with 19 components: ${screenId}`);
  const saveRes = await fetch('http://localhost:3000/api/screens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: screenId,
      name: screenTitle,
      type: 'screen',
      category: 'dashboard',
      description: '19-component test dashboard',
      board: {
        width: 1200,
        height: 900,
        components: dummy19Components
      }
    })
  });

  const createdScreen = await saveRes.json();
  console.log(`Initial Screen Created: id=${screenId}, components=${dummy19Components.length}`);

  // 2. Modify single element with prompt
  console.log('\n[Step 2] Sending modify request with mode="modify", 1 selected component (comp_export_btn), prompt="make export report properly"');
  const modifyRes = await fetch('http://localhost:3000/api/screens/generate-stitch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      screenId: screenId,
      prompt: 'make export report properly with emerald green button and download icon',
      mode: 'modify',
      selectedCompIds: ['comp_export_btn'],
      existingBoard: {
        width: 1200,
        height: 900,
        components: dummy19Components
      }
    })
  });

  const modifyData = await modifyRes.json();
  const finalComponents = modifyData.screen?.board?.components || [];
  const modifiedBtn = finalComponents.find((c: any) => c.id === 'comp_export_btn');

  console.log('\n=== RESULTS ===');
  console.log(`- Backend Intent: ${modifyData.intent}`);
  console.log(`- Backend Mode: ${modifyData.mode}`);
  console.log(`- Before component count: ${dummy19Components.length}`);
  console.log(`- After component count: ${finalComponents.length}`);
  console.log(`- Target component ID: comp_export_btn`);
  console.log(`- Target component updated name: ${modifiedBtn?.name}`);
  console.log(`- Changes Summary: ${modifyData.changesSummary}`);
  console.log(`- Other components count preserved: ${finalComponents.filter((c: any) => c.id !== 'comp_export_btn').length}`);

  // Check backup directory
  const backupDir = path.resolve(process.cwd(), '.ai-manager', 'backups');
  if (fs.existsSync(backupDir)) {
    const backups = fs.readdirSync(backupDir).filter(f => f.includes(screenId));
    console.log(`- Automated backups created in .ai-manager/backups: ${backups.length} file(s) found`);
    backups.forEach(b => console.log(`  -> ${b}`));
  }

  // 3. Test explicit redesign intent vs modify
  console.log('\n[Step 3] Testing explicit redesign prompt: "redesign from scratch with minimal dark theme"');
  const redesignRes = await fetch('http://localhost:3000/api/screens/generate-stitch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      screenId: screenId,
      prompt: 'redesign from scratch with minimal dark theme',
      mode: 'create'
    })
  });
  const redesignData = await redesignRes.json();
  console.log(`- Redesign Backend Intent: ${redesignData.intent}`);
  console.log(`- Redesign Backend Mode: ${redesignData.mode}`);
  console.log(`- Redesign result component count: ${redesignData.screen?.board?.components?.length}`);
  console.log(`- Redesign changes summary: ${redesignData.changesSummary}`);
}

runTest().catch(err => console.error('Test failed with error:', err));
