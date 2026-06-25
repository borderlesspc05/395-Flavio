import { Router, Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import { getAdminDashboardData } from '../services/adminDashboard';
import { getAdminUserDetail } from '../services/adminUserDetail';
import { getAdminRequestLogsPage } from '../services/adminRequestLogs';
import {
  getPlanSettings,
  savePlanSettings,
  validatePlanSettingsInput,
} from '../services/adminSettings';
import { getAdminNotifications } from '../services/adminNotifications';
import { adminCreateUser, adminUpdateUserAccess } from '../services/adminUsers';
import {
  appendAdminMessage,
  listSupportTickets,
  markAllReadByAdmin,
  markReadByAdmin,
  setTicketStatus,
} from '../services/supportChat';
import { getById } from '../services/storage';
import { COLLECTIONS } from '../config/env';
import type { SupportTicket } from '../services/supportChat';

const router = Router();

router.use(requireAdmin);

router.get('/notifications', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getAdminNotifications();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminCreateUser({
      email: String(req.body?.email ?? ''),
      password: String(req.body?.password ?? ''),
      displayName: typeof req.body?.displayName === 'string' ? req.body.displayName : undefined,
      planId: String(req.body?.planId ?? ''),
      concurrencyLimit: req.body?.concurrencyLimit,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.patch('/users/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await adminUpdateUserAccess(String(req.params.userId), {
      planId: typeof req.body?.planId === 'string' ? req.body.planId : undefined,
      concurrencyLimit: req.body?.concurrencyLimit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getAdminDashboardData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getAdminRequestLogsPage({
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      type: typeof req.query.type === 'string' ? req.query.type : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      errorsOnly: req.query.errorsOnly === '1' || req.query.errorsOnly === 'true',
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/users/:userId/detail', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const detail = await getAdminUserDetail(String(req.params.userId));
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

router.get('/settings/plans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await getPlanSettings();
    res.json({ plans });
  } catch (err) {
    next(err);
  }
});

router.put('/settings/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patch = validatePlanSettingsInput(req.body);
    const plans = await savePlanSettings(patch);
    res.json({ plans });
  } catch (err) {
    next(err);
  }
});

router.get('/support/tickets', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tickets = await listSupportTickets();
    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

router.get('/support/tickets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketId = String(req.params.id);
    const ticket = await getById<SupportTicket>(COLLECTIONS.supportTickets, ticketId);
    if (!ticket) {
      res.status(404).json({ error: 'Conversa não encontrada.' });
      return;
    }
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

router.post('/support/tickets/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticketId = String(req.params.id);
    const body = String(req.body?.body ?? '');
    const ticket = await appendAdminMessage(ticketId, body, req.adminEmail ?? 'admin');
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

router.post('/support/read-all', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await markAllReadByAdmin();
    res.json({ updated });
  } catch (err) {
    next(err);
  }
});

router.post('/support/tickets/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await markReadByAdmin(String(req.params.id));
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

router.patch('/support/tickets/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.body?.status === 'closed' ? 'closed' : 'open';
    const ticket = await setTicketStatus(String(req.params.id), status);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

export default router;
