import React from 'react';
import Modal from './Modal';
import { AlertCircle } from 'lucide-react';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", type = "danger" }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${type === 'danger' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="space-y-1.5 flex-1">
          <p className="font-semibold text-slate-700">{message}</p>
          <p className="text-xs text-slate-400">This action will take effect immediately on session scope.</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-205 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition ${
            type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
