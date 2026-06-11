import { FormEvent, useState } from 'react';
import { Save, UserPlus } from 'lucide-react';
import { adminApi, type AdminUserRow } from '../../services/adminApi';
import type { PlanId } from '../../constants/plans';
import { PLAN_LABELS } from '../../constants/plans';

const PLAN_IDS: PlanId[] = ['starter', 'advanced', 'premium'];

type Props = {
  users: AdminUserRow[];
  onRefresh: () => void;
};

function defaultConcurrencyForPlan(planId: PlanId): string {
  if (planId === 'starter') return '1';
  if (planId === 'advanced') return '3';
  return '';
}

export function AdminUsersPanel({ users, onRefresh }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [createPlan, setCreatePlan] = useState<PlanId>('starter');
  const [createLimit, setCreateLimit] = useState('1');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  const [edits, setEdits] = useState<Record<string, { planId: PlanId; limit: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState('');

  const handleCreatePlanChange = (planId: PlanId) => {
    setCreatePlan(planId);
    setCreateLimit(defaultConcurrencyForPlan(planId));
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    setCreateSuccess('');
    try {
      await adminApi.createUser({
        email,
        password,
        displayName: displayName.trim() || undefined,
        planId: createPlan,
        concurrencyLimit: createLimit.trim() === '' ? null : createLimit.trim(),
      });
      setCreateSuccess('Usuário criado com sucesso.');
      setEmail('');
      setPassword('');
      setDisplayName('');
      onRefresh();
    } catch (err: unknown) {
      setCreateError(extractError(err) ?? 'Não foi possível criar o usuário.');
    } finally {
      setCreating(false);
    }
  };

  const getEdit = (user: AdminUserRow) => {
    const existing = edits[user.userId];
    if (existing) return existing;
    const planId = (user.planId as PlanId) || 'starter';
    const limit =
      user.concurrencyLimit === null
        ? ''
        : String(user.concurrencyLimit ?? defaultConcurrencyForPlan(planId));
    return { planId, limit };
  };

  const setEdit = (userId: string, patch: Partial<{ planId: PlanId; limit: string }>) => {
    setEdits((prev) => {
      const user = users.find((u) => u.userId === userId);
      const base = user ? getEdit(user) : { planId: 'starter' as PlanId, limit: '1' };
      return { ...prev, [userId]: { ...base, ...patch } };
    });
  };

  const handleSaveUser = async (userId: string) => {
    const user = users.find((u) => u.userId === userId);
    if (!user) return;
    const edit = getEdit(user);
    setSavingId(userId);
    setRowError('');
    try {
      await adminApi.updateUserAccess(userId, {
        planId: edit.planId,
        concurrencyLimit: edit.limit.trim() === '' ? null : edit.limit.trim(),
      });
      onRefresh();
    } catch (err: unknown) {
      setRowError(extractError(err) ?? 'Falha ao salvar alterações.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="admin-users-panel">
      <section className="admin-card admin-card--nested">
        <header className="admin-card-head">
          <h2>Criar conta manualmente</h2>
          <p>Para clientes sem checkout Stripe — define plano e requisições simultâneas</p>
        </header>
        <form className="admin-users-create-form" onSubmit={(e) => void handleCreate(e)}>
          <label>
            Nome
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nome exibido"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Senha inicial
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <label>
            Plano
            <select
              value={createPlan}
              onChange={(e) => handleCreatePlanChange(e.target.value as PlanId)}
            >
              {PLAN_IDS.map((id) => (
                <option key={id} value={id}>
                  {PLAN_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Requisições simultâneas
            <input
              type="text"
              value={createLimit}
              onChange={(e) => setCreateLimit(e.target.value)}
              placeholder="1, 3 ou vazio = ilimitado"
            />
          </label>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={creating}>
            <UserPlus size={16} />
            {creating ? 'Criando…' : 'Criar usuário'}
          </button>
        </form>
        {createError && (
          <p className="admin-error" role="alert">
            {createError}
          </p>
        )}
        {createSuccess && (
          <p className="admin-success" role="status">
            {createSuccess}
          </p>
        )}
      </section>

      <section className="admin-card">
        <header className="admin-card-head">
          <h2>Pessoas que usam o app</h2>
          <p>Plano, limite de requisições paralelas e volume de uso</p>
        </header>
        {rowError && (
          <p className="admin-error" role="alert">
            {rowError}
          </p>
        )}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nome</th>
                <th>Plano</th>
                <th>Simultâneas</th>
                <th>Status</th>
                <th>Uso</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhum usuário registrado ainda.</td>
                </tr>
              ) : (
                users.map((u) => {
                  const edit = getEdit(u);
                  return (
                    <tr key={u.userId}>
                      <td>{u.email || '—'}</td>
                      <td>{u.displayName || '—'}</td>
                      <td>
                        <select
                          className="admin-inline-select"
                          value={edit.planId}
                          onChange={(e) => {
                            const planId = e.target.value as PlanId;
                            setEdit(u.userId, {
                              planId,
                              limit: defaultConcurrencyForPlan(planId),
                            });
                          }}
                        >
                          {PLAN_IDS.map((id) => (
                            <option key={id} value={id}>
                              {PLAN_LABELS[id]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          className="admin-inline-input"
                          type="text"
                          value={edit.limit}
                          onChange={(e) => setEdit(u.userId, { limit: e.target.value })}
                          placeholder="∞"
                          aria-label={`Limite simultâneo de ${u.email}`}
                        />
                      </td>
                      <td>
                        <span className={`admin-status-pill is-${u.subscriptionStatus}`}>
                          {u.subscriptionStatus}
                        </span>
                      </td>
                      <td>{u.requestCount}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn--ghost admin-btn--compact"
                          onClick={() => void handleSaveUser(u.userId)}
                          disabled={savingId === u.userId}
                        >
                          <Save size={14} />
                          {savingId === u.userId ? '…' : 'Salvar'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="admin-users-hint">
          Starter = 1 · Advanced = 3 · Premium = vazio (ilimitado). Assinaturas Stripe renovam
          automaticamente todo mês até o cliente cancelar no Stripe.
        </p>
      </section>
    </div>
  );
}

function extractError(err: unknown): string | undefined {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: { message?: string; error?: string } } }).response
      ?.data;
    return data?.message ?? data?.error;
  }
  return undefined;
}
