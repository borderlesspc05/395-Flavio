import { Router, Request, Response, NextFunction } from 'express';
import { Conversation } from '../types';
import { AppError } from '../utils/errors';
import { listByUser, getById, update, COLLECTIONS } from '../services/storage';
import { AI_MODELS } from '../services/openrouter';
import { handleChat } from '../services/aiChat';

const router = Router();

router.get('/models', (_req: Request, res: Response) => {
  res.json(AI_MODELS);
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

router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId, model, suggestObjectives } = req.body;
    const message = req.body.message ?? req.body.content;

    if (!message || typeof message !== 'string') {
      throw new AppError(400, 'content is required');
    }

    const result = await handleChat({
      userId: req.userId,
      message,
      conversationId,
      model,
      suggestObjectives: Boolean(suggestObjectives),
    });

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
