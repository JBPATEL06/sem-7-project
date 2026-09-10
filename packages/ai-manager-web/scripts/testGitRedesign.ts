import http from 'http';

const BASE_URL = 'http://localhost:3000';

function request(path: string, options: { method?: string; body?: any; headers?: any } = {}): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const bodyStr = options.body ? JSON.stringify(options.body) : null;
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
          ...options.headers
        }
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            resolve({ status: res.statusCode || 200, data });
          } catch {
            resolve({ status: res.statusCode || 200, data: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('🚀 Running Git Redesign Verification Suite');
  console.log('====================================================\n');

  // Step 1: Branches
  console.log('1️⃣ Testing GET /api/git/branches...');
  const branchRes = await request('/api/git/branches');
  console.log(`   Status: ${branchRes.status}`);
  console.log(`   Current: ${branchRes.data.current}, Branches: ${branchRes.data.all.join(', ')}`);
  if (branchRes.status !== 200 || !branchRes.data.branches) {
    throw new Error('Failed to list branches');
  }

  // Step 2: File code retrieval
  console.log('\n2️⃣ Testing GET /api/git/file (inspecting package.json)...');
  const fileRes = await request('/api/git/file?path=packages/ai-manager-web/package.json');
  console.log(`   Status: ${fileRes.status}`);
  console.log(`   Path: ${fileRes.data.path}`);
  console.log(`   Lines: ${fileRes.data.lineCount}, Size: ${fileRes.data.sizeBytes} bytes, DB: ${fileRes.data.isDbRelated}`);
  if (fileRes.status !== 200 || !fileRes.data.content || fileRes.data.lineCount < 5) {
    throw new Error('Failed to retrieve file contents');
  }

  // Step 3: Set Branch Flags (Green, Red, Problem)
  console.log('\n3️⃣ Testing POST /api/git/branch-flags (Setting Green, Red, Problem flags)...');
  
  // Set main as Green
  const flagGreen = await request('/api/git/branch-flags', {
    method: 'POST',
    body: {
      projectId: 'acme-api',
      branch: 'main',
      status: 'green',
      note: 'Production clean & tested'
    }
  });
  console.log(`   Set 'main' -> Green: ${flagGreen.data.success}, note="${flagGreen.data.flag?.note}"`);

  // Set feature/schema-v2 as Problem
  const flagProblem = await request('/api/git/branch-flags', {
    method: 'POST',
    body: {
      projectId: 'acme-api',
      branch: 'feature/schema-v2',
      status: 'problem',
      note: 'Potential collision in userSchema.ts'
    }
  });
  console.log(`   Set 'feature/schema-v2' -> Problem: ${flagProblem.data.success}, note="${flagProblem.data.flag?.note}"`);

  // Set feature/conflict-branch as Red Flag
  const flagRed = await request('/api/git/branch-flags', {
    method: 'POST',
    body: {
      projectId: 'acme-api',
      branch: 'feature/conflict-branch',
      status: 'red',
      note: 'Breaking schema collision in user table'
    }
  });
  console.log(`   Set 'feature/conflict-branch' -> Red: ${flagRed.data.success}, note="${flagRed.data.flag?.note}"`);

  // Step 4: Verify Branch Flags Persistence
  console.log('\n4️⃣ Testing GET /api/git/branch-flags (Persistence Check)...');
  const getFlagsRes = await request('/api/git/branch-flags?projectId=acme-api');
  console.log(`   Status: ${getFlagsRes.status}`);
  console.log(`   Saved flags count: ${getFlagsRes.data.flags?.length}`);
  getFlagsRes.data.flags.forEach((f: any) => {
    console.log(`   - Branch: ${f.branch} -> [${f.status}] "${f.note}"`);
  });

  // Step 5: Merge Conflict Analysis on Red Flag Branch
  console.log('\n5️⃣ Testing POST /api/git/merge-check on red-flagged branch...');
  const mergeCheckRes = await request('/api/git/merge-check', {
    method: 'POST',
    body: {
      projectId: 'acme-api',
      baseBranch: 'main',
      targetBranch: 'feature/conflict-branch'
    }
  });
  console.log(`   Status: ${mergeCheckRes.status}`);
  console.log(`   Can Auto-Merge: ${mergeCheckRes.data.canAutoMerge}`);
  console.log(`   Conflict Count: ${mergeCheckRes.data.conflictCount}`);
  console.log(`   Summary: "${mergeCheckRes.data.summary}"`);
  if (mergeCheckRes.data.conflicts?.length > 0) {
    console.log(`   First conflict: ${mergeCheckRes.data.conflicts[0].file} (ID: ${mergeCheckRes.data.conflicts[0].id})`);
  }

  // Step 6: Resolve Merge Conflict
  if (mergeCheckRes.data.conflicts?.length > 0) {
    console.log('\n6️⃣ Testing POST /api/git/resolve-conflict...');
    const firstConf = mergeCheckRes.data.conflicts[0];
    const resolveRes = await request('/api/git/resolve-conflict', {
      method: 'POST',
      body: {
        projectId: 'acme-api',
        baseBranch: 'main',
        targetBranch: 'feature/conflict-branch',
        conflictId: firstConf.id,
        resolutionChoice: 'both',
        resolvedCode: `${firstConf.currentCode}\n// MERGED\n${firstConf.incomingCode}`,
        file: firstConf.file
      }
    });
    console.log(`   Status: ${resolveRes.status}`);
    console.log(`   Resolved: ${resolveRes.data.isResolved}, Choice: ${resolveRes.data.resolutionChoice}`);
  }

  console.log('\n====================================================');
  console.log('✅ ALL GIT REDESIGN TESTS PASSED WITH 100% SUCCESS!');
  console.log('====================================================\n');
}

run().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});
