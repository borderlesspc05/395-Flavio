import { Check } from 'lucide-react';
import type { DiagnosticFieldValue } from '../../types';
import type { ScanField } from '../../types/organizationalScans';
import {
  parseDistributionValue,
  serializeDistributionValue,
} from '../../utils/organizationalScans';

function valueAsText(value: DiagnosticFieldValue | undefined) {
  if (Array.isArray(value)) return value.join(', ');
  return value ?? '';
}

function valueAsList(value: DiagnosticFieldValue | undefined) {
  return Array.isArray(value) ? value : [];
}

interface ScanFieldControlProps {
  field: ScanField;
  value: DiagnosticFieldValue | undefined;
  error?: string;
  onChange: (value: DiagnosticFieldValue) => void;
  readOnly?: boolean;
}

export function ScanFieldControl({ field, value, error, onChange, readOnly = false }: ScanFieldControlProps) {
  const fieldKey = field.id;
  const label = (
    <label className="diagnostic-field-label" htmlFor={fieldKey}>
      <span>{field.prompt}</span>
      {field.required !== false && <strong aria-label="Campo obrigatório">Obrigatório</strong>}
    </label>
  );

  if (field.type === 'single') {
    return (
      <div className={`diagnostic-field scan-field ${error ? 'has-error' : ''}`}>
        {label}
        <div className="diagnostic-choice-grid" role="radiogroup" aria-label={field.prompt}>
          {(field.options ?? []).map((option) => {
            const checked = valueAsText(value) === option;
            return (
              <button
                key={option}
                type="button"
                className={`diagnostic-choice ${checked ? 'is-selected' : ''}`}
                onClick={() => !readOnly && onChange(option)}
                aria-pressed={checked}
                disabled={readOnly}
              >
                <span className="diagnostic-choice-dot" aria-hidden />
                <span>{option}</span>
              </button>
            );
          })}
        </div>
        {error && <span className="diagnostic-error">{error}</span>}
      </div>
    );
  }

  if (field.type === 'multi') {
    const selected = valueAsList(value);
    const max = field.maxSelections ?? Number.POSITIVE_INFINITY;
    const atLimit = selected.length >= max;

    return (
      <div className={`diagnostic-field scan-field ${error ? 'has-error' : ''}`}>
        {label}
        {field.maxSelections ? (
          <p className="scan-field-hint">
            Selecione até {field.maxSelections} opção{field.maxSelections > 1 ? 'ões' : ''}.{' '}
            {selected.length}/{field.maxSelections}
          </p>
        ) : null}
        <div className="diagnostic-choice-grid multi" role="group" aria-label={field.prompt}>
          {(field.options ?? []).map((option) => {
            const checked = selected.includes(option);
            const disabled = !checked && atLimit;
            const next = checked
              ? selected.filter((item) => item !== option)
              : [...selected, option];
            return (
              <button
                key={option}
                type="button"
                className={`diagnostic-choice ${checked ? 'is-selected' : ''}`}
                onClick={() => !readOnly && !disabled && onChange(next)}
                aria-pressed={checked}
                disabled={readOnly || disabled}
              >
                <span className="diagnostic-choice-check" aria-hidden>
                  {checked && <Check size={13} />}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>
        {error && <span className="diagnostic-error">{error}</span>}
      </div>
    );
  }

  if (field.type === 'scale') {
    const min = field.min ?? 0;
    const max = field.max ?? 10;
    const textValue = valueAsText(value);
    const current = Number(textValue);
    const safeValue = Number.isFinite(current) ? current : min;

    return (
      <div className={`diagnostic-field scan-field ${error ? 'has-error' : ''}`}>
        {label}
        <div className="scan-scale-wrap">
          <input
            id={fieldKey}
            className="diagnostic-slider"
            type="range"
            min={min}
            max={max}
            step={1}
            value={safeValue}
            onChange={(event) => onChange(event.target.value)}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={safeValue}
            disabled={readOnly}
          />
          <output className="scan-scale-output" htmlFor={fieldKey}>
            {safeValue}
          </output>
        </div>
        <div className="scan-scale-ticks" aria-hidden>
          <span>{min}</span>
          <span>{max}</span>
        </div>
        {error && <span className="diagnostic-error">{error}</span>}
      </div>
    );
  }

  if (field.type === 'percent' || field.type === 'number') {
    return (
      <div className={`diagnostic-field scan-field ${error ? 'has-error' : ''}`}>
        {label}
        <div className="scan-number-wrap">
          <input
            id={fieldKey}
            className="diagnostic-input scan-number-input"
            type="number"
            min={field.min ?? 0}
            max={field.max ?? (field.type === 'percent' ? 100 : undefined)}
            inputMode="decimal"
            value={valueAsText(value)}
            placeholder={field.placeholder}
            onChange={(event) => onChange(event.target.value)}
            disabled={readOnly}
            readOnly={readOnly}
          />
          {field.type === 'percent' ? <span className="scan-number-suffix">%</span> : null}
        </div>
        {error && <span className="diagnostic-error">{error}</span>}
      </div>
    );
  }

  if (field.type === 'distribution') {
    const total = field.distributionTotal ?? 100;
    const current = parseDistributionValue(value);
    const sum = Object.values(current).reduce((acc, n) => acc + (Number(n) || 0), 0);
    const remaining = total - sum;

    const updateItem = (option: string, nextValue: number) => {
      const safe = Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0;
      onChange(serializeDistributionValue({ ...current, [option]: safe }));
    };

    return (
      <div className={`diagnostic-field scan-field ${error ? 'has-error' : ''}`}>
        {label}
        <p className="scan-field-hint">
          Total distribuído: <strong>{sum}</strong> / {total}
          {remaining !== 0 ? ` (${remaining > 0 ? 'faltam' : 'excesso de'} ${Math.abs(remaining)})` : ''}
        </p>
        <div className="scan-distribution-grid">
          {(field.options ?? []).map((option) => (
            <div key={option} className="scan-distribution-row">
              <label htmlFor={`${fieldKey}_${option}`}>{option}</label>
              <input
                id={`${fieldKey}_${option}`}
                className="diagnostic-input scan-distribution-input"
                type="number"
                min={0}
                max={total}
                inputMode="numeric"
                value={current[option] ?? ''}
                onChange={(event) => updateItem(option, Number(event.target.value))}
                disabled={readOnly}
                readOnly={readOnly}
              />
            </div>
          ))}
        </div>
        {error && <span className="diagnostic-error">{error}</span>}
      </div>
    );
  }

  return (
    <div className={`diagnostic-field scan-field ${error ? 'has-error' : ''}`}>
      {label}
      <textarea
        id={fieldKey}
        className="diagnostic-textarea"
        rows={4}
        value={valueAsText(value)}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={readOnly}
        readOnly={readOnly}
      />
      {error && <span className="diagnostic-error">{error}</span>}
    </div>
  );
}
