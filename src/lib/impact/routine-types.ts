export interface ActionImpactEvaluation {
  applicable: boolean;
  reasonIfNotApplicable?: string;
  concentrationReduction: number | null;
  doseAvoidedUg: number | null;
  percentageDrop: number | null;
  isUnknown?: boolean;
  pm25SavedGrams: number;
  co2SavedGrams: number;
  methodologyNotes?: string;
}
