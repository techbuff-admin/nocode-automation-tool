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
import HookBuilder from './HookBuilder';

type HookName = 'beforeAll' | 'beforeEach' | 'afterEach' | 'afterAll';

export default function SuitePlayground({ onBack }: { onBack: () => void }) {
  const { projectDir } = useContext(ProjectContext);

  // --- State ---
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [editingHook, setEditingHook] = useState<HookName | null>(null);

  // Inline‐edit state
  const [editingSuite, setEditingSuite] = useState<string | null>(null);
  const [editingSuiteName, setEditingSuiteName] = useState('');
  const [editingCase, setEditingCase] = useState<string | null>(null);
  const [editingCaseName, setEditingCaseName] = useState('');

  const [creatingSuite, setCreatingSuite] = useState(false);
  const [newSuiteName, setNewSuiteName] = useState('');
  const [creatingCase, setCreatingCase] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');

  // Load on mount
  useEffect(() => {
    if (!projectDir) return;
    window.api.loadMeta(projectDir).then(m => {
      setMeta(m);
      if (m.suites.length) setSelectedSuite(m.suites[0]);
    });
  }, [projectDir]);

  // Save & re‐select to keep sidebar open
  const saveMeta = async (updated: ProjectMeta) => {
    setMeta(updated);
    if (selectedSuite) {
      const reSel = updated.suites.find(s => s.name === selectedSuite.name) || null;
      setSelectedSuite(reSel);
      if (selectedCase && reSel) {
        const reCase = reSel.cases.find(c => c.name === selectedCase.name) || null;
        setSelectedCase(reCase);
      }
    }
    await window.api.saveMeta(projectDir!, updated);
  };

  // --- Suite CRUD ---
  const addSuite = async () => {
    if (!newSuiteName.trim() || !meta) return;
    const name = newSuiteName.trim();
    // duplicate‐suite check
    const exists = meta.suites.some(s => s.name === name);
    if (exists) {
      if (!confirm(`Suite "${name}" already exists. Replace it?`)) return;
      meta.suites = meta.suites.filter(s => s.name !== name);
    }
    setCreatingSuite(true);
    const s: TestSuite = { name, cases: [], hooks: {} };
    await saveMeta({ ...meta, suites: [...meta.suites, s] });
    setSelectedSuite(s);
    setNewSuiteName('');
    setCreatingSuite(false);
  };
  const deleteSuite = async (name: string) => {
    if (!meta || !confirm(`Delete suite "${name}"?`)) return;
    await saveMeta({ ...meta, suites: meta.suites.filter(s => s.name !== name) });
    setSelectedSuite(null);
    setSelectedCase(null);
    setEditingHook(null);
  };

  // --- Case CRUD ---
  const addCase = async () => {
    if (!selectedSuite || !newCaseName.trim() || !meta) return;
    const name = newCaseName.trim();
    // duplicate‐case
    const caseExists = selectedSuite.cases.some(c => c.name === name);
    if (caseExists) {
      if (!confirm(`Test case "${name}" already exists. Replace it?`)) return;
      selectedSuite.cases = selectedSuite.cases.filter(c => c.name !== name);
    }
    setCreatingCase(true);
    const updated = {
      ...meta,
      suites: meta.suites.map(s =>
        s === selectedSuite
          ? { ...s, cases: [...s.cases, { name, actions: [] }] }
          : s
      ),
    };
    await saveMeta(updated);
    const su = updated.suites.find(s => s.name === selectedSuite.name)!;
    setSelectedSuite(su);
    setSelectedCase(su.cases[su.cases.length - 1]);
    setNewCaseName('');
    setCreatingCase(false);
  };
  const deleteCase = async (caseName: string) => {
    if (!selectedSuite || !confirm(`Delete case "${caseName}"?`)) return;
    const updated = {
      ...meta!,
      suites: meta!.suites.map(s =>
        s === selectedSuite
          ? { ...s, cases: s.cases.filter(c => c.name !== caseName) }
          : s
      ),
    };
    await saveMeta(updated);
    const su = updated.suites.find(s => s.name === selectedSuite.name)!;
    setSelectedSuite(su);
    setSelectedCase(null);
  };

  if (!meta) return <p>Loading test suites…</p>;

  return (
    <div className="flex h-full">
      {/* --- Sidebar --- */}
      <aside className="w-64 border-r p-4 overflow-auto space-y-6">
        {/* Add Suite */}
        <div>
          <h3 className="font-semibold mb-2">Test Suites</h3>
          <div className="flex space-x-2">
            <input
              className="flex-1 border rounded px-2 py-1"
              placeholder="+ Suite name"
              value={newSuiteName}
              onChange={e => setNewSuiteName(e.target.value)}
            />
            <button
              onClick={addSuite}
              disabled={creatingSuite}
              className="p-1 hover:bg-gray-100"
            >
              <PlusCircleIcon className="h-5 w-5 text-green-600" />
            </button>
          </div>
        </div>

        <ul className="space-y-2">
          {meta.suites.map(s => {
            const hooks = s.hooks || {};
            const isSel = selectedSuite === s;

            return (
              <li key={s.name}>
                {/* Suite row w/ inline‐edit */}
                <div
                  className={`flex items-center justify-between p-1 rounded cursor-pointer ${
                    isSel ? 'bg-blue-100 font-bold' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedSuite(s);
                    setSelectedCase(null);
                    setEditingHook(null);
                  }}
                >
                  {editingSuite === s.name ? (
                    <input
                      className="border rounded px-1 py-0 flex-1"
                      value={editingSuiteName}
                      onChange={e => setEditingSuiteName(e.target.value)}
                      onBlur={async () => {
                        const newName = editingSuiteName.trim();
                        if (newName && newName !== s.name && meta) {
                          const dup = meta.suites.some(su => su.name === newName);
                          if (dup) {
                            if (!confirm(`Suite "${newName}" already exists. Replace it?`)) {
                              setEditingSuite(null);
                              return;
                            }
                            meta.suites = meta.suites.filter(su => su.name !== newName);
                          }
                          const updated = {
                            ...meta,
                            suites: meta.suites.map(su =>
                              su.name === s.name ? { ...su, name: newName } : su
                            ),
                          };
                          await saveMeta(updated);
                          setSelectedSuite(
                            updated.suites.find(su => su.name === newName) || null
                          );
                        }
                        setEditingSuite(null);
                      }}
                      onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1">📁 {s.name}</span>
                  )}

                  <div className="flex space-x-1">
                    {editingSuite !== s.name && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setEditingSuite(s.name);
                          setEditingSuiteName(s.name);
                        }}
                      >
                        <PencilIcon className="h-4 w-4 text-blue-600" />
                      </button>
                    )}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        deleteSuite(s.name);
                      }}
                    >
                      <TrashIcon className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>

                {/* ← new: Hooks list with delete */}
                {isSel && (
                  <ul className="ml-4 mt-2 space-y-1">
                    {(['beforeAll','beforeEach','afterEach','afterAll'] as HookName[]).map(
                      hook => {
                        const exists = Array.isArray(hooks[hook]) && hooks[hook]!.length > 0;
                        return exists ? (
                          <li
                            key={hook}
                            className="flex items-center justify-between p-1 rounded bg-gray-50 hover:bg-gray-100"
                          >
                            <button
                              className="flex-1 text-left"
                              onClick={() => setEditingHook(hook)}
                            >
                              {hook}
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  !confirm(
                                    `Delete hook "${hook}" and its actions?`
                                  )
                                )
                                  return;
                                // remove hook entirely
                                const updatedSuite: TestSuite = {
                                  ...s,
                                  hooks: { ...hooks },
                                };
                                delete updatedSuite.hooks![hook];
                                const updated = {
                                  ...meta,
                                  suites: meta.suites.map(su =>
                                    su.name === s.name ? updatedSuite : su
                                  ),
                                };
                                saveMeta(updated);
                                setEditingHook(null);
                              }}
                            >
                              <TrashIcon className="h-4 w-4 text-red-600" />
                            </button>
                          </li>
                        ) : (
                          <li key={hook} className="p-1">
                            <button
                              className="text-green-600 hover:underline"
                              onClick={() => {
                                const updatedSuite: TestSuite = {
                                  ...s,
                                  hooks: { ...hooks, [hook]: [] },
                                };
                                const updated = {
                                  ...meta,
                                  suites: meta.suites.map(su =>
                                    su.name === s.name ? updatedSuite : su
                                  ),
                                };
                                saveMeta(updated).then(() =>
                                  setEditingHook(hook)
                                );
                              }}
                            >
                              + Add {hook}
                            </button>
                          </li>
                        );
                      }
                    )}
                  </ul>
                )}

                {/* Cases list */}
                {isSel && (
                  <ul className="mt-1 ml-4 space-y-1">
                    {s.cases.map(c => {
                      const isCaseSel = selectedCase === c;
                      return (
                        <li
                          key={c.name}
                          className={`flex justify-between items-center p-1 rounded cursor-pointer ${
                            isCaseSel ? 'bg-blue-200' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            setSelectedCase(c);
                            setEditingHook(null);
                          }}
                        >
                          {editingCase === c.name ? (
                            <input
                              className="border rounded px-1 py-0 flex-1"
                              value={editingCaseName}
                              onChange={e => setEditingCaseName(e.target.value)}
                              onBlur={async () => {
                                const newName = editingCaseName.trim();
                                if (
                                  newName &&
                                  newName !== c.name &&
                                  selectedSuite &&
                                  meta
                                ) {
                                  const dup = selectedSuite.cases.some(
                                    tc => tc.name === newName
                                  );
                                  if (dup) {
                                    if (
                                      !confirm(
                                        `Test case "${newName}" already exists. Replace it?`
                                      )
                                    ) {
                                      setEditingCase(null);
                                      return;
                                    }
                                    selectedSuite.cases = selectedSuite.cases.filter(
                                      tc => tc.name !== newName
                                    );
                                  }
                                  const updatedSuite: TestSuite = {
                                    ...selectedSuite,
                                    cases: selectedSuite.cases.map(tc =>
                                      tc.name === c.name
                                        ? { ...tc, name: newName }
                                        : tc
                                    ),
                                  };
                                  const updated = {
                                    ...meta,
                                    suites: meta.suites.map(su =>
                                      su.name === selectedSuite.name
                                        ? updatedSuite
                                        : su
                                    ),
                                  };
                                  await saveMeta(updated);
                                  setSelectedCase(
                                    updatedSuite.cases.find(
                                      tc => tc.name === newName
                                    ) || null
                                  );
                                }
                                setEditingCase(null);
                              }}
                              onKeyDown={e =>
                                e.key === 'Enter' && (e.currentTarget.blur())
                              }
                              autoFocus
                            />
                          ) : (
                            <span className="flex-1">📝 {c.name}</span>
                          )}

                          <div className="flex space-x-1">
                            {editingCase !== c.name && (
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setEditingCase(c.name);
                                  setEditingCaseName(c.name);
                                }}
                              >
                                <PencilIcon className="h-4 w-4 text-blue-600" />
                              </button>
                            )}
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                deleteCase(c.name);
                              }}
                            >
                              <TrashIcon className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                    {/* Add Case */}
                    <li>
                      <div className="flex space-x-2">
                        <input
                          className="flex-1 border rounded px-2 py-1"
                          placeholder="+ Case name"
                          value={newCaseName}
                          onChange={e => setNewCaseName(e.target.value)}
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
            );
          })}
        </ul>

        <button
          onClick={onBack}
          className="mt-6 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          ← Back
        </button>
      </aside>

      {/* Right pane */}
      <main className="flex-1 p-4 overflow-auto bg-white rounded-lg">
        {selectedSuite ? (
          editingHook ? (
            <HookBuilder
              projectDir={projectDir!}
              suiteName={selectedSuite.name}
              hookName={editingHook}
              meta={meta}
              onMetaChange={saveMeta}
            />
          ) : selectedCase ? (
            <div>
              <h3 className="text-xl font-semibold mb-4">
                Steps for “{selectedCase.name}”
              </h3>
              <TestCaseBuilder
                projectDir={projectDir!}
                suiteName={selectedSuite.name}
                caseName={selectedCase.name}
                meta={meta}
                onMetaChange={saveMeta}
              />
            </div>
          ) : (
            <p className="text-gray-500">
              Select a test case or hook under “{selectedSuite.name}” to edit.
            </p>
          )
        ) : (
          <p className="text-gray-500">No suite selected.</p>
        )}
      </main>
    </div>
  );
}
