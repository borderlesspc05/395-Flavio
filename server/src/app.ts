import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { resolveUserId } from './middleware/userId';
import { errorHandler } from './middleware/errorHandler';
import { initFirebase } from './services/firebase';
import { isFirebaseEnabled } from './services/firebase';
import { seedDefaultFrameworks } from './services/rag';

import objectivesRouter from './routes/objectives';
import actionCanvasesRouter from './routes/actionCanvases';
import teamMembersRouter from './routes/teamMembers';
import activitiesRouter from './routes/activities';
import aiRouter from './routes/ai';
import agentRouter from './routes/agent';
import reportsRouter from './routes/reports';
import whatsappRouter from './routes/whatsapp';
import magnusMemoryRouter from './routes/magnusMemory';
import billingRouter, { billingWebhookHandler } from './routes/billing';
import adminRouter from './routes/admin';
import publicPlansRouter from './routes/publicPlans';
import workspaceRouter from './routes/workspace';
import { requestLogger } from './middleware/requestLogger';
import { getLlmStatus } from './services/llm';

initFirebase();

const app = express();

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);

/** Stripe webhook precisa do body bruto (antes do express.json) */
app.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  billingWebhookHandler
);

app.use(express.json({ limit: '2mb' }));

const healthPayload = () => ({
  status: 'ok',
  service: 'Magnus Mind API',
  storage: isFirebaseEnabled() ? 'firestore' : 'memory',
  ai: getLlmStatus(),
  timestamp: new Date().toISOString(),
});

app.get('/api/health', (_req, res) => res.json(healthPayload()));
app.get('/health', (_req, res) => res.json(healthPayload()));

app.get('/', (_req, res) => {
  res.json({
    name: 'Magnus Mind API',
    status: 'ok',
    version: '1.0.0',
    storage: isFirebaseEnabled() ? 'firestore' : 'memory',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      ai: '/api/ai',
      objectives: '/api/objectives',
      actionCanvases: '/api/action-canvases',
      reports: '/api/reports',
    },
    note: 'Esta URL é a API. O app web está no Netlify (frontend).',
  });
});

app.use(resolveUserId);
app.use(requestLogger);

app.use('/api/plans', publicPlansRouter);
app.use('/api/admin', adminRouter);
app.use('/api/billing', billingRouter);
app.use('/api/objectives', objectivesRouter);
app.use('/api/action-canvases', actionCanvasesRouter);
app.use('/api/team-members', teamMembersRouter);
app.use('/api/activities', activitiesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/magnus-memory', magnusMemoryRouter);
app.use('/api/agent', agentRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/workspace', workspaceRouter);

app.use((_req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Rota ${_req.method} ${_req.path} não existe.`,
    hint: 'Use rotas que começam com /api (ex.: /api/health, /api/ai/models).',
  });
});

app.use(errorHandler);

/** Seed RAG frameworks on startup (non-blocking) */
seedDefaultFrameworks('system').catch((err) => {
  console.warn('[rag] seed skipped:', err);
});

export default app;
