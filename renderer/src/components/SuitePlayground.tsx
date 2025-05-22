// renderer/src/components/SuitePlayground.tsx
import React, { useContext, useEffect, useState } from 'react';
import { ProjectContext } from '../context/ProjectContext';
import { TestSuite, TestCase, ProjectMeta } from '../../../shared/types';
import {
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import TestCaseBuilder from './TestCaseBuilder';
; // or any icon lib

export default function SuitePlayground({
  onBack,
}: {
  onBack: () => void;
}) {
  const { projectDir } = useContext(ProjectContext);
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [creatingSuite, setCreatingSuite] = useState(false);
  const [newSuiteName, setNewSuiteName] = useState('');
  const [creatingCase, setCreatingCase] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');

  // 1) Load metadata on mount
  useEffect(() => {
    if (!projectDir) return;
    window.api.loadMeta(projectDir).then((m: ProjectMeta) => {
      setMeta(m);
      if (m.suites.length) setSelectedSuite(m.suites[0]);
    });
  }, [projectDir]);

  // 2) Helpers to persist metadata
  const saveMeta = async (updated: ProjectMeta) => {
    setMeta(updated);
    await window.api.saveMeta(projectDir!, updated);
  };

  // 3) Suite CRUD
  const addSuite = async () => {
    if (!newSuiteName.trim() || !meta) return;
    setCreatingSuite(true);
    const suite: TestSuite = { name: newSuiteName.trim(), cases: [] };
    const updated = { ...meta, suites: [...meta.suites, suite] };
    await saveMeta(updated);
    setSelectedSuite(suite);
    setNewSuiteName('');
    setCreatingSuite(false);
  };
  const deleteSuite = async (name: string) => {
    if (!meta || !confirm(`Delete suite "${name}"?`)) return;
    const updated = {
      ...meta,
      suites: meta.suites.filter((s) => s.name !== name),
    };
    await saveMeta(updated);
    setSelectedSuite(null);
    setSelectedCase(null);
  };

  // 4) Case CRUD
  const addCase = async () => {
    if (!selectedSuite || !newCaseName.trim() || !meta) return;
    setCreatingCase(true);
    const updatedSuites = meta.suites.map((s) =>
      s === selectedSuite
        ? {
            ...s,
            cases: [...s.cases, { name: newCaseName.trim(), actions: [] }],
          }
        : s
    );
    const updated = { ...meta, suites: updatedSuites };
    await saveMeta(updated);
    const newSuite = updated.suites.find((s) => s.name === selectedSuite.name)!;
    setSelectedSuite(newSuite);
    setSelectedCase(newSuite.cases[newSuite.cases.length - 1]);
    setNewCaseName('');
    setCreatingCase(false);
  };
  const deleteCase = async (caseName: string) => {
    if (!selectedSuite || !meta || !confirm(`Delete case "${caseName}"?`))
      return;
    const updatedSuites = meta.suites.map((s) =>
      s === selectedSuite
        ? { ...s, cases: s.cases.filter((c) => c.name !== caseName) }
        : s
    );
    const updated = { ...meta, suites: updatedSuites };
    await saveMeta(updated);
    setSelectedCase(null);
  };

  // 5) Render
  return (
    <div className="flex h-full">
      {/* Left sidebar */}
      <aside className="w-64 border-r p-4 overflow-auto space-y-6">
        {/* Create Suite inline */}
        <div>
          <h3 className="font-semibold mb-2">Test Suites</h3>
          <div className="flex space-x-2">
            <input
              className="flex-1 border rounded px-2 py-1"
              value={newSuiteName}
              onChange={(e) => setNewSuiteName(e.target.value)}
              placeholder="+ Suite name"
            />
            <button
              onClick={addSuite}
              disabled={creatingSuite}
              className="p-1 hover:bg-gray-100"
              title="Add Suite"
            >
              <PlusCircleIcon className="h-5 w-5 text-green-600" />
            </button>
          </div>
        </div>

        {/* Suite list */}
        <ul className="space-y-2">
          {meta?.suites.map((s) => (
            <li key={s.name}>
              <div
                className={`flex items-center justify-between p-1 rounded cursor-pointer ${
                  selectedSuite === s ? 'bg-blue-100 font-bold' : 'hover:bg-gray-50'
                }`}
                onClick={() => {
                  setSelectedSuite(s);
                  setSelectedCase(null);
                }}
              >
                <span>📁 {s.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSuite(s.name);
                  }}
                >
                  <TrashIcon className="h-4 w-4 text-red-600" />
                </button>
              </div>

              {/* Cases under this suite */}
              {selectedSuite === s && (
                <ul className="mt-1 ml-4 space-y-1">
                  {s.cases.map((c) => (
                    <li
                      key={c.name}
                      className={`flex justify-between items-center p-1 rounded cursor-pointer ${
                        selectedCase === c ? 'bg-blue-200' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedCase(c)}
                    >
                      <span>📝 {c.name}</span>
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCase(c.name);
                          }}
                        >
                          <TrashIcon className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </li>
                  ))}
                  {/* + Create new case inline */}
                  <li>
                    <div className="flex space-x-2">
                      <input
                        className="flex-1 border rounded px-2 py-1"
                        value={newCaseName}
                        onChange={(e) => setNewCaseName(e.target.value)}
                        placeholder="+ Case name"
                      />
                      <button
                        onClick={addCase}
                        disabled={creatingCase}
                        className="p-1 hover:bg-gray-100"
                      >
                        <PlusCircleIcon className="h-5 w-5 text-green-600" />
                      </button>
                    </div>
                  </li>
                </ul>
              )}
            </li>
          ))}
        </ul>

        <button
          onClick={onBack}
          className="mt-6 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          ← Back
        </button>
      </aside>

      {/* Right detail pane */}
      <main className="flex-1 p-4 overflow-auto bg-white rounded-lg">
        {selectedCase ? (
          <div>
            <h3 className="text-xl font-semibold mb-4">
              Steps for “{selectedCase.name}”
            </h3>
            {/* You can render your existing TestCaseBuilder here, passing the suite+case */}
            <TestCaseBuilder
              projectDir={projectDir!}
              suiteName={selectedSuite!.name}
              caseName={selectedCase.name}
              onMetaChange={setMeta}
            />
          </div>
        ) : selectedSuite ? (
          <p className="text-gray-500">
            Select a test case under “{selectedSuite.name}” to edit steps.
          </p>
        ) : (
          <p className="text-gray-500">No suite selected.</p>
        )}
      </main>
    </div>
  );
}
