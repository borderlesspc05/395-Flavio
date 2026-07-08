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
    'Diagnostique a organização pelo canvas completo Sprint Waves (1.1–1.5, com Solution Pick e resumo executivo) ou por um scan temático mais rápido. As duas vias levam ao mesmo Solution Pick para escolher planos de ação.',
  guidance:
    'O diagnóstico completo fica no canvas 1.1 a 1.5. O scan focado é alternativa quando você precisa de profundidade em um tema só — ambos alimentam o Solution Pick com o contexto real da empresa.',
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
