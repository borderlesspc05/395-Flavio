import { Router, Request, Response, NextFunction } from 'express';
import { logActivity } from '../services/activities';
import { triggerInitialFormIndex } from '../services/ragHooks';
import { reindexUserCorpus } from '../services/ragReindex';
import { isRagEnabled, isRagVectorConfigured } from '../services/ragConfig';

const router = Router();

router.post('/reindex', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await reindexUserCorpus(req.userId);

    await logActivity(req.userId, 'rag', 'Corpus RAG reindexado manualmente', {
      entidade: 'rag',
      metadata: {
        indexedDocuments: result.indexedDocuments,
        errors: result.errors,
      },
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/** Dispara indexação do diagnóstico / domainWaveData após save no Firestore (client-side). */
router.post('/index-initial-form', async (req: Request, res: Response, next: NextFunction) => {
  try {
    triggerInitialFormIndex(req.userId);
    res.json({
      ok: true,
      userId: req.userId,
      message: 'Indexação do diagnóstico enfileirada.',
      ragEnabled: isRagEnabled(),
      vectorConfigured: isRagVectorConfigured(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
