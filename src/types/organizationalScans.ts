import type { DiagnosticFieldValue } from './index';

export type OrganizationalScanId =
  | 'fullScan'
  | 'culture'
  | 'leadership'
  | 'customerExperience'
  | 'employeeExperience'
  | 'strategicAlignment'
  | 'communication'
  | 'turnover';

export type ScanFieldType =
  | 'single'
  | 'multi'
  | 'text'
  | 'number'
  | 'percent'
  | 'scale'
  | 'distribution';

export interface ScanField {
  id: string;
  prompt: string;
  type: ScanFieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  maxSelections?: number;
  distributionTotal?: number;
}

export interface ScanBlock {
  id: string;
  title: string;
  fields: ScanField[];
}

export interface OrganizationalScanDefinition {
  id: OrganizationalScanId;
  step: string;
  title: string;
  subtitle: string;
  intro: string;
  guidance?: string;
  blocks: ScanBlock[];
  comingSoon?: boolean;
}

export type OrganizationalScanAnswers = Record<OrganizationalScanId, Record<string, DiagnosticFieldValue>>;

export function createEmptyOrganizationalScanAnswers(): OrganizationalScanAnswers {
  return {
    fullScan: {},
    culture: {},
    leadership: {},
    customerExperience: {},
    employeeExperience: {},
    strategicAlignment: {},
    communication: {},
    turnover: {},
  };
}
