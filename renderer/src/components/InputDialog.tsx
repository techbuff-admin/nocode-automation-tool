// renderer/src/components/InputDialog.tsx
import React, { useState, useEffect } from 'react';

interface InputDialogProps {
  open: boolean;
  title: string;
  label: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export default function InputDialog({
  open,
  title,
  label,
  defaultValue = '',
  onSubmit,
  onCancel,
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue);

  // reset when opened
  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 w-80">
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        <label className="block text-sm mb-1">{label}</label>
        <input
          type="text"
          className="w-full border rounded px-2 py-1 mb-4"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(value.trim())}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
