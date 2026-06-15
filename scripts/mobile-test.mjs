import { networkInterfaces } from 'node:os';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function getLanIpv4() {
  const nets = networkInterfaces();
  const candidates = [];
  for (const entries of Object.values(nets)) {
    for (const net of entries ?? []) {
      if (net.family !== 'IPv4' || net.internal) continue;
      candidates.push(net.address);
    }
  }
  return candidates[0] ?? null;
}

function readProductionUrl() {
  const prodEnv = resolve(root, '.env.production');
  if (!existsSync(prodEnv)) return null;
  const text = readFileSync(prodEnv, 'utf8');
  const match = text.match(/^VITE_API_BASE_URL=(.+)$/m);
  if (!match) return null;
  const api = match[1].trim();
  if (api.includes('onrender.com')) return 'https://395-flavio2.netlify.app';
  return null;
}

const port = process.env.VITE_PORT || '5173';
const lan = getLanIpv4();
const prod = readProductionUrl();

console.log('');
console.log('══════════════════════════════════════════════════════');
console.log('  Magnus Mind — teste no celular');
console.log('══════════════════════════════════════════════════════');
console.log('');
console.log('OPÇÃO 1 (recomendada) — site em produção');
console.log('  Abra no celular (mesma conta, login Firebase OK):');
console.log(`  → ${prod ?? 'https://395-flavio2.netlify.app'}`);
console.log('  Após o deploy do GitHub, aguarde 1–2 min e recarregue.');
console.log('');
console.log('OPÇÃO 2 — rede local (dev na sua máquina)');
console.log('  1. Terminal A: npm run dev:api');
console.log('  2. Terminal B: npm run dev:host');
if (lan) {
  console.log(`  3. No celular (mesmo Wi‑Fi): http://${lan}:${port}`);
} else {
  console.log('  3. No celular: use o IP da sua máquina na rede Wi‑Fi');
}
console.log('  ⚠ Login Firebase pode falhar por IP — use a Opção 1 ou 3.');
console.log('');
console.log('OPÇÃO 3 — túnel HTTPS (dev + login no celular)');
console.log('  1. Terminal A: npm run dev:api');
console.log('  2. Terminal B: npm run dev:host');
console.log('  3. Terminal C: npm run tunnel');
console.log('  4. Copie a URL https://....loca.lt no celular');
console.log('  5. Firebase Console → Authentication → Authorized domains');
console.log('     adicione o domínio do túnel (ex: xyz.loca.lt)');
console.log('');
console.log('Dica: adicione à tela inicial do celular (Chrome → menu →');
console.log('      "Adicionar à tela inicial") para abrir como app.');
console.log('══════════════════════════════════════════════════════');
console.log('');
