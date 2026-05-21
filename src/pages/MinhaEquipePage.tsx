import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Calendar,
  Loader2,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Plus,
  Star,
  Users,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { teamApi } from '../services/api';
import type { TeamMember } from '../types';

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

function normalizeMember(raw: Record<string, unknown>): TeamMember {
  const ativo = raw.ativo !== false;
  return {
    id: String(raw.id),
    name: String(raw.name ?? raw.nome ?? ''),
    email: String(raw.email ?? ''),
    role: String(raw.role ?? raw.cargo ?? ''),
    department: raw.department ? String(raw.department) : raw.departamento ? String(raw.departamento) : undefined,
    phone: raw.phone ? String(raw.phone) : raw.telefone ? String(raw.telefone) : undefined,
    location: raw.location ? String(raw.location) : undefined,
    hireDate: raw.hireDate ? String(raw.hireDate) : undefined,
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teamApi.list();
      const list = (Array.isArray(data) ? data : []).map((m: Record<string, unknown>) => normalizeMember(m));
      setMembers(list);
    } catch {
      setError('Não foi possível carregar a equipe.');
    } finally {
      setLoading(false);
    }
  }, []);

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
    await teamApi.remove(id);
    await load();
  };

  return (
    <div className="minha-equipe">
      <header className="equipe-header">
        <div className="header-content">
          <div className="header-title-group">
            <div className="header-icon-wrapper">
              <Users size={32} />
            </div>
            <div>
              <h1 className="equipe-title">Equipe · Difusão</h1>
              <p className="equipe-subtitle">
                Contexto humano para Make the Move — donos, ritmo e imprint na execução
              </p>
            </div>
          </div>
          <button type="button" className="add-member-button" onClick={openCreate}>
            <Plus size={20} />
            Adicionar membro
          </button>
        </div>
      </header>

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

      {modalOpen && (
        <div className="membro-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="membro-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="membro-modal-header">
              <h2 className="membro-modal-title">{editing ? 'Editar membro' : 'Adicionar membro'}</h2>
              <button type="button" className="membro-modal-close" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form
              className="membro-modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                save();
              }}
            >
              {formErrors.submit && <p className="field-error">{formErrors.submit}</p>}
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
              <div className="membro-modal-actions">
                <button type="button" className="membro-button-secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="membro-button-primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
