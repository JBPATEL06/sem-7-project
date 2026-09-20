import express from 'express';
import * as dotenv from 'dotenv';
import path from 'path';
import { gitRouter } from './server/modules/git/index.js';
import { projectsRouter } from './server/modules/projects/index.js';

async function runGitVerificationTests() {
  console.log('====================================================');
  console.log('=== DAY 2: GIT MANAGEMENT VERIFICATION TEST SUITE ===');
  console.log('====================================================');

  const app = express();
  app.use(express.json());
  app.use('/api/git', gitRouter);
  app.use('/api/projects', projectsRouter);

  const PORT = 3098;
  const server = app.listen(PORT);
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  try {
    // -------------------------------------------------------------------------
    // 1. Test GET /api/git/branches
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing GET /api/git/branches ---');
    const branchRes = await fetch(`${BASE_URL}/api/git/branches?projectId=acme-api`);
    const branchData = await branchRes.json() as any;

    console.log(`Status: ${branchRes.status}`);
    console.log(`Current Branch: ${branchData.current}`);
    console.log(`All Branches (${branchData.all?.length || 0}):`, branchData.all);
    console.log(`isRepo: ${branchData.isRepo}`);

    if (branchRes.status !== 200 || !branchData.isRepo || !Array.isArray(branchData.branches)) {
      throw new Error(`Branch listing failed: ${JSON.stringify(branchData)}`);
    }
    console.log('✅ GET /api/git/branches returned valid branch summary.');

    // -------------------------------------------------------------------------
    // 2. Test GET /api/git/commits
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing GET /api/git/commits ---');
    const commitRes = await fetch(`${BASE_URL}/api/git/commits?projectId=acme-api&limit=10`);
    const commitData = await commitRes.json() as any;

    console.log(`Status: ${commitRes.status}`);
    console.log(`Total Commits Count: ${commitData.total}`);
    console.log(`Returned Commits (${commitData.commits?.length || 0}):`);
    if (commitData.commits && commitData.commits.length > 0) {
      commitData.commits.slice(0, 5).forEach((c: any, i: number) => {
        console.log(`  [${i + 1}] SHA: ${c.sha} | Author: ${c.author} (${c.authorName}) | Time: ${c.time} | Tag: ${c.tag || 'none'}`);
        console.log(`      Message: ${c.message}`);
      });
    }

    if (commitRes.status !== 200 || !Array.isArray(commitData.commits) || commitData.commits.length === 0) {
      throw new Error(`Commit listing failed: ${JSON.stringify(commitData)}`);
    }
    const sampleCommit = commitData.commits[0];
    console.log('✅ GET /api/git/commits returned real repository commit history.');

    // -------------------------------------------------------------------------
    // 3. Test GET /api/git/tree
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing GET /api/git/tree ---');
    const treeRes = await fetch(`${BASE_URL}/api/git/tree?projectId=acme-api&commit=${sampleCommit.sha}`);
    const treeData = await treeRes.json() as any;

    console.log(`Status: ${treeRes.status}`);
    console.log(`Total Files in Tree: ${treeData.stats?.totalFiles}`);
    console.log(`DB/Schema Related Files: ${treeData.stats?.dbRelatedCount}`);
    console.log(`Files Sample (${treeData.files?.slice(0, 5).length || 0} shown):`);
    treeData.files?.slice(0, 5).forEach((f: any) => {
      console.log(`  - ${f.path} [Ext: ${f.extension || 'none'}, DB-Related: ${f.isDbRelated}]`);
    });

    if (treeRes.status !== 200 || !Array.isArray(treeData.files) || treeData.files.length === 0) {
      throw new Error(`Tree listing failed: ${JSON.stringify(treeData)}`);
    }
    console.log('✅ GET /api/git/tree returned real file list and schema tags.');

    // -------------------------------------------------------------------------
    // 4. Test POST /api/git/sync
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing POST /api/git/sync ---');
    const syncRes = await fetch(`${BASE_URL}/api/git/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: 'acme-api' })
    });
    const syncData = await syncRes.json() as any;

    console.log(`Status: ${syncRes.status}`);
    console.log(`Sync Success: ${syncData.success}`);
    console.log(`Current Branch: ${syncData.branch}`);
    console.log(`Ahead: ${syncData.ahead}, Behind: ${syncData.behind}`);
    console.log(`Modified Files (${syncData.modified?.length || 0}):`, syncData.modified?.slice(0, 3));
    console.log(`Is Clean: ${syncData.isClean}`);
    console.log(`Last Synced: ${syncData.lastSynced}`);

    if (syncRes.status !== 200 || !syncData.success) {
      throw new Error(`Git sync failed: ${JSON.stringify(syncData)}`);
    }
    console.log('✅ POST /api/git/sync successfully queried status and updated sync timestamp.');

    console.log('\n====================================================');
    console.log('🎉 ALL DAY 2 GIT MANAGEMENT TESTS PASSED PROVABLY!');
    console.log('====================================================\n');
  } finally {
    server.close();
  }
}

runGitVerificationTests().catch((err) => {
  console.error('❌ Git verification failed:', err);
  process.exit(1);
});
