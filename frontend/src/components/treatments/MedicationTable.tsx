import React, { useState } from 'react';
import { Pill, Plus, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Medication } from '@/features/treatments/treatment.types';
import { TreatmentOutcomeBadge } from './TreatmentOutcomeBadge';
import { formatScore } from '@/features/analytics/analytics.utils';

interface MedicationTableProps {
  medications: Medication[];
  canEdit?: boolean;
  onAdd?: (payload: Partial<Medication>) => Promise<void>;
  onDelete?: (medId: string) => Promise<void>;
}

export const MedicationTable: React.FC<MedicationTableProps> = ({
  medications,
  canEdit = false,
  onAdd,
  onDelete,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    status: 'ACTIVE',
    effectiveness_score: '',
    outcome: 'IMPROVED',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAdd || !form.medication_name) return;
    await onAdd({
      medication_name: form.medication_name,
      dosage: form.dosage || undefined,
      frequency: form.frequency || undefined,
      start_date: form.start_date,
      end_date: form.end_date || undefined,
      status: form.status,
      effectiveness_score: form.effectiveness_score ? parseFloat(form.effectiveness_score) : undefined,
      outcome: form.outcome || undefined,
      notes: form.notes || undefined,
    });
    setModalOpen(false);
    setForm({
      medication_name: '',
      dosage: '',
      frequency: '',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: '',
      status: 'ACTIVE',
      effectiveness_score: '',
      outcome: 'IMPROVED',
      notes: '',
    });
  };

  return (
    <div className="space-y-4">
      {canEdit && onAdd && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Prescribe Medication
          </Button>
        </div>
      )}

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/60">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Medication</th>
              <th className="py-3 px-4">Dosage & Frequency</th>
              <th className="py-3 px-4">Timeline</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Outcome</th>
              <th className="py-3 px-4">Score</th>
              {canEdit && onDelete && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {medications.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="py-8 text-center text-slate-400">
                  No medications prescribed yet.
                </td>
              </tr>
            ) : (
              medications.map((m) => (
                <tr
                  key={m.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <Pill className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {m.medication_name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {m.dosage || 'Standard'} {m.frequency ? `• ${m.frequency}` : ''}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {m.start_date} {m.end_date ? `to ${m.end_date}` : '(Ongoing)'}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : m.status === 'COMPLETED'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <TreatmentOutcomeBadge outcome={m.outcome} />
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {formatScore(m.effectiveness_score)}
                  </td>
                  {canEdit && onDelete && (
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onDelete(m.id)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete medication"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Prescription Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Prescribe New Medication"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Medication Name *
              </label>
              <Input
                required
                placeholder="e.g. Metformin, Lisinopril"
                value={form.medication_name}
                onChange={(e) => setForm({ ...form, medication_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dosage
                </label>
                <Input
                  placeholder="e.g. 500mg"
                  value={form.dosage}
                  onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Frequency
                </label>
                <Input
                  placeholder="e.g. Twice daily with meals"
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Start Date *
                </label>
                <Input
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  End Date (Optional)
                </label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="DISCONTINUED">DISCONTINUED</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Outcome
                </label>
                <select
                  value={form.outcome}
                  onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                >
                  <option value="IMPROVED">IMPROVED</option>
                  <option value="STABLE">STABLE</option>
                  <option value="NO_CHANGE">NO_CHANGE</option>
                  <option value="ADVERSE_EFFECT">ADVERSE_EFFECT</option>
                  <option value="DISCONTINUED">DISCONTINUED</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Score (0-100)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 85"
                  value={form.effectiveness_score}
                  onChange={(e) => setForm({ ...form, effectiveness_score: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Clinical Notes
              </label>
              <textarea
                rows={2}
                placeholder="Observation or therapeutic targets..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                Save Prescription
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
