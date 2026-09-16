import { exportScreenToFigBuffer } from '../server/figExporter.js';
import { parseFigBuffer } from '@open-pencil/fig';
import * as fs from 'fs';
import * as path from 'path';

async function testFigExport() {
  console.log('=== TEST: Native .fig Export via OpenPencil Engine ===\n');

  const dummy19Screen: any = {
    id: 'screen_fig_test_001',
    name: 'User Analytics Dashboard',
    description: '19-component production analytics dashboard',
    theme: {
      backgroundColor: '#090d16',
      surfaceColor: '#131b2e',
      primaryColor: '#7c3aed',
      textColor: '#f8fafc',
      borderRadius: 12
    },
    board: {
      id: 'board_001',
      name: 'User Analytics Dashboard Canvas',
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
      background: '#090d16',
      components: [
        { id: 'c1', name: 'Top Navigation Bar', type: 'frame', x: 0, y: 0, width: 1440, height: 60, fills: [{ color: '#1e293b' }] },
        { id: 'c2', name: 'Analytics Pro Brand', type: 'text', x: 24, y: 18, width: 180, height: 24, characters: 'Analytics Pro', color: '#f8fafc', fontSize: 18, fontWeight: '700' },
        { id: 'c3', name: 'Global Search Input', type: 'input', x: 260, y: 12, width: 340, height: 36, fills: [{ color: '#0f172a' }], borderRadius: 8 },
        { id: 'c4', name: 'User Profile Avatar', type: 'frame', x: 1380, y: 12, width: 36, height: 36, fills: [{ color: '#7c3aed' }], borderRadius: 18 },
        { id: 'c5', name: 'Left Sidebar Navigation', type: 'frame', x: 0, y: 60, width: 220, height: 840, fills: [{ color: '#0d111c' }] },
        { id: 'c6', name: 'Nav Item: Overview', type: 'text', x: 24, y: 90, width: 170, height: 24, characters: 'Overview', color: '#a78bfa' },
        { id: 'c7', name: 'Nav Item: Reports', type: 'text', x: 24, y: 130, width: 170, height: 24, characters: 'Reports', color: '#94a3b8' },
        { id: 'c8', name: 'Nav Item: Users', type: 'text', x: 24, y: 170, width: 170, height: 24, characters: 'Users', color: '#94a3b8' },
        { id: 'c9', name: 'Nav Item: Settings', type: 'text', x: 24, y: 210, width: 170, height: 24, characters: 'Settings', color: '#94a3b8' },
        { id: 'c10', name: 'Total Revenue KPI Card', type: 'card', x: 250, y: 80, width: 270, height: 130, fills: [{ color: '#131b2e' }], borderRadius: 12 },
        { id: 'c11', name: 'Active Users KPI Card', type: 'card', x: 540, y: 80, width: 270, height: 130, fills: [{ color: '#131b2e' }], borderRadius: 12 },
        { id: 'c12', name: 'Conversion Rate KPI Card', type: 'card', x: 830, y: 80, width: 270, height: 130, fills: [{ color: '#131b2e' }], borderRadius: 12 },
        { id: 'c13', name: 'Server Latency KPI Card', type: 'card', x: 1120, y: 80, width: 270, height: 130, fills: [{ color: '#131b2e' }], borderRadius: 12 },
        { id: 'c14', name: 'Main Traffic Line Chart Area', type: 'chart', x: 250, y: 230, width: 720, height: 340, fills: [{ color: '#131b2e' }], borderRadius: 12 },
        { id: 'c15', name: 'Traffic Sources Breakdown', type: 'chart', x: 990, y: 230, width: 400, height: 340, fills: [{ color: '#131b2e' }], borderRadius: 12 },
        { id: 'c16', name: 'Recent Transactions Header', type: 'text', x: 250, y: 590, width: 400, height: 24, characters: 'Recent Transactions', color: '#f8fafc', fontSize: 16, fontWeight: '700' },
        { id: 'c17', name: 'Transactions Data Grid', type: 'table', x: 250, y: 625, width: 1140, height: 240, fills: [{ color: '#131b2e' }], borderRadius: 12 },
        { id: 'c18', name: 'Export Report Button', type: 'button', x: 1260, y: 14, width: 100, height: 32, fills: [{ color: '#10b981' }], borderRadius: 9999 },
        { id: 'c19', name: 'Export Button Label', type: 'text', x: 1275, y: 22, width: 70, height: 16, characters: 'Export', color: '#ffffff', fontSize: 12, fontWeight: '700' }
      ]
    }
  };

  console.log(`[Step 1] Exporting 19-component screen "${dummy19Screen.name}" to native binary .fig...`);
  const figBytes = await exportScreenToFigBuffer(dummy19Screen);
  console.log(`-> Generated .fig binary archive size: ${figBytes.length} bytes`);

  // Write to ui/user_analytics_dashboard.fig
  const uiDir = path.resolve(process.cwd(), '..', '..', 'ui');
  if (!fs.existsSync(uiDir)) fs.mkdirSync(uiDir, { recursive: true });
  const outPath = path.join(uiDir, 'user_analytics_dashboard.fig');
  fs.writeFileSync(outPath, Buffer.from(figBytes));
  console.log(`-> Saved native .fig file to: ${outPath}`);

  // Step 2: Validate the generated .fig file with OpenPencil parser
  console.log('\n[Step 2] Validating .fig file structure with @open-pencil/fig parser...');
  const fileBuffer = fs.readFileSync(outPath);
  const parsed = parseFigBuffer(fileBuffer.buffer);

  console.log(`-> .fig Archive Header: Valid`);
  console.log(`-> Schema Kiwi Version: ${parsed.figKiwiVersion}`);
  console.log(`-> Node changes decoded count: ${parsed.nodeChanges.length}`);
  console.log(`-> Metadata JSON: ${parsed.metaJSON}`);

  console.log('\nDecoded Node Hierarchy:');
  parsed.nodeChanges.forEach((n: any, idx: number) => {
    console.log(`  [${idx + 1}] ${n.type.padEnd(10)} | name: "${n.name || ''}" | size: ${n.size ? `${n.size.x}x${n.size.y}` : 'n/a'}`);
  });

  console.log('\n=== RESULT: Native .fig export generated and verified valid by OpenPencil parser ===');
}

testFigExport().catch(err => console.error('Test error:', err));
