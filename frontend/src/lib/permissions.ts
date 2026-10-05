export const P={
 patientAssigned:'patient:read_assigned', patientAll:'patient:read_all', patientAnon:'patient:read_anonymized', patientWrite:'patient:write', history:'medical_history:read',
 risk:'risk_report:read', riskAggregated:'risk_report:read_aggregated', forecast:'readmission_forecast:read',
 treatment:'treatment_report:read', treatmentLimited:'treatment_report:read_limited', cds:'care_recommendation:generate', analytics:'hospital_analytics:read', population:'population_health:read', export:'analytics:export', researchExport:'research_dataset:export',
 users:'user:manage', models:'model:manage', audit:'audit_log:read', system:'system:configure',
} as const;
export function canAny(permissions:string[], required:string[]){return required.some(p=>permissions.includes(p));}
