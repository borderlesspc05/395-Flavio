import { FormEvent, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { DIAGNOSTIC_FIELD_STEPS } from '../constants/magnusWaves';
import { getInitialForm, saveInitialForm } from '../services/initialForm';
import { BUSINESS_STAGES, type InitialFormData } from '../types';

const empty: InitialFormData = {
  organizacao: '',
  produtoServico: '',
  estagioNegocio: '',
  fatoresExternos: '',
  mudancasRecentes: '',
};

export function InitialFormPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [data, setData] = useState<InitialFormData>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof InitialFormData, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getInitialForm(userId)
      .then(({ data: d, completedAt: at }) => {
        setData(d);
        setCompletedAt(at);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const validate = () => {
    const e: Partial<Record<keyof InitialFormData, string>> = {};
    if (!data.organizacao.trim()) e.organizacao = 'Este campo é obrigatório';
    if (!data.produtoServico.trim()) e.produtoServico = 'Este campo é obrigatório';
    if (!data.estagioNegocio) e.estagioNegocio = 'Selecione uma opção';
    if (!data.fatoresExternos.trim()) e.fatoresExternos = 'Este campo é obrigatório';
    if (!data.mudancasRecentes.trim()) e.mudancasRecentes = 'Este campo é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!userId || !validate()) return;
    setSaving(true);
    setSuccess(false);
    try {
      const at = await saveInitialForm(userId, data);
      setCompletedAt(at);
      setSuccess(true);
    } catch {
      setErrors({ organizacao: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="form-loading">Carregando diagnóstico...</p>;
  }

  const textFields = DIAGNOSTIC_FIELD_STEPS.filter((s) => s.field !== 'estagioNegocio');
  const stageStep = DIAGNOSTIC_FIELD_STEPS.find((s) => s.field === 'estagioNegocio')!;

  return (
    <div className="form-container-inline">
      <div className="form-card-inline">
        <div className="form-logo">
          <img src="/icone-magnusmind.svg" alt="" className="logo-icon" />
          <p className="logo-text">magnus mind</p>
        </div>
        <h1 className="form-title">Onda 1 — Diagnóstico</h1>
        <p className="form-timestamp" style={{ marginBottom: '0.5rem', textAlign: 'center' }}>
          <strong>Human-to-Business Canvas™</strong> — meta: canvas desenhado ao final das 5 etapas
        </p>
        <p className="form-timestamp" style={{ marginBottom: '1rem', textAlign: 'center' }}>
          Decoding → Gap Scan → System Scan → Team Scan → Solution Pick
        </p>
        {completedAt && (
          <p className="form-timestamp">
            Canvas atualizado em: <strong>{completedAt.toLocaleString('pt-BR')}</strong>
          </p>
        )}
        {success && (
          <p className="form-success-msg">
            Diagnóstico salvo. Próximo passo: <strong>Design (MM Blueprint)</strong> na People Sprint IA.
          </p>
        )}

        <form className="initial-form" onSubmit={handleSubmit}>
          {textFields.map((step, index) => {
            const field = step.field;
            if (field === 'estagioNegocio') return null;
            return (
              <div className="form-group" key={field}>
                <span className="diagnostic-step-badge">{step.label}</span>
                <label className="form-label">
                  {index + 1}. {step.hint}
                </label>
                <textarea
                  className={`form-textarea ${errors[field] ? 'input-error' : ''}`}
                  rows={field === 'organizacao' ? 4 : 3}
                  value={data[field]}
                  onChange={(e) => setData({ ...data, [field]: e.target.value })}
                  placeholder={
                    field === 'organizacao'
                      ? 'Empresa, mercado, posicionamento...'
                      : undefined
                  }
                />
                {errors[field] && <span className="error-message">{errors[field]}</span>}
              </div>
            );
          })}

          <div className="form-group">
            <span className="diagnostic-step-badge">{stageStep.label}</span>
            <label className="form-label">3. {stageStep.hint}</label>
            <div className="radio-group">
              {BUSINESS_STAGES.map((stage) => (
                <label
                  key={stage}
                  className={`radio-option ${data.estagioNegocio === stage ? 'checked' : ''}`}
                >
                  <input
                    type="radio"
                    name="estagio"
                    className="radio-input"
                    checked={data.estagioNegocio === stage}
                    onChange={() => setData({ ...data, estagioNegocio: stage })}
                  />
                  <span className="radio-label">{stage}</span>
                </label>
              ))}
            </div>
            {errors.estagioNegocio && <span className="error-message">{errors.estagioNegocio}</span>}
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Salvando canvas...' : 'Salvar Human-to-Business Canvas'}
            <span className="btn-arrow">→</span>
          </button>
        </form>
      </div>
    </div>
  );
}
