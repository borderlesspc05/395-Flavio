import type { ScanBlock, ScanField } from '../../types/organizationalScans';

let fieldCounter = 0;

export function resetFieldCounter() {
  fieldCounter = 0;
}

export function likert(
  prefix: string,
  prompt: string,
  options: readonly string[],
): ScanField {
  fieldCounter += 1;
  return {
    id: `${prefix}_q${String(fieldCounter).padStart(2, '0')}`,
    prompt,
    type: 'single',
    options: [...options],
    required: true,
  };
}

export function block(prefix: string, title: string, prompts: Array<{ prompt: string; options: readonly string[] }>): ScanBlock {
  return {
    id: `${prefix}_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`,
    title,
    fields: prompts.map((item) => likert(prefix, item.prompt, item.options)),
  };
}

export function customBlock(id: string, title: string, fields: ScanField[]): ScanBlock {
  return { id, title, fields };
}
