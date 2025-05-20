// renderer/src/pages/Suite.tsx
import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectContext } from '../context/ProjectContext';
import SuiteManager from '../components/SuiteManager';
import TestCaseBuilder from '../components/TestCaseBuilder';
import FileTree from '../components/FileTree';

export default function Suite() {
  const { projectDir } = useContext(ProjectContext);
  const navigate = useNavigate();
  const [treeKey, setTreeKey] = useState(0);
  const [suites, setSuites] = useState<string[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<string>('');

  // If no projectDir (fresh load), send them back
  useEffect(() => {
    if (!projectDir) {
      navigate('/project-setup', { replace: true });
    }
  }, [projectDir, navigate]);

  const refreshTree = () => setTreeKey((k) => k + 1);

  // Fetch test suite files whenever projectDir or treeKey changes
  useEffect(() => {
    if (!projectDir) return;
    window.api.getFileTree(projectDir).then((nodes: any[]) => {
      const specs = nodes
        .filter((n) => n.type === 'file' && n.path.startsWith('tests/') && n.path.endsWith('.spec.ts'))
        .map((n) => n.path);
      setSuites(specs);
      if (specs.length > 0 && !selectedSuite) {
        setSelectedSuite(specs[0]);
      }
    });
  }, [projectDir, treeKey]);

  if (!projectDir) {
    // optionally render nothing while redirecting
    return null;
  }

  return (
    <div className="flex h-full">
      <aside className="w-64 border-r p-4 overflow-auto">
        <FileTree projectDir={projectDir} key={treeKey} />
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <h2 className="text-2xl font-bold mb-4">Test Suites</h2>

        <SuiteManager projectDir={projectDir} onRefresh={refreshTree} />

        {suites.length > 0 && (
          <div className="mb-4">
            <label className="block mb-1 font-medium">Select Suite:</label>
            <select
              value={selectedSuite}
              onChange={(e) => setSelectedSuite(e.target.value)}
              className="border rounded px-2 py-1"
            >
              {suites.map((s) => (
                <option key={s} value={s}>
                  {s.replace('tests/', '')}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedSuite ? (
          <TestCaseBuilder
            projectDir={projectDir}
            suiteFile={`${projectDir}/${selectedSuite}`}
            onRefresh={refreshTree}
          />
        ) : (
          <p className="text-gray-500">No test suite selected—create one above.</p>
        )}
      </main>
    </div>
  );
}
