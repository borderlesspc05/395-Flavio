import { Router, Request, Response, NextFunction } from 'express';
import { logActivity } from '../services/activities';
import { triggerInitialFormIndex } from '../services/ragHooks';
import { reindexUserCorpus } from '../services/ragReindex';
import { isRagEnabled, isRagVectorConfigured } from '../services/ragConfig';
import { buildMidKpiRagInsights, type MidKpiId } from '../services/midKpiInsights';

const router = Router();

const VALID_KPI_IDS = new Set<MidKpiId>([
  'evolution-index',
  'action-velocity',
  'momentum-score',
  'business-impact',
  'sustainability-score',
]);

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

/** Insights diários dos KPIs do Intelligence Dashboard a partir do corpus RAG do usuário. */
router.post('/kpi-insights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawIds = Array.isArray(req.body?.kpiIds) ? req.body.kpiIds : undefined;
    const kpiIds = rawIds
      ?.map((id: unknown) => String(id))
      .filter((id: string): id is MidKpiId => VALID_KPI_IDS.has(id as MidKpiId));

    const insights = await buildMidKpiRagInsights(req.userId, kpiIds);
    res.json({
      ok: true,
      ragEnabled: isRagEnabled(),
      vectorConfigured: isRagVectorConfigured(),
      generatedAt: new Date().toISOString(),
      insights,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
