import type { OrganizationalScanDefinition } from '../../types/organizationalScans';
import { cultureScan } from './cultureScan';
import { leadershipScan } from './leadershipScan';
import { customerExperienceScan } from './customerExperienceScan';
import { employeeExperienceScan } from './employeeExperienceScan';
import { strategicAlignmentScan } from './strategicAlignmentScan';
import { communicationScan } from './communicationScan';
import { turnoverScan } from './turnoverScan';

export const fullScanIntro: OrganizationalScanDefinition = {
  id: 'fullScan',
  step: 'Visão integrada',
  title: 'Full Scan',
  subtitle: 'Diagnóstico completo da organização',
  intro:
    'Você pode diagnosticar a organização de duas formas: o canvas completo (mais profundo) ou um scan temático (mais rápido). Escolha apenas uma via por ciclo. Não é necessário preencher todos os scans.',
  guidance:
    'Para o diagnóstico focado, selecione o tema mais relevante para o momento da organização. Um único scan bem respondido já substitui o canvas completo para iniciar o ciclo.',
  blocks: [],
};

export const ORGANIZATIONAL_SCANS: OrganizationalScanDefinition[] = [
  fullScanIntro,
  cultureScan,
  leadershipScan,
  customerExperienceScan,
  employeeExperienceScan,
  strategicAlignmentScan,
  communicationScan,
  turnoverScan,
];

export const ORGANIZATIONAL_SCAN_MAP = Object.fromEntries(
  ORGANIZATIONAL_SCANS.map((scan) => [scan.id, scan]),
) as Record<string, OrganizationalScanDefinition>;

export function getAnswerableScans() {
  return ORGANIZATIONAL_SCANS.filter((scan) => scan.id !== 'fullScan' && !scan.comingSoon);
}

export {
  cultureScan,
  leadershipScan,
  customerExperienceScan,
  employeeExperienceScan,
  strategicAlignmentScan,
  communicationScan,
  turnoverScan,
};
