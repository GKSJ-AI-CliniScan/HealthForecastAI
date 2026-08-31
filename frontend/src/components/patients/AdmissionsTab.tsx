import React, { useState } from 'react';
import { Plus, Building2, Calendar, Clock, Edit2, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Admission, AdmissionCreatePayload } from '@/types';
import { useAuth } from '@/hooks/useAuth';

export interface AdmissionsTabProps {
  records: Admission[];
  onAdd: (payload: AdmissionCreatePayload) => Promise<void>;
  onUpdate: (id: string, payload: Partial<AdmissionCreatePayload>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const AdmissionsTab: React.FC<AdmissionsTabProps> = ({
  records,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const { user } = useAuth();
  const canCreate = user?.role === 'DOCTOR' || user?.role === 'HOSPITAL_ADMIN' || user?.role === 'SYSTEM_ADMIN';
  const canEdit = user?.role === 'DOCTOR' || user?.role === 'SYSTEM_ADMIN';

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Admission | null>(null);
  const [formData, setFormData] = useState<AdmissionCreatePayload>({
    admission_date: new Date().toISOString().split('T')[0],
    discharge_date: '',
    admission_type: 'Emergency',
    department: 'Endocrinology',
    primary_diagnosis: '',
    length_of_stay: 3,
    discharge_disposition: 'Discharged to Home',
  });

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData({
      admission_date: new Date().toISOString().split('T')[0],
      discharge_date: '',
      admission_type: 'Emergency',
      department: 'Endocrinology',
      primary_diagnosis: '',
      length_of_stay: 3,
      discharge_disposition: 'Discharged to Home',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (rec: Admission) => {
    setEditingRecord(rec);
    setFormData({
      admission_date: rec.admission_date,
      discharge_date: rec.discharge_date || '',
      admission_type: rec.admission_type || 'Emergency',
      department: rec.department || 'Endocrinology',
      primary_diagnosis: rec.primary_diagnosis || '',
      length_of_stay: rec.length_of_stay || 3,
      discharge_disposition: rec.discharge_disposition || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      discharge_date: formData.discharge_date || undefined,
      length_of_stay: Number(formData.length_of_stay),
    };
    if (editingRecord) {
      await onUpdate(editingRecord.id, payload);
    } else {
      await onAdd(payload);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Hospital Inpatient Episodes</h3>
          <p className="text-xs text-slate-500">Admission timelines, departmental transfers, and length of stay</p>
        </div>
        {canCreate && (
          <Button variant="primary" size="sm" onClick={handleOpenAdd} icon={Plus}>
            New Admission
          </Button>
        )}
      </div>

      {records.length === 0 ? (
        <Card className="text-center py-10 text-slate-400 text-sm">
          No hospital admissions recorded for this patient.
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((adm) => (
            <Card key={adm.id} className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {adm.department || 'General Inpatient'}
                      </h4>
                      <Badge variant="sky">{adm.admission_type || 'Standard'}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Diagnosis: <span className="font-semibold text-slate-700 dark:text-slate-300">{adm.primary_diagnosis || 'Unspecified'}</span>
                    </p>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(adm)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    {user?.role === 'SYSTEM_ADMIN' && (
                      <Button variant="ghost" size="sm" onClick={() => onDelete(adm.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Admitted</span>
                    <span className="font-semibold">{adm.admission_date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Length of Stay</span>
                    <span className="font-semibold">{adm.length_of_stay ? `${adm.length_of_stay} Days` : 'Active'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Discharge Status</span>
                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                      {adm.discharge_disposition || 'Hospital Inpatient'}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRecord ? 'Edit Admission Episode' : 'New Hospital Admission'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                Admission Date
              </label>
              <input
                type="date"
                required
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
                value={formData.admission_date}
                onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                Discharge Date
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
                value={formData.discharge_date || ''}
                onChange={(e) => setFormData({ ...formData, discharge_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                Department
              </label>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Cardiology, Endocrinology"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                Admission Type
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
                value={formData.admission_type || 'Emergency'}
                onChange={(e) => setFormData({ ...formData, admission_type: e.target.value })}
              >
                <option value="Emergency">Emergency</option>
                <option value="Elective">Elective</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
              Primary Diagnosis
            </label>
            <input
              type="text"
              required
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
              value={formData.primary_diagnosis || ''}
              onChange={(e) => setFormData({ ...formData, primary_diagnosis: e.target.value })}
              placeholder="e.g. Diabetic Ketoacidosis"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                Length of Stay (Days)
              </label>
              <input
                type="number"
                min={0}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
                value={formData.length_of_stay || ''}
                onChange={(e) => setFormData({ ...formData, length_of_stay: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                Discharge Disposition
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
                value={formData.discharge_disposition || ''}
                onChange={(e) => setFormData({ ...formData, discharge_disposition: e.target.value })}
                placeholder="e.g. Discharged to Home"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingRecord ? 'Update Admission' : 'Save Admission'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
