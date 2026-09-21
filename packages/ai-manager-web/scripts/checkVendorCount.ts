import path from 'path';
import { loadIndexFromSqlite } from '@ai-manager/core';
import { getWorkspaceRootDir } from '../server/shared/index.js';

async function main() {
  const rootDir = getWorkspaceRootDir();
  const dbPath = path.resolve(rootDir, '.dbci/index.sqlite');
  console.log('Checking database:', dbPath);
  const index = await loadIndexFromSqlite(dbPath);
  const hashes = index.fileHashes || [];
  const vendorFiles = hashes.filter(f => 
    f.file.includes('drawio-repo') || 
    f.file.includes('postgres-meta') || 
    f.file.includes('open-pencil-repo')
  );
  console.log('TOTAL_INDEXED_FILES=' + hashes.length);
  console.log('VENDOR_FILES_COUNT=' + vendorFiles.length);
  if (vendorFiles.length > 0) {
    console.log('Vendor files found:', vendorFiles.map(f => f.file));
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
