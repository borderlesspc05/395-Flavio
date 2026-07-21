import type { OrganizationalScanDefinition } from '../../types/organizationalScans';
import { cultureScan } from './cultureScan';
import { leadershipScan } from './leadershipScan';
import { customerExperienceScan } from './customerExperienceScan';
import { employeeExperienceScan } from './employeeExperienceScan';
import { strategicAlignmentScan } from './strategicAlignmentScan';
import { communicationScan } from './communicationScan';
import { turnoverScan } from './turnoverScan';
import { swotAnalysisScan } from './swotAnalysisScan';

export const fullScanIntro: OrganizationalScanDefinition = {
  id: 'fullScan',
  step: 'Canvas completo',
  title: 'Diagnóstico completo',
  subtitle: 'Canvas Sprint Waves com Solution Pick e resumo executivo',
  estimatedMinutes: 90,
  intro:
    'Percorra o canvas Sprint Waves (1.1–1.5) com profundidade máxima. Ao concluir, você chega ao Solution Pick com resumo executivo e planos priorizados.',
  guidance:
    'Ideal quando você quer um diagnóstico amplo da organização. O tempo médio é de cerca de 90 minutos. Alternativa: um scan focado em um tema específico, mais rápido.',
  blocks: [],
};

const withMinutes = (
  scan: OrganizationalScanDefinition,
  minutes: number
): OrganizationalScanDefinition => ({
  ...scan,
  estimatedMinutes: scan.estimatedMinutes ?? minutes,
});

export const ORGANIZATIONAL_SCANS: OrganizationalScanDefinition[] = [
  fullScanIntro,
  withMinutes(swotAnalysisScan, 15),
  withMinutes(cultureScan, 20),
  withMinutes(leadershipScan, 20),
  withMinutes(customerExperienceScan, 18),
  withMinutes(employeeExperienceScan, 18),
  withMinutes(strategicAlignmentScan, 18),
  withMinutes(communicationScan, 16),
  withMinutes(turnoverScan, 22),
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
  swotAnalysisScan,
};
