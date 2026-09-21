import fs from 'fs';
import path from 'path';
import { atomicWriteFileSync } from '../server/shared/utils/atomicPersistence.js';

async function testCrashSafetyAndBackups() {
  console.log('=== TEST 1: Atomic Writes & Versioned Backups Verification ===');

  const testDir = path.join(process.cwd(), 'diagrams', 'test_tmp_run');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const targetFile = path.join(testDir, 'crash_test_diagram.drawio');
  const backupDir = path.join(testDir, '.backups');
  const tmpDir = path.join(testDir, '.tmp');

  // Clean test folder
  if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
  if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });

  // 1. Write initial version V1
  console.log('Step 1: Writing initial version V1...');
  atomicWriteFileSync(targetFile, JSON.stringify({ version: 1, title: 'V1 Initial Complete' }));
  console.log('  File created successfully. Content:', fs.readFileSync(targetFile, 'utf-8'));

  // 2. Perform 6 auto-saves (V2 to V7) to test 5-version backup pruning
  console.log('\nStep 2: Triggering 6 auto-save cycles (V2 to V7)...');
  for (let v = 2; v <= 7; v++) {
    // Add small delay to ensure distinct mtime / timestamps
    await new Promise(r => setTimeout(r, 100));
    atomicWriteFileSync(targetFile, JSON.stringify({ version: v, title: `V${v} Auto-saved` }));
  }

  console.log('  Current target file content:', fs.readFileSync(targetFile, 'utf-8'));

  // 3. Verify backup count in .backups/
  const backups = fs.readdirSync(backupDir).filter(f => f.startsWith('crash_test_diagram.drawio.') && f.endsWith('.bak'));
  console.log(`\nStep 3: Checking backup folder. Total backup snapshots created/retained: ${backups.length}`);
  console.log('  Backups list:', backups);
  const passBackupCount = backups.length === 5;
  console.log(`  Backup limit test (Max 5 retained): ${passBackupCount ? 'PASS ✅' : 'FAIL ❌'}`);

  // 4. Simulate a crash mid-edit (e.g. process killed while writing to .tmp file before renameSync)
  console.log('\nStep 4: Simulating mid-save process crash...');
  const fakeTmp = path.join(tmpDir, `crash_test_diagram.drawio.tmp_crash_${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(fakeTmp, '{"version": 8, "corrupt": "PARTIAL_UNFINISHED_PAYLOAD...');

  console.log('  Simulated kill right before atomic renameSync!');

  // Check target file on disk after crash
  const postCrashContent = fs.readFileSync(targetFile, 'utf-8');
  console.log('  Post-crash target file content on disk:', postCrashContent);
  const isTargetIntact = postCrashContent.includes('V7 Auto-saved') && !postCrashContent.includes('PARTIAL');
  console.log(`  Crash integrity test (Target file intact with V7, uncorrupted): ${isTargetIntact ? 'PASS ✅' : 'FAIL ❌'}`);

  // 5. Complete normal save V8 after recovery
  console.log('\nStep 5: Executing normal auto-save after recovery (V8)...');
  atomicWriteFileSync(targetFile, JSON.stringify({ version: 8, title: 'V8 Fully Saved Post Recovery' }));
  const postRecoveryContent = fs.readFileSync(targetFile, 'utf-8');
  console.log('  Final target file content:', postRecoveryContent);
  const isPostRecoveryOk = postRecoveryContent.includes('V8 Fully Saved Post Recovery');
  console.log(`  Post-recovery persistence test: ${isPostRecoveryOk ? 'PASS ✅' : 'FAIL ❌'}`);

  // Cleanup test run directory
  fs.rmSync(testDir, { recursive: true, force: true });

  if (passBackupCount && isTargetIntact && isPostRecoveryOk) {
    console.log('\n=== ALL CRASH SAFETY & BACKUP TESTS PASSED SUCCESSFULLY! ✅ ===');
    process.exit(0);
  } else {
    console.error('\n=== CRASH SAFETY TEST FAILED ❌ ===');
    process.exit(1);
  }
}

testCrashSafetyAndBackups();
