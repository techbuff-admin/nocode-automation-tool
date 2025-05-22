// renderer/src/components/SuiteManager.tsx

import React, { useState } from 'react';

interface SuiteManagerProps {
  projectDir: string;
  onRefresh: () => void;
  onBack: () => void;
}

export default function SuiteManager({
  projectDir,
  onRefresh,
  onBack,
}: SuiteManagerProps) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const addSuite = async () => {
    if (!name.trim()) return;
    setCreating(true);
    console.log('[SuiteManager] creating suite:', name, 'in', projectDir);
    try {
      const filePath: string = await window.api.createSuite({
        projectDir,
        suiteName: name,
      });
      console.log('[SuiteManager] suite created at:', filePath);
      setName('');
      onRefresh();
    } catch (err: any) {
      console.error('[SuiteManager] createSuite error:', err);
      if (err.message === 'USER_CANCELLED_SUITE') {
        // user cancelled overwrite—do nothing
      } else {
        alert('Error creating suite:\n' + (err.message || err));
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mb-4">
      <h2 className="text-2xl font-semibold mb-4">3. Test Suites & Cases</h2>
      <div className="flex items-center space-x-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New suite name"
          className="flex-1 border px-2 py-1 rounded"
        />
        <button
          disabled={creating}
          onClick={addSuite}
          className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create Suite'}
        </button>
      </div>
      <button
        onClick={onBack}
        className="mt-4 px-4 py-2 border rounded hover:bg-gray-100"
      >
        ← Back
      </button>
    </div>
  );
}
