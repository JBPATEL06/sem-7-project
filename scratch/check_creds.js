const fs = require('fs');
const crypto = require('crypto');

function decrypt(ciphertext) {
  const parts = ciphertext.split(':');
  const key = crypto.createHash('sha256').update(process.env.ENCRYPTION_KEY || 'ai_manager_default_32byte_secret_key_1234567890!').digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(parts[0], 'hex'));
  decipher.setAuthTag(Buffer.from(parts[1], 'hex'));
  return decipher.update(parts[2], 'hex', 'utf8') + decipher.final('utf8');
}

try {
  const data = fs.readFileSync('packages/ai-manager-web/.ai-manager/credentials.enc', 'utf8');
  const creds = JSON.parse(decrypt(data));
  console.log('Keys in credentials.enc:', Object.keys(creds));
  console.log('groq set:', Boolean(creds.groq));
  console.log('openai set:', Boolean(creds.openai));
  if (creds.groq) console.log('groq prefix:', creds.groq.slice(0, 8));
  if (creds.openai) console.log('openai prefix:', creds.openai.slice(0, 8));
} catch (e) {
  console.log('Error:', e.message);
}
