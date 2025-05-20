import React, { useState } from 'react';

export default function TestCaseBuilder({ projectDir, suiteFile, onRefresh }) {
  const [code, setCode] = useState('');
  const [adding, setAdding] = useState(false);

  const addCase = async () => {
    if (!code.trim()) return;
    setAdding(true);
    await window.api.createTestCase({
      projectDir,
      suiteFile,
      caseCode: code.trim(),
    });
    setCode('');
    setAdding(false);
    onRefresh();
  };

  return (
    <div className="mb-4">
      <textarea
        rows={4}
        value={code}
        onChange={e => setCode(e.target.value)}
        placeholder="Playwright code…"
        className="w-full border rounded p-2 text-sm"
      />
      <button
        disabled={adding}
        onClick={addCase}
        className="mt-2 bg-green-600 text-white px-4 py-1 rounded"
      >
        {adding ? 'Adding…' : 'Add Test Case'}
      </button>
    </div>
  );
}
