export type ModelStatus = 'active' | 'archived' | 'training' | 'evaluating' | 'deprecated';

export type ModelAlgorithm =
  | 'xgboost'
  | 'logistic_regression'
  | 'random_forest'
  | 'lightgbm'
  | 'neural_network';

export interface ModelMetrics {
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  roc_auc: number | null;
  brier_score?: number | null;
  specificity?: number | null;
}

export interface FeatureImportanceItem {
  feature: string;
  displayName: string;
  importance: number; // Normalized importance (0 - 1)
  category: 'clinical' | 'demographic' | 'admission' | 'medication';
  description: string;
}

export interface RegisteredModel {
  id: string;
  name: string;
  version: string;
  algorithm: string;
  task: string;
  status: ModelStatus;
  description: string;
  trainedDate: string;
  datasetName: string;
  datasetSize: number;
  metrics: ModelMetrics;
  artifactPath?: string;
  hyperparameters?: Record<string, string | number | boolean>;
}

export interface ModelGovernance {
  framework: string;
  pythonVersion: string;
  trainingDataset: string;
  validationSplit: string;
  intendedUse: string;
  fairnessAuditStatus: 'passed' | 'review_required' | 'pending';
  ethicalConstraints: string;
  lastAuditedDate: string;
}

export interface ActiveModelDetails {
  name: string;
  version: string;
  algorithm: string;
  status: string;
  artifactDir: string;
  loadedAt: string;
  servingEndpoint: string;
  latencyMs: number;
  throughputRps: number;
  metrics: ModelMetrics;
  governance: ModelGovernance;
  topFeatures: FeatureImportanceItem[];
}

export interface ModelDashboardData {
  activeModel: ActiveModelDetails;
  registeredModels: RegisteredModel[];
  isSimulated: boolean;
  dataSource: 'fastapi_ml_backend' | 'simulated_mock';
  lastSync: string;
}
