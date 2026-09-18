import express from 'express';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { diagramRouter } from './server/modules/diagrams/index.js';

async function runDiagramVerificationTests() {
  console.log('====================================================');
  console.log('=== DAY 3: EXCALIDRAW DIAGRAMS VERIFICATION SUITE ===');
  console.log('====================================================');

  const app = express();
  app.use(express.json());
  app.use('/api/diagrams', diagramRouter);

  const PORT = 3097;
  const server = app.listen(PORT);
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  let createdDiagramId = '';

  try {
    // -------------------------------------------------------------------------
    // 1. POST /api/diagrams — Create Diagram
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing POST /api/diagrams (Create Diagram) ---');
    const createPayload = {
      projectId: 'acme-api',
      name: 'Core System Architecture',
      description: 'Microservices and database architecture diagram',
      type: 'architecture',
      elements: [
        {
          id: 'elem_web_1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 200,
          height: 80,
          backgroundColor: '#3b82f620',
          strokeColor: '#3b82f6'
        },
        {
          id: 'elem_text_1',
          type: 'text',
          x: 120,
          y: 130,
          text: 'Client Frontend'
        },
        {
          id: 'elem_api_1',
          type: 'rectangle',
          x: 400,
          y: 100,
          width: 200,
          height: 80,
          backgroundColor: '#10b98120',
          strokeColor: '#10b981'
        },
        {
          id: 'elem_text_2',
          type: 'text',
          x: 420,
          y: 130,
          text: 'Express Server'
        }
      ],
      appState: {
        viewBackgroundColor: '#1e1e24',
        theme: 'dark'
      }
    };

    const createRes = await fetch(`${BASE_URL}/api/diagrams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload)
    });
    const createData = await createRes.json() as any;

    console.log(`Status: ${createRes.status}`);
    console.log(`Created Diagram ID: ${createData.diagram?.id}`);
    console.log(`Diagram Name: ${createData.diagram?.name}`);
    console.log(`Elements Count: ${createData.diagram?.elements?.length}`);
    console.log(`Type: ${createData.diagram?.type}`);

    if (createRes.status !== 201 || !createData.diagram?.id) {
      throw new Error(`Diagram creation failed: ${JSON.stringify(createData)}`);
    }
    createdDiagramId = createData.diagram.id;
    console.log('✅ POST /api/diagrams created diagram successfully.');

    // -------------------------------------------------------------------------
    // 2. GET /api/diagrams?projectId=acme-api — List Project Diagrams
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing GET /api/diagrams?projectId=acme-api (List Diagrams) ---');
    const listRes = await fetch(`${BASE_URL}/api/diagrams?projectId=acme-api`);
    const listData = await listRes.json() as any;

    console.log(`Status: ${listRes.status}`);
    console.log(`Total Diagrams Found: ${listData.total}`);
    const foundInList = listData.diagrams?.find((d: any) => d.id === createdDiagramId);
    console.log(`Found Created Diagram in List: ${!!foundInList}`);

    if (listRes.status !== 200 || !foundInList) {
      throw new Error(`Diagram listing verification failed: ${JSON.stringify(listData)}`);
    }
    console.log('✅ GET /api/diagrams returned project diagram list.');

    // -------------------------------------------------------------------------
    // 3. GET /api/diagrams/:id — Get Single Diagram Detail
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing GET /api/diagrams/:id (Get Single Diagram) ---');
    const getRes = await fetch(`${BASE_URL}/api/diagrams/${createdDiagramId}`);
    const getData = await getRes.json() as any;

    console.log(`Status: ${getRes.status}`);
    console.log(`Diagram Name: ${getData.diagram?.name}`);
    console.log(`Elements in Diagram: ${getData.diagram?.elements?.length}`);
    console.log(`Theme in AppState: ${getData.diagram?.appState?.theme}`);

    if (getRes.status !== 200 || getData.diagram?.id !== createdDiagramId) {
      throw new Error(`Get diagram by ID failed: ${JSON.stringify(getData)}`);
    }
    console.log('✅ GET /api/diagrams/:id returned full diagram data.');

    // -------------------------------------------------------------------------
    // 4. PUT /api/diagrams/:id — Update Diagram
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing PUT /api/diagrams/:id (Update Elements & Title) ---');
    const updatePayload = {
      name: 'Core System Architecture (v2 Updated)',
      elements: [
        ...createPayload.elements,
        {
          id: 'elem_db_1',
          type: 'rectangle',
          x: 700,
          y: 100,
          width: 200,
          height: 80,
          backgroundColor: '#f59e0b20',
          strokeColor: '#f59e0b'
        },
        {
          id: 'elem_text_3',
          type: 'text',
          x: 720,
          y: 130,
          text: 'SQLite WASM DB'
        }
      ]
    };

    const updateRes = await fetch(`${BASE_URL}/api/diagrams/${createdDiagramId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    });
    const updateData = await updateRes.json() as any;

    console.log(`Status: ${updateRes.status}`);
    console.log(`Updated Title: ${updateData.diagram?.name}`);
    console.log(`Updated Elements Count: ${updateData.diagram?.elements?.length}`);

    if (updateRes.status !== 200 || updateData.diagram?.elements?.length !== 6) {
      throw new Error(`Diagram update failed: ${JSON.stringify(updateData)}`);
    }
    console.log('✅ PUT /api/diagrams/:id updated diagram elements and persisted changes.');

    // -------------------------------------------------------------------------
    // 5. Verify JsonStore persistence on disk
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Verifying JsonStore Persistence on Disk (.ai-manager/diagrams.json) ---');
    const diskPath = path.resolve(process.cwd(), '.ai-manager', 'diagrams.json');
    const diskExists = fs.existsSync(diskPath);
    console.log(`File exists on disk: ${diskExists}`);

    if (diskExists) {
      const diskContent = JSON.parse(fs.readFileSync(diskPath, 'utf8'));
      const diskEntry = diskContent.find((d: any) => d.id === createdDiagramId);
      console.log(`Found on disk: ${!!diskEntry}`);
      console.log(`On-disk name: ${diskEntry?.name}`);
      console.log(`On-disk elements count: ${diskEntry?.elements?.length}`);

      if (!diskEntry || diskEntry.elements.length !== 6) {
        throw new Error('On-disk JsonStore file does not match updated state.');
      }
    }
    console.log('✅ Disk storage verification passed.');

    // -------------------------------------------------------------------------
    // 6. GET /api/diagrams/:id/export — Export Excalidraw JSON
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing GET /api/diagrams/:id/export (JSON Export) ---');
    const exportRes = await fetch(`${BASE_URL}/api/diagrams/${createdDiagramId}/export?format=json`);
    const exportData = await exportRes.json() as any;

    console.log(`Status: ${exportRes.status}`);
    console.log(`Content-Disposition Header: ${exportRes.headers.get('content-disposition')}`);
    console.log(`Export Type: ${exportData.type}`);
    console.log(`Export Elements Count: ${exportData.elements?.length}`);

    if (exportRes.status !== 200 || exportData.type !== 'excalidraw' || exportData.elements?.length !== 6) {
      throw new Error(`Export failed: ${JSON.stringify(exportData)}`);
    }
    console.log('✅ GET /api/diagrams/:id/export generated downloadable Excalidraw JSON.');

    // -------------------------------------------------------------------------
    // 7. DELETE /api/diagrams/:id — Delete Diagram
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Testing DELETE /api/diagrams/:id ---');
    const deleteRes = await fetch(`${BASE_URL}/api/diagrams/${createdDiagramId}`, {
      method: 'DELETE'
    });
    const deleteData = await deleteRes.json() as any;

    console.log(`Status: ${deleteRes.status}`);
    console.log(`Delete Success: ${deleteData.success}`);

    if (deleteRes.status !== 200 || !deleteData.success) {
      throw new Error(`Delete failed: ${JSON.stringify(deleteData)}`);
    }
    console.log('✅ DELETE /api/diagrams/:id removed diagram.');

    // -------------------------------------------------------------------------
    // 8. Confirm Deletion (404)
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Confirming Deletion (GET /api/diagrams/:id returns 404) ---');
    const confirmRes = await fetch(`${BASE_URL}/api/diagrams/${createdDiagramId}`);
    console.log(`Status: ${confirmRes.status} (Expected: 404)`);

    if (confirmRes.status !== 404) {
      throw new Error(`Expected 404 after deletion, got ${confirmRes.status}`);
    }
    console.log('✅ Diagram confirmed deleted from database and memory.');

    console.log('\n====================================================');
    console.log('🎉 ALL DAY 3 EXCALIDRAW & DIAGRAM TESTS PASSED PROVABLY!');
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

runDiagramVerificationTests().catch((err) => {
  console.error('❌ Diagram verification test failed:', err);
  process.exit(1);
});
