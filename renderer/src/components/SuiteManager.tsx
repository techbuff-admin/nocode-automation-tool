import React, { useState } from 'react';

export default function SuiteManager({ projectDir, onRefresh }) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const addSuite = async () => {
    if (!name.trim()) return;
    setCreating(true);
    await window.api.createSuite({ projectDir, suiteName: name });
    setName('');
    setCreating(false);
    onRefresh(); // re-read file tree
  };

  return (
    <div className="mb-4">
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="New suite name"
        className="border px-2 py-1 rounded"
      />
      <button
        disabled={creating}
        onClick={addSuite}
        className="ml-2 bg-blue-600 text-white px-4 py-1 rounded"
      >
        {creating ? 'Creating…' : 'Create Suite'}
      </button>
    </div>
  );
}
