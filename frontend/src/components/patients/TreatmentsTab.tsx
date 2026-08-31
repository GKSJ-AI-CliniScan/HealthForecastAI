import React, { useState } from 'react';
import { Plus, Stethoscope, Calendar, Edit2, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Treatment, TreatmentCreatePayload } from '@/types';
import { useAuth } from '@/hooks/useAuth';

export interface TreatmentsTabProps {
  records: Treatment[];
  onAdd: (payload: TreatmentCreatePayload) => Promise<void>;
  onUpdate: (id: string, payload: Partial<TreatmentCreatePayload>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const TreatmentsTab: React.FC<TreatmentsTabProps> = ({
  records,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const { user } = useAuth();
  const canEdit = user?.role === 'DOCTOR' || user?.role === 'SYSTEM_ADMIN';

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Treatment | null>(null);
  const [formData, setFormData] = useState<TreatmentCreatePayload>({
    treatment_name: '',
    treatment_type: 'Pharmacotherapy',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: 'ACTIVE',
    notes: '',
  });

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData({
      treatment_name: '',
      treatment_type: 'Pharmacotherapy',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      status: 'ACTIVE',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (rec: Treatment) => {
    setEditingRecord(rec);
    setFormData({
      treatment_name: rec.treatment_name,
      treatment_type: rec.treatment_type || 'Pharmacotherapy',
      start_date: rec.start_date,
      end_date: rec.end_date || '',
      status: rec.status,
      notes: rec.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      end_date: formData.end_date || undefined,
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
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Prescribed Treatments & Protocols</h3>
          <p className="text-xs text-slate-500">Medications, insulin regimens, therapies, and clinical procedures</p>
        </div>
        {canEdit && (
          <Button variant="primary" size="sm" onClick={handleOpenAdd} icon={Plus}>
            Prescribe Treatment
          </Button>
        )}
      </div>

      {records.length === 0 ? (
        <Card className="text-center py-10 text-slate-400 text-sm">
          No treatment records found for this patient.
        </Card>
      ) : (
        <div className="space-y-4">
          {records.map((tx) => (
            <Card key={tx.id} className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">{tx.treatment_name}</h4>
                      <Badge
                        variant={
                          tx.status === 'ACTIVE'
                            ? 'emerald'
                            : tx.status === 'COMPLETED'
                            ? 'teal'
                            : 'slate'
                        }
                      >
                        {tx.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Category: <span className="font-semibold text-slate-700 dark:text-slate-300">{tx.treatment_type || 'Clinical Care'}</span>
                    </p>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(tx)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    {user?.role === 'SYSTEM_ADMIN' && (
                      <Button variant="ghost" size="sm" onClick={() => onDelete(tx.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="text-slate-400 block text-[10px]">Therapy Duration</span>
                    <span className="font-semibold">
                      {tx.start_date} {tx.end_date ? `to ${tx.end_date}` : '(Ongoing)'}
                    </span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-400 block text-[10px]">Dosage & Physician Notes</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {tx.notes || 'Standard protocol administration.'}
                  </span>
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
        title={editingRecord ? 'Update Treatment' : 'Prescribe New Treatment'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
              Treatment Name / Drug Protocol
            </label>
            <input
              type="text"
              required
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
              value={formData.treatment_name}
              onChange={(e) => setFormData({ ...formData, treatment_name: e.target.value })}
              placeholder="e.g. Metformin 1000mg BID + Insulin Glargine"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                Type
              </label>
              <input
                type="text"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
                value={formData.treatment_type || ''}
                onChange={(e) => setFormData({ ...formData, treatment_type: e.target.value })}
                placeholder="e.g. Pharmacotherapy, Surgery"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                Status
              </label>
              <select
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
                value={formData.status || 'ACTIVE'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="DISCONTINUED">DISCONTINUED</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                Start Date
              </label>
              <input
                type="date"
                required
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
                End Date
              </label>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase text-slate-700 dark:text-slate-300">
              Prescription Instructions / Notes
            </label>
            <textarea
              rows={3}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-2.5 text-sm"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Titration guidance and administration schedule"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {editingRecord ? 'Update Record' : 'Prescribe'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
