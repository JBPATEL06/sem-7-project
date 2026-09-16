import fs from 'fs';
import path from 'path';
import { loadDecryptedCredentials } from '../server/settingsRoutes.js';

console.log('=== 1. CHECKING ENVIRONMENT VARIABLES ===');
console.log('process.env.GROQ_API_KEY:', process.env.GROQ_API_KEY ? `PRESENT (Length: ${process.env.GROQ_API_KEY.length})` : 'MISSING (undefined)');
console.log('process.env.OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `PRESENT (Length: ${process.env.OPENAI_API_KEY.length})` : 'MISSING (undefined)');

console.log('\n=== 2. CHECKING .ai-manager/credentials.enc FILES ===');
const pkgCredsPath = path.resolve('d:/Projets/sem-7-project/packages/ai-manager-web/.ai-manager/credentials.enc');
const rootCredsPath = path.resolve('d:/Projets/sem-7-project/.ai-manager/credentials.enc');

console.log('Path 1 (packages/ai-manager-web):', fs.existsSync(pkgCredsPath) ? 'EXISTS' : 'DOES NOT EXIST');
console.log('Path 2 (workspace root):', fs.existsSync(rootCredsPath) ? 'EXISTS' : 'DOES NOT EXIST');

console.log('\n=== 3. CALLING loadDecryptedCredentials() ===');
const creds = loadDecryptedCredentials();
console.log('Decrypted credentials output:', {
  groq: creds.groq ? `PRESENT (Length: ${creds.groq.length}, Starts with: ${creds.groq.slice(0, 6)}...)` : 'MISSING / UNDEFINED',
  openai: creds.openai ? `PRESENT (Length: ${creds.openai.length})` : 'MISSING / UNDEFINED',
  github: creds.github ? `PRESENT (Length: ${creds.github.length})` : 'MISSING / UNDEFINED',
  rawKeys: Object.keys(creds)
});
