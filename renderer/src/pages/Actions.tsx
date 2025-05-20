// renderer/src/pages/Actions.tsx
import React, { useState } from 'react';
import ActionPool, { ACTIONS } from '../components/ActionPool';

export default function Actions() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <div>
      <ActionPool onAdd={act => setSelected(s => [...s, act])} />
      <pre className="mt-4 bg-gray-50 p-2 rounded">
        {JSON.stringify(selected, null, 2)}
      </pre>
    </div>
  );
}
