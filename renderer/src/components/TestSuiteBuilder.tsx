import React from 'react';

export default function TestSuiteBuilder({ actions }: { actions: string[] }) {
  return (
    <section>
      <h3 className="text-lg font-semibold">📋 Test Suite</h3>
      {actions.length === 0 ? (
        <p className="mt-2 text-gray-500">No actions yet. Click an action above to add.</p>
      ) : (
        <ol className="list-decimal list-inside mt-2 space-y-1">
          {actions.map((act, i) => (
            <li key={i} className="bg-gray-50 p-2 rounded">
              {act}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
