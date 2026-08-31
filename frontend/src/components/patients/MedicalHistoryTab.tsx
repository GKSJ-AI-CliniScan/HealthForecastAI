import React, { useState } from 'react';
import { Plus, Trash2, Edit2, FileText } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { MedicalHistory, MedicalHistoryCreatePayload } from '@/types';
import { useAuth } from '@/hooks/useAuth';

export interface MedicalHistoryTabProps {
  records: MedicalHistory[];
  onAdd: (payload: MedicalHistoryCreatePayload) => Promise<void>;
  onUpdate: (id: string, payload: MedicalHistoryCreatePayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export const MedicalHistoryTab: React.FC<MedicalHistoryTabProps> = ({
  records,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const { user } = useAuth();
  const canEdit = user?.role === 'DOCTOR' || user?.role === 'SYSTEM_ADMIN';

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MedicalHistory | null>(null);
  const [formData, setFormData] = useState<MedicalHistoryCreatePayload>({
    diagnosis: '',
    chronic_conditions: '',
    allergies: '',
    medical_notes: '',
  });

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData({
      diagnosis: '',
      chronic_conditions: '',
      allergies: '',
      medical_notes: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (rec: MedicalHistory) => {
    setEditingRecord(rec);
    setFormData({
      diagnosis: rec.diagnosis || '',
      chronic_conditions: rec.chronic_conditions || '',
      allergies: rec.allergies || '',
      medical_notes: rec.medical_notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecord) {
      await onUpdate(editingRecord.id, formData);
    } else {
      await onAdd(formData);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Medical History Entries</h3>
          <p className="text-xs text-slate-500">Diagnoses, chronic conditions, and allergy profiles</p>
        </div>
        {canEdit && (
          <Button variant="primary" size="sm" onClick={handleOpenAdd} icon={Plus}>
            Add Medical History
          </Button>
        )}
      </div>

      {records.length === 0 ? (
        <Card className="text-center py-10 text-slate-400 text-sm">
          No medical history records logged for this patient.
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => (
            <Card key={rec.id} className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {rec.diagnosis || 'General Clinical Evaluation'}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Recorded on: {new Date(rec.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(rec)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    {user?.role === 'SYSTEM_ADMIN' && (
                      <Button variant="ghost" size="sm" onClick={() => onDelete(rec.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="font-semibold text-slate-500 block mb-0.5">Chronic Conditions</span>
                  <span className="text-slate-800 dark:text-slate-200">{rec.chronic_conditions || 'None Reported'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="font-semibold text-slate-500 block mb-0.5">Allergies</span>
                  <span className="text-rose-600 dark:text-rose-400 font-medium">{rec.allergies || 'No known allergies'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="font-semibold text-slate-500 block mb-0.5">Clinical Notes</span>
                  <span className="text-slate-700 dark:text-slate-300">{rec.medical_notes || 'No additional notes'}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRecord ? 'Edit Medical History' : 'Add Medical History'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Primary Diagnosis
            </label>
            <input
              type="text"
              required
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
              value={formData.diagnosis || ''}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              placeholder="e.g. Type 2 Diabetes Mellitus"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Chronic Conditions
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
              value={formData.chronic_conditions || ''}
              onChange={(e) => setFormData({ ...formData, chronic_conditions: e.target.value })}
              placeholder="e.g. Hypertension, CKD Stage 2"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Known Allergies
            </label>
            <input
              type="text"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
              value={formData.allergies || ''}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
              placeholder="e.g. Penicillin, Sulfa"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Medical Notes
            </label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
              value={formData.medical_notes || ''}
              onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
              placeholder="Detailed clinical notes and physician impressions"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingRecord ? 'Update Entry' : 'Add Entry'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
