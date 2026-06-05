import { Router, Request, Response, NextFunction } from 'express';
import { Conversation } from '../types';
import { AppError } from '../utils/errors';
import { listByUser, getById, update, COLLECTIONS } from '../services/storage';
import { getAiModels, getLlmStatus } from '../services/llm';
import { handleChat } from '../services/aiChat';
import { runBlueprintGateSuggestion } from '../services/blueprintGate';
import { withConcurrencyLimit } from '../services/concurrency';

const router = Router();

router.get('/models', (_req: Request, res: Response) => {
  res.json(getAiModels());
});

router.get('/status', (_req: Request, res: Response) => {
  res.json(getLlmStatus());
});

router.get('/conversations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await listByUser<Conversation>(COLLECTIONS.conversations, req.userId);
    const summary = items.map((c) => ({
      id: c.id,
      title: c.title,
      model: c.model,
      messageCount: c.messages?.length ?? 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

router.get('/conversations/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const convId = String(req.params.id);
    const conv = await getById<Conversation>(COLLECTIONS.conversations, convId);
    if (!conv || conv.userId !== req.userId) {
      throw new AppError(404, 'Conversation not found');
    }
    res.json(conv);
  } catch (err) {
    next(err);
  }
});

/** Gate Zero — não persiste conversa; só retorna classificação sugerida */
router.post('/blueprint-gate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { diagnosticContext } = req.body;
    if (!diagnosticContext || typeof diagnosticContext !== 'string') {
      throw new AppError(400, 'diagnosticContext is required');
    }
    const result = await withConcurrencyLimit(req.userId, () =>
      runBlueprintGateSuggestion({ diagnosticContext })
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId, model, suggestObjectives, diagnosticContext, gateContext } = req.body;
    const message = req.body.message ?? req.body.content;

    if (!message || typeof message !== 'string') {
      throw new AppError(400, 'content is required');
    }

    const result = await withConcurrencyLimit(req.userId, () =>
      handleChat({
        userId: req.userId,
        message,
        conversationId,
        model,
        diagnosticContext: typeof diagnosticContext === 'string' ? diagnosticContext : undefined,
        gateContext: typeof gateContext === 'string' ? gateContext : undefined,
        suggestObjectives: Boolean(suggestObjectives),
      })
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.patch('/conversations/:id/model', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const convId = String(req.params.id);
    const { model } = req.body;
    if (!model) throw new AppError(400, 'model is required');

    const conv = await getById<Conversation>(COLLECTIONS.conversations, convId);
    if (!conv || conv.userId !== req.userId) {
      throw new AppError(404, 'Conversation not found');
    }

    const updated = await update<Conversation>(COLLECTIONS.conversations, convId, {
      model: String(model),
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch('/conversations/:id/title', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const convId = String(req.params.id);
    const { title } = req.body;
    if (!title) throw new AppError(400, 'title is required');

    const conv = await getById<Conversation>(COLLECTIONS.conversations, convId);
    if (!conv || conv.userId !== req.userId) {
      throw new AppError(404, 'Conversation not found');
    }

    const updated = await update<Conversation>(COLLECTIONS.conversations, convId, {
      title: String(title),
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
