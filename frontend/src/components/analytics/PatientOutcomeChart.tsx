import React from 'react';
import { TreatmentOutcomeChart } from './TreatmentOutcomeChart';

interface PatientOutcomeChartProps {
  outcomeDistribution: Record<string, number>;
}

export const PatientOutcomeChart: React.FC<PatientOutcomeChartProps> = ({
  outcomeDistribution,
}) => {
  return (
    <TreatmentOutcomeChart
      outcomeDistribution={outcomeDistribution}
      title="Patient Recovery Outcome Distribution"
      subtitle="Categorized progression of hospitalized patients at follow-up evaluations"
    />
  );
};
