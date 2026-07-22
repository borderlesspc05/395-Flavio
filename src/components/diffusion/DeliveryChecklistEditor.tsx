import { CheckSquare, Hourglass, Loader2, Mail, Plus, Sparkles, Square, Trash2 } from 'lucide-react';
import { TeamMemberCombobox } from '../ui/TeamMemberCombobox';
import type { DeliveryChecklistItem, ChecklistProgress } from '../../types';
import {
  CHECKLIST_PROGRESS_OPTIONS,
  daysRemainingLabel,
  emptyChecklistItem,
} from '../../utils/deliveryChecklist';

interface Props {
  items: DeliveryChecklistItem[];
  disabled?: boolean;
  suggesting?: boolean;
  remindingId?: string | null;
  onChange: (items: DeliveryChecklistItem[]) => void;
  onSuggest: () => void;
  onRemind: (item: DeliveryChecklistItem) => void;
}

export function DeliveryChecklistEditor({
  items,
  disabled,
  suggesting,
  remindingId,
  onChange,
  onSuggest,
  onRemind,
}: Props) {
  const list = items.length > 0 ? items : [emptyChecklistItem()];

  const updateItem = (id: string, patch: Partial<DeliveryChecklistItem>) => {
    const next = list.map((item) => {
      if (item.id !== id) return item;
      const merged = { ...item, ...patch };
      if (patch.progresso !== undefined) {
        merged.done = patch.progresso === 100;
      }
      if (patch.done !== undefined) {
        merged.progresso = patch.done ? 100 : merged.progresso === 100 ? 0 : merged.progresso;
      }
      return merged;
    });
    onChange(next);
  };

  const removeItem = (id: string) => {
    const next = list.filter((item) => item.id !== id);
    onChange(next.length ? next : [emptyChecklistItem()]);
  };

  const addItem = () => {
    onChange([...list, emptyChecklistItem()]);
  };

  return (
    <div className="diffusion-checklist">
      <div className="diffusion-checklist-head">
        <h4 className="diffusion-checklist-title">Check-list de ações</h4>
        <button
          type="button"
          className="diffusion-checklist-suggest"
          disabled={disabled || suggesting}
          onClick={onSuggest}
        >
          {suggesting ? (
            <Loader2 size={14} className="spin" aria-hidden />
          ) : (
            <Sparkles size={14} aria-hidden />
          )}
          Sugerir Ações
        </button>
        <div className="diffusion-checklist-cols" aria-hidden>
          <span>Responsável</span>
          <span>Status</span>
          <span>Prazo</span>
        </div>
      </div>

      <ul className="diffusion-checklist-list">
        {list.map((item) => {
          const days = daysRemainingLabel(item.prazo);
          const done = Boolean(item.done) || item.progresso === 100;
          return (
            <li key={item.id} className="diffusion-checklist-row">
              <button
                type="button"
                className="diffusion-checklist-check"
                disabled={disabled}
                aria-pressed={done}
                aria-label={done ? 'Marcar como pendente' : 'Marcar como concluída'}
                onClick={() => updateItem(item.id, { done: !done })}
              >
                {done ? <CheckSquare size={18} aria-hidden /> : <Square size={18} aria-hidden />}
              </button>

              <input
                className="diffusion-checklist-text"
                value={item.texto}
                disabled={disabled}
                placeholder="IA sugere ações editáveis…"
                onChange={(e) => updateItem(item.id, { texto: e.target.value })}
              />

              <div className="diffusion-checklist-assignee">
                <TeamMemberCombobox
                  label=""
                  value={item.responsavel || ''}
                  disabled={disabled}
                  onChange={(responsavel) => updateItem(item.id, { responsavel })}
                />
                <button
                  type="button"
                  className="diffusion-checklist-remind"
                  disabled={disabled || !item.responsavel?.trim() || remindingId === item.id}
                  aria-label="Enviar lembrete por e-mail"
                  title="Enviar lembrete por e-mail"
                  onClick={() => onRemind(item)}
                >
                  {remindingId === item.id ? (
                    <Loader2 size={14} className="spin" aria-hidden />
                  ) : (
                    <Mail size={14} aria-hidden />
                  )}
                </button>
              </div>

              <label className="diffusion-checklist-status">
                <span className="sr-only">Status</span>
                <select
                  value={item.progresso ?? 0}
                  disabled={disabled}
                  onChange={(e) =>
                    updateItem(item.id, {
                      progresso: Number(e.target.value) as ChecklistProgress,
                    })
                  }
                >
                  {CHECKLIST_PROGRESS_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}%
                    </option>
                  ))}
                </select>
              </label>

              <div className="diffusion-checklist-prazo">
                <input
                  type="date"
                  value={item.prazo || ''}
                  disabled={disabled}
                  onChange={(e) => updateItem(item.id, { prazo: e.target.value })}
                />
                {days ? (
                  <span className="diffusion-checklist-days">
                    <Hourglass size={12} aria-hidden /> {days}
                  </span>
                ) : null}
              </div>

              {!disabled && list.length > 1 ? (
                <button
                  type="button"
                  className="diffusion-checklist-remove"
                  aria-label="Remover ação"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              ) : (
                <span className="diffusion-checklist-remove-spacer" aria-hidden />
              )}
            </li>
          );
        })}
      </ul>

      {!disabled ? (
        <button type="button" className="diffusion-checklist-add" onClick={addItem}>
          <Plus size={16} aria-hidden />
          adicionar mais…
        </button>
      ) : null}

      <p className="diffusion-checklist-notes">
        Ao atribuir alguém, o membro recebe e-mail. Progresso em 0%, 25%, 50%, 75% ou 100%. Essas
        porcentagens alimentam o termômetro do Intelligence Dashboard.
      </p>
    </div>
  );
}
