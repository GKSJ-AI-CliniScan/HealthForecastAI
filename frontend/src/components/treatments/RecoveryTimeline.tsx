import React, { useState } from 'react';
import {
  Building2,
  Stethoscope,
  Award,
  LogOut,
  ClipboardCheck,
  Plus,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { RecoveryTimelineEvent } from '@/features/analytics/analytics.types';
import { TreatmentOutcomeBadge } from './TreatmentOutcomeBadge';
import { formatScore } from '@/features/analytics/analytics.utils';

interface RecoveryTimelineProps {
  timeline: RecoveryTimelineEvent[];
  canAddOutcome?: boolean;
  onAddOutcome?: (payload: {
    outcome_status: string;
    outcome_score?: number;
    recorded_date: string;
    notes?: string;
  }) => Promise<void>;
}

export const RecoveryTimeline: React.FC<RecoveryTimelineProps> = ({
  timeline,
  canAddOutcome = false,
  onAddOutcome,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [status, setStatus] = useState('DISCHARGED_RECOVERED');
  const [score, setScore] = useState('85');
  const [dateVal, setDateVal] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddOutcome) return;
    await onAddOutcome({
      outcome_status: status,
      outcome_score: score ? parseFloat(score) : undefined,
      recorded_date: dateVal,
      notes: notes || undefined,
    });
    setModalOpen(false);
    setNotes('');
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ADMISSION':
        return <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
      case 'TREATMENT':
        return <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />;
      case 'TREATMENT_OUTCOME':
        return <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      case 'DISCHARGE':
        return <LogOut className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case 'OUTCOME':
      default:
        return <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  const getEventBorder = (type: string) => {
    switch (type) {
      case 'ADMISSION':
        return 'border-blue-500/40 bg-blue-50/20';
      case 'TREATMENT':
        return 'border-teal-500/40 bg-teal-50/20';
      case 'TREATMENT_OUTCOME':
        return 'border-purple-500/40 bg-purple-50/20';
      case 'DISCHARGE':
        return 'border-amber-500/40 bg-amber-50/20';
      case 'OUTCOME':
      default:
        return 'border-emerald-500/40 bg-emerald-50/20';
    }
  };

  return (
    <div className="space-y-4">
      {canAddOutcome && onAddOutcome && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Record Recovery Outcome
          </Button>
        </div>
      )}

      {timeline.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs">
          No recovery events recorded for this patient.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {timeline.map((ev, i) => (
            <div key={i} className="relative group">
              {/* Event icon marker */}
              <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm">
                {getEventIcon(ev.event_type)}
              </div>

              {/* Event content */}
              <div
                className={`p-3.5 rounded-xl border ${getEventBorder(
                  ev.event_type
                )} bg-white dark:bg-slate-900/60 shadow-sm space-y-1.5`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    {ev.title}
                  </span>
                  <div className="flex items-center gap-2">
                    {ev.status && <TreatmentOutcomeBadge outcome={ev.status} />}
                    {ev.score !== null && ev.score !== undefined && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Score: {formatScore(ev.score)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Calendar className="w-3 h-3" />
                  <span>Date: {ev.event_date}</span>
                </div>

                {ev.details && Object.keys(ev.details).length > 0 && (
                  <div className="text-[11px] text-slate-500 pt-1">
                    {Object.entries(ev.details)
                      .filter(([_, v]) => v !== null && v !== undefined && v !== '')
                      .map(([k, v]) => (
                        <span key={k} className="mr-3">
                          <strong className="text-slate-700 dark:text-slate-300 capitalize">
                            {k.replace('_', ' ')}:
                          </strong>{' '}
                          {String(v)}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Outcome Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Record Clinical Recovery Evaluation"
        >
          <form onSubmit={handleRecord} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Outcome Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              >
                <option value="DISCHARGED_RECOVERED">DISCHARGED_RECOVERED</option>
                <option value="IMPROVING">IMPROVING</option>
                <option value="STABLE">STABLE</option>
                <option value="COMPLICATIONS">COMPLICATIONS</option>
                <option value="READMITTED">READMITTED</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Recorded Date *
                </label>
                <Input
                  type="date"
                  required
                  value={dateVal}
                  onChange={(e) => setDateVal(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Outcome Score (0-100)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Clinical Observations / Follow-up Notes
              </label>
              <textarea
                rows={3}
                placeholder="Post-discharge recovery progress, functional independence, vitals..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                Save Evaluation
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
