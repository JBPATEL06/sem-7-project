import { encrypt, decrypt } from './utils/encryption.js';
import { safeDecryptUri, maskUri } from './dbRoutes.js';
import { MongoDriver } from './drivers/mongoDriver.js';
import { PgDriver } from './drivers/pgDriver.js';
import { RedisDriver } from './drivers/redisDriver.js';

async function runTests() {
  console.log('=== Running DB Gap Fix Automated Tests ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}`);
      failed++;
    }
  }

  // 1. Encryption & Decryption
  try {
    const rawUri = 'mongodb+srv://admin:SecretPass123!@cluster0.mongodb.net/prod_db';
    const encrypted = encrypt(rawUri);
    assert(encrypted !== rawUri && encrypted.includes(':'), 'Encrypt returns IV:AuthTag:Ciphertext format');
    const decrypted = decrypt(encrypted);
    assert(decrypted === rawUri, 'Decrypt restores original URI');

    const safeDecrypted = safeDecryptUri(encrypted);
    assert(safeDecrypted === rawUri, 'safeDecryptUri handles encrypted URI');

    const legacyDecrypted = safeDecryptUri('postgres://user:pass@localhost:5432/db');
    assert(legacyDecrypted === 'postgres://user:pass@localhost:5432/db', 'safeDecryptUri handles legacy plaintext URI');

    const masked = maskUri(rawUri);
    assert(!masked.includes('SecretPass123!'), 'maskUri redacts password from URI');
  } catch (err: any) {
    console.error('Encryption test error:', err.message);
    failed++;
  }

  // 2. MongoDriver Static Methods
  try {
    assert(typeof MongoDriver.closeAll === 'function', 'MongoDriver has static closeAll() method');
    await MongoDriver.closeAll();
    assert(true, 'MongoDriver.closeAll() executes cleanly without error');
  } catch (err: any) {
    console.error('MongoDriver closeAll error:', err.message);
    failed++;
  }

  // 3. PgDriver Static Methods
  try {
    assert(typeof PgDriver.closeAll === 'function', 'PgDriver has static closeAll() method');
    await PgDriver.closeAll();
    assert(true, 'PgDriver.closeAll() executes cleanly without error');
  } catch (err: any) {
    console.error('PgDriver closeAll error:', err.message);
    failed++;
  }

  // 4. RedisDriver Static & Instance Methods
  try {
    assert(typeof RedisDriver.closeAll === 'function', 'RedisDriver has static closeAll() method');
    await RedisDriver.closeAll();
    assert(true, 'RedisDriver.closeAll() executes cleanly without error');
  } catch (err: any) {
    console.error('RedisDriver closeAll error:', err.message);
    failed++;
  }

  console.log(`\n===================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`===================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
