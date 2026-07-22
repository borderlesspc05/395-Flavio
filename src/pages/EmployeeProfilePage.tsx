import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import {
  memberPortalApi,
  type MemberPortalPayload,
  type MemberPortalProgress,
  type MemberPortalTask,
} from '../services/memberPortalApi';

const PROGRESS_OPTIONS: MemberPortalProgress[] = [0, 25, 50, 75, 100];

function tokenStorageKey(memberId: string) {
  return `mm-member-portal-token:${memberId}`;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function EmployeeProfilePage() {
  const { memberId: routeMemberId } = useParams<{ memberId: string }>();
  const [searchParams] = useSearchParams();
  const memberId = routeMemberId?.trim() || '';

  const urlToken = searchParams.get('token')?.trim() || '';
  const [token, setToken] = useState(() => {
    if (urlToken) return urlToken;
    if (!memberId) return '';
    try {
      return sessionStorage.getItem(tokenStorageKey(memberId)) || '';
    } catch {
      return '';
    }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<MemberPortalPayload | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId || !urlToken) return;
    setToken(urlToken);
    try {
      sessionStorage.setItem(tokenStorageKey(memberId), urlToken);
    } catch {
      /* ignore */
    }
  }, [memberId, urlToken]);

  const load = useCallback(async () => {
    if (!memberId) {
      setError('Link incompleto. Peça ao gestor um novo convite.');
      setLoading(false);
      return;
    }
    if (!token) {
      setError('Este link precisa do token de acesso. Peça ao gestor o link completo do portal.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await memberPortalApi.load(memberId, token);
      setPayload(data);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setError('Link inválido ou expirado. Peça ao gestor um novo acesso.');
      } else if (status === 404) {
        setError('Membro não encontrado.');
      } else {
        setError('Não foi possível carregar suas ações. Tente de novo em instantes.');
      }
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [memberId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const tasks = payload?.tasks ?? [];
  const avgProgress = useMemo(() => {
    if (tasks.length === 0) return 0;
    return Math.round(tasks.reduce((sum, t) => sum + t.progresso, 0) / tasks.length);
  }, [tasks]);

  const updateProgress = async (task: MemberPortalTask, progresso: MemberPortalProgress) => {
    if (!memberId || !token) return;
    setSavingId(task.itemId);
    setSavedId(null);
    try {
      const { task: updated } = await memberPortalApi.updateProgress(memberId, token, {
        canvasId: task.canvasId,
        deliveryId: task.deliveryId,
        itemId: task.itemId,
        progresso,
      });
      setPayload((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) =>
                t.itemId === updated.itemId && t.canvasId === updated.canvasId ? updated : t
              ),
            }
          : prev
      );
      setSavedId(task.itemId);
    } catch {
      setError('Não foi possível salvar o progresso desta ação.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="member-portal-page">
      <div className="member-portal-bg" aria-hidden />
      <div className="member-portal-shell">
        <header className="member-portal-top">
          <div className="member-portal-brand">
            <span className="member-portal-mark">M</span>
            <span>Sprint · Minhas ações</span>
          </div>
          <span className="member-portal-badge">Acesso do colaborador</span>
        </header>

        {loading ? (
          <div className="member-portal-state">
            <Loader2 className="spin" size={28} aria-hidden />
            <p>Carregando suas ações…</p>
          </div>
        ) : error && !payload ? (
          <div className="member-portal-state">
            <p className="member-portal-error">{error}</p>
            <Link to="/" className="member-portal-ghost">
              Ir para o início
            </Link>
          </div>
        ) : payload ? (
          <>
            <section className="member-portal-hero">
              <div className="member-portal-avatar" aria-hidden>
                {initials(payload.member.name)}
              </div>
              <div className="member-portal-hero-copy">
                <h1>Olá, {payload.member.name.split(' ')[0]}</h1>
                <p>
                  {payload.member.role}
                  {payload.member.department ? ` · ${payload.member.department}` : ''}
                </p>
                <p className="member-portal-hero-hint">
                  Você vê apenas o que o gestor atribuiu a você. Atualize o progresso das suas ações.
                </p>
              </div>
              <div className="member-portal-meter" aria-label={`Progresso médio ${avgProgress}%`}>
                <div className="member-portal-meter__lede">
                  <span>Seu progresso</span>
                  <strong>
                    {avgProgress}
                    <span>%</span>
                  </strong>
                </div>
                <div className="member-portal-meter__track">
                  <div
                    className="member-portal-meter__fill"
                    style={{ width: `${avgProgress}%` }}
                  />
                </div>
                <p>
                  {tasks.length} {tasks.length === 1 ? 'ação' : 'ações'} atribuídas
                </p>
              </div>
            </section>

            {error ? <p className="member-portal-inline-error">{error}</p> : null}

            <section className="member-portal-tasks">
              <h2>Ações atribuídas a você</h2>
              {tasks.length === 0 ? (
                <div className="member-portal-empty">
                  <p>Nenhuma ação no check-list com o seu nome ainda.</p>
                  <p>Quando o gestor te atribuir uma tarefa na Execução, ela aparece aqui.</p>
                </div>
              ) : (
                <ul className="member-portal-task-list">
                  {tasks.map((task) => (
                    <li key={`${task.canvasId}-${task.itemId}`} className="member-portal-task">
                      <div className="member-portal-task__meta">
                        <span className="member-portal-task__initiative">{task.initiative}</span>
                        <span className="member-portal-task__delivery">{task.deliveryTitle}</span>
                      </div>
                      <h3>{task.texto}</h3>
                      <div className="member-portal-task__row">
                        <label>
                          <span>Progresso</span>
                          <select
                            value={task.progresso}
                            disabled={savingId === task.itemId}
                            onChange={(e) =>
                              void updateProgress(
                                task,
                                Number(e.target.value) as MemberPortalProgress
                              )
                            }
                          >
                            {PROGRESS_OPTIONS.map((p) => (
                              <option key={p} value={p}>
                                {p}%
                              </option>
                            ))}
                          </select>
                        </label>
                        {task.prazo ? (
                          <p className="member-portal-task__prazo">Prazo: {task.prazo}</p>
                        ) : null}
                        <span className="member-portal-task__status" aria-live="polite">
                          {savingId === task.itemId ? (
                            <>
                              <Loader2 size={14} className="spin" aria-hidden /> Salvando…
                            </>
                          ) : savedId === task.itemId ? (
                            <>
                              <CheckCircle2 size={14} aria-hidden /> Salvo
                            </>
                          ) : (
                            <>
                              <Save size={14} aria-hidden /> Atualiza ao mudar
                            </>
                          )}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
