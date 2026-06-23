export type EvolutionPractice = {
  practice: string;
  rationale: string;
};

export type EvolutionNextWave = {
  title: string;
  focus: string;
  rationale: string;
};

export type EvolutionLoopResult = {
  summary: string;
  continuar: EvolutionPractice[];
  ajustar: EvolutionPractice[];
  abandonar: EvolutionPractice[];
  nextWave: EvolutionNextWave;
  generatedAt?: string;
};
