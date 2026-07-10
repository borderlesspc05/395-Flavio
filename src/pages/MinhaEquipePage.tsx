import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Plus,
  Star,
  Users,
  Pencil,
  Send,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  LineChart,
} from 'lucide-react';
import axios from 'axios';
import { Modal } from '../components/ui/Modal';
import { teamApi } from '../services/api';
import { useCycle } from '../context/CycleContext';
import type { DevelopmentTrend, TeamMember, TeamMemberDevelopmentEntry } from '../types';

type FormState = {
  name: string;
  email: string;
  role: string;
  department: string;
  phone: string;
  location: string;
  hireDate: string;
  status: TeamMember['status'];
  skills: string;
  performance: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  role: '',
  department: '',
  phone: '',
  location: '',
  hireDate: '',
  status: 'active',
  skills: '',
  performance: '75',
};

const STATUS_LABELS: Record<TeamMember['status'], string> = {
  active: 'Ativo',
  'on-leave': 'Licença',
  remote: 'Remoto',
};

const TREND_LABELS: Record<DevelopmentTrend, string> = {
  improved: 'Melhorou',
  declined: 'Piorou',
  stable: 'Estável',
};

function trendIcon(trend: DevelopmentTrend) {
  if (trend === 'improved') return TrendingUp;
  if (trend === 'declined') return TrendingDown;
  return Minus;
}

function formatCheckInDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return iso;
  }
}

function normalizeMember(raw: Record<string, unknown>): TeamMember {
  const ativo = raw.ativo !== false;
  return {
    id: String(raw.id),
    name: String(raw.name ?? raw.nome ?? ''),
    email: String(raw.email ?? ''),
    role: String(raw.role ?? raw.cargo ?? ''),
    department: raw.department ? String(raw.department) : raw.departamento ? String(raw.departamento) : undefined,
    phone: raw.phone ? String(raw.phone) : raw.telefone ? String(raw.telefone) : undefined,
    location: raw.location
      ? String(raw.location)
      : raw.localizacao
        ? String(raw.localizacao)
        : undefined,
    hireDate: raw.hireDate
      ? String(raw.hireDate)
      : raw.dataContratacao
        ? String(raw.dataContratacao)
        : undefined,
    status: (raw.status as TeamMember['status']) || (ativo ? 'active' : 'on-leave'),
    skills: Array.isArray(raw.skills) ? (raw.skills as string[]) : undefined,
    performance: typeof raw.performance === 'number' ? raw.performance : undefined,
    projectsCompleted: typeof raw.projectsCompleted === 'number' ? raw.projectsCompleted : undefined,
  };
}

function toApiPayload(form: FormState) {
  return {
    nome: form.name.trim(),
    cargo: form.role.trim(),
    email: form.email.trim() || undefined,
    telefone: form.phone.trim() || undefined,
    departamento: form.department.trim() || undefined,
    ativo: form.status === 'active' || form.status === 'remote',
    name: form.name.trim(),
    role: form.role.trim(),
    department: form.department.trim() || undefined,
    phone: form.phone.trim() || undefined,
    location: form.location.trim() || undefined,
    hireDate: form.hireDate || undefined,
    status: form.status,
    skills: form.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    performance: Number(form.performance) || 0,
  };
}

function performanceClass(value?: number) {
  if (!value) return 'medium';
  if (value >= 80) return 'high';
  if (value >= 50) return 'medium';
  return 'low';
}

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function MinhaEquipePage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [emailSendingId, setEmailSendingId] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [emailNoticeType, setEmailNoticeType] = useState<'success' | 'error' | 'demo'>('success');
  const [developmentByMember, setDevelopmentByMember] = useState<
    Record<string, TeamMemberDevelopmentEntry[]>
  >({});
  const [checkInMember, setCheckInMember] = useState<TeamMember | null>(null);
  const [checkInScore, setCheckInScore] = useState('75');
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkInSaving, setCheckInSaving] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const checkInSuccessTimerRef = useRef<number | null>(null);
  const { activeCycle } = useCycle();

  const loadDevelopment = useCallback(async (memberIds: string[]) => {
    if (memberIds.length === 0) {
      setDevelopmentByMember({});
      return;
    }
    const results = await Promise.allSettled(
      memberIds.map(async (id) => {
        const entries = await teamApi.listDevelopment(id);
        return [id, entries] as const;
      })
    );
    const map: Record<string, TeamMemberDevelopmentEntry[]> = {};
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const [id, entries] = result.value;
        map[id] = entries;
      }
    }
    setDevelopmentByMember(map);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamApi.list();
      const list = (Array.isArray(data) ? data : []).map((m: Record<string, unknown>) => normalizeMember(m));
      setMembers(list);
      void loadDevelopment(list.map((m) => m.id));
    } catch {
      setError('Não foi possível carregar a equipe.');
    } finally {
      setLoading(false);
    }
  }, [loadDevelopment]);

  useEffect(() => {
    load();
  }, [load]);

  const departments = useMemo(() => {
    const set = new Set(members.map((m) => m.department).filter(Boolean) as string[]);
    return ['todos', ...Array.from(set).sort()];
  }, [members]);

  const filtered = useMemo(() => {
    if (departmentFilter === 'todos') return members;
    return members.filter((m) => m.department === departmentFilter);
  }, [members, departmentFilter]);

  const stats = useMemo(() => {
    const active = members.filter((m) => m.status === 'active').length;
    const remote = members.filter((m) => m.status === 'remote').length;
    const avgPerf =
      members.length > 0
        ? Math.round(members.reduce((sum, m) => sum + (m.performance ?? 0), 0) / members.length)
        : 0;
    return { total: members.length, active, remote, avgPerf };
  }, [members]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (member: TeamMember) => {
    setEditing(member);
    setForm({
      name: member.name,
      email: member.email,
      role: member.role || '',
      department: member.department || '',
      phone: member.phone || '',
      location: member.location || '',
      hireDate: member.hireDate || '',
      status: member.status,
      skills: (member.skills || []).join(', '),
      performance: String(member.performance ?? 75),
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Nome é obrigatório';
    if (!form.role.trim()) errs.role = 'Cargo é obrigatório';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'E-mail inválido';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = toApiPayload(form);
      if (editing) {
        await teamApi.update(editing.id, payload);
      } else {
        await teamApi.create(payload);
      }
      setModalOpen(false);
      await load();
    } catch {
      setFormErrors({ submit: 'Erro ao salvar membro.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Remover este membro da equipe?')) return;
    try {
      await teamApi.remove(id);
      await load();
    } catch {
      setEmailNoticeType('error');
      setEmailNotice('Não foi possível remover o membro. Tente novamente.');
    }
  };

  const closeCheckIn = () => {
    if (checkInSaving) return;
    if (checkInSuccessTimerRef.current != null) {
      window.clearTimeout(checkInSuccessTimerRef.current);
      checkInSuccessTimerRef.current = null;
    }
    setCheckInMember(null);
    setCheckInSuccess(false);
    setCheckInError(null);
  };

  const openCheckIn = (member: TeamMember) => {
    setCheckInMember(member);
    setCheckInScore(String(member.performance ?? 75));
    setCheckInNotes('');
    setCheckInError(null);
    setCheckInSuccess(false);
  };

  const saveCheckIn = async () => {
    if (!checkInMember) return;
    const score = Number(checkInScore);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      setCheckInError('Informe uma nota entre 0 e 100.');
      return;
    }
    setCheckInSaving(true);
    setCheckInError(null);
    try {
      const result = await teamApi.addDevelopment(checkInMember.id, {
        score,
        notes: checkInNotes.trim() || undefined,
      });
      setDevelopmentByMember((prev) => ({
        ...prev,
        [checkInMember.id]: [result.entry, ...(prev[checkInMember.id] ?? [])],
      }));
      setMembers((prev) =>
        prev.map((m) =>
          m.id === checkInMember.id ? { ...m, performance: result.entry.score } : m
        )
      );
      setCheckInSuccess(true);
      if (checkInSuccessTimerRef.current != null) {
        window.clearTimeout(checkInSuccessTimerRef.current);
      }
      checkInSuccessTimerRef.current = window.setTimeout(() => {
        checkInSuccessTimerRef.current = null;
        setCheckInMember(null);
        setCheckInSuccess(false);
      }, 1400);
    } catch {
      setCheckInError('Não foi possível registrar o check-in.');
    } finally {
      setCheckInSaving(false);
    }
  };

  const sendDevelopmentEmail = async (member: TeamMember) => {
    if (!member.email?.trim()) {
      setEmailNotice('Cadastre o e-mail do membro para enviar o resumo de desenvolvimento.');
      return;
    }
    if (
      !window.confirm(
        `Enviar e-mail de desenvolvimento para ${member.name} (${member.email})? O membro verá destaques e pontos de melhoria ligados a ele.`
      )
    ) {
      return;
    }
    setEmailSendingId(member.id);
    setEmailNotice(null);
    try {
      const result = await teamApi.sendDevelopmentEmail(member.id);
      if (result.demoMode) {
        setEmailNoticeType('demo');
        setEmailNotice(
          `Modo demonstração: e-mail simulado para ${member.email}. Configure RESEND_API_KEY no servidor para envio real.`
        );
      } else {
        setEmailNoticeType('success');
        setEmailNotice(`E-mail enviado para ${member.email} com o panorama do ciclo ${activeCycle?.label ?? 'atual'}.`);
      }
    } catch (err) {
      setEmailNoticeType('error');
      const payload = axios.isAxiosError(err)
        ? (err.response?.data as { message?: string; error?: string; code?: string } | undefined)
        : undefined;
      const code = payload?.code;
      const detail = payload?.error || payload?.message || (err instanceof Error ? err.message : '');
      if (code === 'EMAIL_NOT_CONFIGURED') {
        setEmailNotice(
          detail ||
            'E-mail transacional não configurado. Defina RESEND_API_KEY no servidor ou remova a chave inválida para usar o modo demonstração.'
        );
      } else if (code === 'EMAIL_RECIPIENT_FORBIDDEN' || code === 'EMAIL_DOMAIN_NOT_VERIFIED') {
        setEmailNotice(detail || 'Configure e verifique seu domínio no Resend para enviar e-mails aos membros.');
      } else {
        setEmailNotice(
          detail
            ? detail.startsWith('Falha ao enviar') || detail.includes('Resend') || detail.includes('RESEND')
              ? detail
              : `Falha ao enviar e-mail: ${detail}`
            : 'Não foi possível enviar o e-mail. Verifique se o servidor está ativo e o membro pertence à sua conta.'
        );
      }
    } finally {
      setEmailSendingId(null);
    }
  };

  return (
    <div className="minha-equipe">
      <header className="equipe-header sprint-wave-header">
        <div className="sprint-wave-title-group">
          <div className="sprint-wave-icon-wrapper" aria-hidden>
            <Users size={26} />
          </div>
          <div className="sprint-wave-title-copy">
            <span className="equipe-header-kicker sprint-wave-eyebrow">SPRINT WAVES™ · Onda 3</span>
            <h1 className="sprint-wave-title">Equipe</h1>
            <p className="sprint-wave-subtitle">
              Vincule donos, envie desenvolvimento por e-mail e alinhe entregas ao ciclo{' '}
              <strong>{activeCycle?.label ?? 'atual'}</strong>.
            </p>
          </div>
        </div>
        <div
          className="equipe-header-progress design-plans-progress sprint-wave-side"
          aria-label={`${stats.total} membros na equipe`}
        >
          <strong>{stats.total}</strong>
          <span>membros</span>
        </div>
      </header>

      {emailNotice && (
        <p className={`equipe-email-notice is-${emailNoticeType}`} role="status">
          {emailNotice}
        </p>
      )}

      <div className="equipe-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper primary">
            <Users size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper success">
            <Briefcase size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Ativos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper info">
            <MapPin size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.remote}</div>
            <div className="stat-label">Remotos</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper warning">
            <Star size={24} />
          </div>
          <div>
            <div className="stat-value">{stats.avgPerf}%</div>
            <div className="stat-label">Desempenho médio</div>
          </div>
        </div>
      </div>

      <section className="equipe-section">
        <div className="section-header">
          <h2 className="section-title">Membros da equipe</h2>
          <div className="section-actions">
            <button type="button" className="add-member-button" onClick={openCreate}>
              <Plus size={20} />
              Adicionar membro
            </button>
            <select
              className="filter-select"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === 'todos' ? 'Todos os departamentos' : d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <Loader2 className="spinner" size={32} />
            <span>Carregando equipe...</span>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button type="button" className="retry-button" onClick={load}>
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Users size={48} />
            <h3>Nenhum membro encontrado</h3>
            <p>Adicione o primeiro membro da sua equipe.</p>
          </div>
        ) : (
          <div className="members-grid">
            {filtered.map((member) => {
              const perfClass = performanceClass(member.performance);
              const devEntries = developmentByMember[member.id] ?? [];
              const latestDev = devEntries[0];
              const TrendIcon = latestDev ? trendIcon(latestDev.trend) : LineChart;
              return (
                <article key={member.id} className="member-card">
                  <div className="member-card-header">
                    <div className="member-avatar">{initials(member.name)}</div>
                    <div className="member-header-info">
                      <h3 className="member-name">{member.name}</h3>
                      <p className="member-role">{member.role}</p>
                    </div>
                    <button type="button" className="member-menu-button" aria-label="Menu">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                  <div className="member-card-body">
                    {member.department && (
                      <div className="member-info-row">
                        <Briefcase size={14} />
                        <span className="member-department">{member.department}</span>
                      </div>
                    )}
                    {member.email && (
                      <div className="member-info-row">
                        <Mail size={14} />
                        <span>{member.email}</span>
                      </div>
                    )}
                    {member.phone && (
                      <div className="member-info-row">
                        <Phone size={14} />
                        <span>{member.phone}</span>
                      </div>
                    )}
                    {member.location && (
                      <div className="member-info-row">
                        <MapPin size={14} />
                        <span className="member-location">{member.location}</span>
                      </div>
                    )}
                    {member.hireDate && (
                      <div className="member-info-row">
                        <Calendar size={14} />
                        <span className="member-hire-date">
                          {new Date(member.hireDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                  </div>
                  {member.performance != null && (
                    <div className="member-performance">
                      <div className="performance-header">
                        <span className="performance-label">Desempenho</span>
                        <span className={`performance-value ${perfClass}`}>{member.performance}%</span>
                      </div>
                      <div className="performance-bar">
                        <div
                          className={`performance-fill ${perfClass}`}
                          style={{ width: `${member.performance}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="member-development">
                    <div className="member-development-header">
                      <div className="member-development-title">
                        <LineChart size={14} aria-hidden />
                        <span>Evolução</span>
                        {latestDev && (
                          <span className={`dev-trend dev-trend--${latestDev.trend}`}>
                            <TrendIcon size={12} aria-hidden />
                            {TREND_LABELS[latestDev.trend]}
                            {latestDev.delta != null && latestDev.delta !== 0 && (
                              <span className="dev-trend-delta">
                                {latestDev.delta > 0 ? '+' : ''}
                                {latestDev.delta}%
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="dev-checkin-button"
                        onClick={() => openCheckIn(member)}
                      >
                        Registrar
                      </button>
                    </div>
                    {devEntries.length > 0 ? (
                      <ul className="member-development-timeline">
                        {devEntries.slice(0, 4).map((entry) => {
                          const EntryTrendIcon = trendIcon(entry.trend);
                          return (
                            <li key={entry.id} className="dev-timeline-item">
                              <span className="dev-timeline-date">{formatCheckInDate(entry.createdAt)}</span>
                              <span className="dev-timeline-score">{entry.score}%</span>
                              <span className={`dev-timeline-trend dev-trend--${entry.trend}`}>
                                <EntryTrendIcon size={11} aria-hidden />
                              </span>
                              {entry.notes && <span className="dev-timeline-notes">{entry.notes}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="member-development-empty">
                        Nenhum check-in ainda. Registre a evolução para acompanhar melhorias ao longo do tempo.
                      </p>
                    )}
                  </div>
                  {member.skills && member.skills.length > 0 && (
                    <div className="member-skills">
                      <span className="skills-label">Habilidades</span>
                      <div className="skills-tags">
                        {member.skills.slice(0, 4).map((skill) => (
                          <span key={skill} className="skill-tag">
                            {skill}
                          </span>
                        ))}
                        {member.skills.length > 4 && (
                          <span className="skill-tag more">+{member.skills.length - 4}</span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="member-card-footer">
                    <span
                      className={`status-badge ${
                        member.status === 'active' ? 'success' : member.status === 'remote' ? 'info' : 'warning'
                      }`}
                    >
                      {STATUS_LABELS[member.status]}
                    </span>
                    <div className="member-actions">
                      <button
                        type="button"
                        className="action-button"
                        onClick={() => sendDevelopmentEmail(member)}
                        disabled={emailSendingId === member.id}
                        aria-label="Enviar e-mail de desenvolvimento"
                        title={
                          member.email
                            ? 'Enviar resumo de desenvolvimento por e-mail'
                            : 'Cadastre o e-mail do membro'
                        }
                      >
                        {emailSendingId === member.id ? (
                          <Loader2 size={16} className="spinner" />
                        ) : (
                          <Send size={16} />
                        )}
                      </button>
                      <button type="button" className="action-button" onClick={() => openEdit(member)} aria-label="Editar">
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="action-button danger"
                        onClick={() => remove(member.id)}
                        aria-label="Remover"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        open={!!checkInMember}
        onClose={closeCheckIn}
        title={checkInMember ? `Check-in · ${checkInMember.name}` : 'Check-in'}
        size="compact"
        dismissLocked={checkInSaving || checkInSuccess}
      >
        {checkInSuccess ? (
          <div className="membro-modal-success" role="status">
            <span className="membro-modal-success-icon" aria-hidden>
              <CheckCircle2 size={40} />
            </span>
            <p className="membro-modal-success-title">Check-in registrado</p>
            <p className="membro-modal-success-copy">
              A evolução foi salva e comparada com o último registro.
            </p>
          </div>
        ) : (
          <form
            className="membro-modal-form membro-modal-form--checkin"
            onSubmit={(e) => {
              e.preventDefault();
              void saveCheckIn();
            }}
          >
            <p className="membro-modal-hint">
              Registre a nota atual e observações. O sistema compara com o último check-in e indica se o membro
              melhorou, piorou ou manteve o ritmo.
            </p>
            {checkInError && (
              <p className="membro-field-error" role="alert">
                {checkInError}
              </p>
            )}
            <div className="membro-form-field">
              <label htmlFor="checkin-score">Nota de desempenho (%)</label>
              <input
                id="checkin-score"
                type="number"
                min={0}
                max={100}
                inputMode="numeric"
                value={checkInScore}
                onChange={(e) => setCheckInScore(e.target.value)}
                disabled={checkInSaving}
              />
            </div>
            <div className="membro-form-field">
              <label htmlFor="checkin-notes">Observações</label>
              <textarea
                id="checkin-notes"
                rows={3}
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                placeholder="Destaques, pontos de atenção, próximos passos..."
                disabled={checkInSaving}
              />
            </div>
            <div className="membro-modal-actions">
              <button
                type="button"
                className="membro-button-secondary"
                onClick={closeCheckIn}
                disabled={checkInSaving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="membro-button-primary membro-button-primary--bronze"
                disabled={checkInSaving}
              >
                {checkInSaving ? (
                  <>
                    <Loader2 size={16} className="spinner" aria-hidden />
                    Salvando...
                  </>
                ) : (
                  'Salvar check-in'
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar membro' : 'Adicionar membro'}
        dismissLocked={saving}
      >
        <form
          className="membro-modal-shell"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="membro-modal-form">
              {formErrors.submit && <p className="field-error">{formErrors.submit}</p>}
              <p className="membro-modal-hint">
                O e-mail é usado para enviar o resumo de desenvolvimento ligado ao ciclo ativo.
              </p>
              <div className="membro-form-row">
                <div className="membro-form-field">
                  <label>
                    Nome <span className="required">*</span>
                  </label>
                  <input
                    className={formErrors.name ? 'error' : ''}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                </div>
                <div className="membro-form-field">
                  <label>E-mail</label>
                  <input
                    type="email"
                    className={formErrors.email ? 'error' : ''}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                  {formErrors.email && <span className="field-error">{formErrors.email}</span>}
                </div>
              </div>
              <div className="membro-form-row">
                <div className="membro-form-field">
                  <label>
                    Cargo <span className="required">*</span>
                  </label>
                  <input
                    className={formErrors.role ? 'error' : ''}
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  />
                  {formErrors.role && <span className="field-error">{formErrors.role}</span>}
                </div>
                <div className="membro-form-field">
                  <label>Departamento</label>
                  <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                </div>
              </div>
              <div className="membro-form-row">
                <div className="membro-form-field">
                  <label>Telefone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="membro-form-field">
                  <label>Localização</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
              </div>
              <div className="membro-form-row">
                <div className="membro-form-field">
                  <label>Data de contratação</label>
                  <input
                    type="date"
                    value={form.hireDate}
                    onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                  />
                </div>
                <div className="membro-form-field">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as TeamMember['status'] })}
                  >
                    <option value="active">Ativo</option>
                    <option value="remote">Remoto</option>
                    <option value="on-leave">Licença</option>
                  </select>
                </div>
              </div>
              <div className="membro-form-row">
                <div className="membro-form-field">
                  <label>Habilidades (separadas por vírgula)</label>
                  <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
                </div>
                <div className="membro-form-field">
                  <label>Desempenho (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.performance}
                    onChange={(e) => setForm({ ...form, performance: e.target.value })}
                  />
                </div>
              </div>
          </div>
          <div className="membro-modal-actions">
            <button
              type="button"
              className="membro-button-secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="membro-button-primary membro-button-primary--bronze"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="spinner" aria-hidden />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
