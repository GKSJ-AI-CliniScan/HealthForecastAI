export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuditLogItem {
  id: string;
  user_id?: string;
  username?: string;
  action: string;
  resource?: string;
  resource_id?: string;
  created_at: string;
}

export interface DatasetSummary {
  dataset_name: string;
  total_records: number;
  total_columns: number;
  column_names: string[];
  missing_value_summary: Record<string, number>;
  numeric_features_count: number;
  categorical_features_count: number;
  status: string;
  feature_columns: string[];
  sample_records: Record<string, any>[];
}

export interface DashboardMetrics {
  role: string;
  cards: Record<string, number | string>;
  recent_patients?: any[];
  recent_admissions?: any[];
  department_summary?: Record<string, number>;
  dataset_summary?: DatasetSummary;
  sample_anonymized_patients?: any[];
  recent_users?: any[];
  recent_audit_logs?: any[];
}
