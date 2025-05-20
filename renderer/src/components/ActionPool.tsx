import React from 'react';

export const ACTIONS = [
  { id: 'click', label: 'Click' },
  { id: 'fill',  label: 'Fill Text' },
  { id: 'wait',  label: 'Wait' },
  { id: 'select',label: 'Select Dropdown' },
];

export default function ActionPool({ onAdd }: { onAdd: (actionId: string) => void }) {
  return (
    <section className="mb-6">
      <h3 className="text-lg font-semibold">🧰 Action Pool</h3>
      <div className="grid grid-cols-4 gap-2 mt-2">
        {ACTIONS.map(a => (
          <button
            key={a.id}
            onClick={() => onAdd(a.id)}
            className="border rounded px-3 py-1 hover:bg-gray-200"
          >
            {a.label}
          </button>
        ))}
      </div>
    </section>
  );
}
