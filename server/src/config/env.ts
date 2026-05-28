import path from 'path';
import dotenv from 'dotenv';

// Prioriza sempre o .env da pasta server, independente do cwd usado para iniciar o processo.
const serverEnvPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: serverEnvPath, override: true });
// Mantém fallback para variáveis já injetadas pelo ambiente/shell.
dotenv.config();

/** Normaliza FIREBASE_PRIVATE_KEY colada no Render/Netlify (aspas, \\n, quebras reais). */
function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  let key = raw.trim();
  // BOM (alguns editores ao colar no painel)
  if (key.charCodeAt(0) === 0xfeff) {
    key = key.slice(1).trim();
  }
  // Aspas curvas / tipográficas → ASCII (quebram o PEM)
  key = key.replace(/[\u201c\u201d\u201e]/g, '"').replace(/[\u2018\u2019]/g, "'");
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // JSON duplo: "\\n" ainda como dois caracteres após primeira passada
  if (!key.includes('\n') && key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }
  return key.trim();
}

function parseCorsOrigins(): string | string[] {
  const raw = process.env.CORS_ORIGIN ?? '*';
  if (raw === '*') return '*';
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

export const env = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: parseCorsOrigins(),
  axiosTimeout: parseInt(process.env.AXIOS_TIMEOUT ?? '90000', 10),
  chatTimeout: parseInt(process.env.CHAT_TIMEOUT ?? '120000', 10),
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY?.trim() || undefined,
    defaultModel: process.env.OPENROUTER_DEFAULT_MODEL ?? 'openai/gpt-4o-mini',
    siteUrl: process.env.OPENROUTER_SITE_URL ?? 'https://magnusmind.app',
    appName: process.env.OPENROUTER_APP_NAME ?? 'Magnus Mind',
  },
  serperApiKey: process.env.SERPER_API_KEY,
  tavilyApiKey: process.env.TAVILY_API_KEY,
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN,
    phoneId: process.env.WHATSAPP_PHONE_ID,
  },
};

export const COLLECTIONS = {
  objectives: 'objectives',
  teamMembers: 'teamMembers',
  conversations: 'conversations',
  reports: 'reports',
  activities: 'activities',
  consultantFrameworks: 'consultantFrameworks',
  agentSettings: 'agentSettings',
  agentSkills: 'agentSkills',
} as const;
