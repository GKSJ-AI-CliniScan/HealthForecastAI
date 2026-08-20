export interface PlatformModule {
  id: number;
  name: string;
  description: string;
}

/** The seven modules defined in section 4 of the project brief. */
export const MODULES: PlatformModule[] = [
  {
    id: 1,
    name: 'User Management',
    description: 'Accounts, authentication, authorisation and role management.',
  },
  {
    id: 2,
    name: 'Patient Data Management',
    description: 'Patient records, medical history, treatment and admission tracking.',
  },
  {
    id: 3,
    name: 'Risk Prediction',
    description: 'Risk analysis, readmission probability and high-risk identification.',
  },
  {
    id: 4,
    name: 'Treatment Effectiveness',
    description: 'Outcome evaluation, recovery and medication effectiveness analysis.',
  },
  {
    id: 5,
    name: 'Clinical Decision Support',
    description: 'Care recommendations, follow-up planning and discharge support.',
  },
  {
    id: 6,
    name: 'Healthcare Analytics Dashboard',
    description: 'Readmission analytics, hospital performance and trend visualisation.',
  },
  {
    id: 7,
    name: 'AI Model Management',
    description: 'Model training, evaluation, monitoring and performance optimisation.',
  },
];
