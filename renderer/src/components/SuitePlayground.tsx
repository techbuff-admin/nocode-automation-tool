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

export default function SuitePlayground({ onBack }: { onBack: () => void }) {
  const { projectDir } = useContext(ProjectContext);
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);

  const [creatingSuite, setCreatingSuite] = useState(false);
  const [newSuiteName, setNewSuiteName] = useState('');

  const [creatingCase, setCreatingCase] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');

  // ← new: inline‐edit state
  const [editingSuite, setEditingSuite] = useState<string | null>(null);
  const [editSuiteName, setEditSuiteName] = useState('');
  const [editingCase, setEditingCase] = useState<string | null>(null);
  const [editCaseName, setEditCaseName] = useState('');

  // 1) Load metadata
  useEffect(() => {
    if (!projectDir) return;
    window.api.loadMeta(projectDir).then(m => {
      setMeta(m);
      if (m.suites.length) setSelectedSuite(m.suites[0]);
    });
  }, [projectDir]);

  // 2) Save helper
  const saveMeta = async (updated: ProjectMeta) => {
    setMeta(updated);
    await window.api.saveMeta(projectDir!, updated);
  };

  // 3) Suite CRUD
  const addSuite = async () => {
    if (!newSuiteName.trim() || !meta) return;
    const suiteName = newSuiteName.trim();
    // duplicate check
    if (meta.suites.some(s => s.name === suiteName)) {
      const ok = confirm(
        `Suite with the same name already exists. Replace it?`
      );
      if (!ok) return;
      meta.suites = meta.suites.filter(s => s.name !== suiteName);
    }
    setCreatingSuite(true);
    const suite: TestSuite = { name: suiteName, cases: [] };
    const updated = { ...meta, suites: [...meta.suites, suite] };
    await saveMeta(updated);
    setSelectedSuite(suite);
    setNewSuiteName('');
    setCreatingSuite(false);
  };
  const deleteSuite = async (name: string) => {
    if (!meta || !confirm(`Delete suite "${name}"?`)) return;
    const updated = { ...meta, suites: meta.suites.filter(s => s.name !== name) };
    await saveMeta(updated);
    setSelectedSuite(null);
    setSelectedCase(null);
  };

  // 4) Case CRUD
  const addCase = async () => {
    if (!selectedSuite || !newCaseName.trim() || !meta) return;
    const caseName = newCaseName.trim();
    // duplicate check
    if (selectedSuite.cases.some(c => c.name === caseName)) {
      const ok = confirm(
        `Test case with the same name already exists. Replace it?`
      );
      if (!ok) return;
      selectedSuite.cases = selectedSuite.cases.filter(c => c.name !== caseName);
    }
    setCreatingCase(true);
    const updatedSuites = meta.suites.map(s =>
      s === selectedSuite
        ? { ...s, cases: [...s.cases, { name: caseName, actions: [] }] }
        : s
    );
    const updated = { ...meta, suites: updatedSuites };
    await saveMeta(updated);
    const newSuite = updated.suites.find(s => s.name === selectedSuite.name)!;
    setSelectedSuite(newSuite);
    setSelectedCase(newSuite.cases[newSuite.cases.length - 1]);
    setNewCaseName('');
    setCreatingCase(false);
  };
  const deleteCase = async (caseName: string) => {
    if (!selectedSuite || !meta || !confirm(`Delete case "${caseName}"?`)) return;
    const updatedSuites = meta.suites.map(s =>
      s === selectedSuite
        ? { ...s, cases: s.cases.filter(c => c.name !== caseName) }
        : s
    );
    const updated = { ...meta, suites: updatedSuites };
    await saveMeta(updated);
    const reselected = updated.suites.find(s => s.name === selectedSuite.name)!;
    setSelectedSuite(reselected);
    setSelectedCase(null);
  };

  // 5) Render
  return (
    <div className="flex h-full">
      <aside className="w-64 border-r p-4 overflow-auto space-y-6">
        {/* Add Suite */}
        <div>
          <h3 className="font-semibold mb-2">Test Suites</h3>
          <div className="flex space-x-2">
            <input
              className="flex-1 border rounded px-2 py-1"
              value={newSuiteName}
              onChange={e => setNewSuiteName(e.target.value)}
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

        {/* Suite List */}
        <ul className="space-y-2">
          {meta?.suites.map(s => (
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
                {/* Inline edit suite */}
                {editingSuite === s.name ? (
                  <input
                    className="flex-1 border-b px-1 py-0"
                    value={editSuiteName}
                    onChange={e => setEditSuiteName(e.target.value)}
                    onBlur={async () => {
                      const newName = editSuiteName.trim();
                      if (meta && newName && newName !== s.name) {
                        // duplicate check on rename
                        if (meta.suites.some(su => su.name === newName)) {
                          const ok = confirm(
                            `Suite with the same name already exists. Replace it?`
                          );
                          if (!ok) {
                            setEditingSuite(null);
                            return;
                          }
                          meta.suites = meta.suites.filter(su => su.name !== newName);
                        }
                        const updatedSuites = meta.suites.map(su =>
                          su.name === s.name ? { ...su, name: newName } : su
                        );
                        const updated = { ...meta, suites: updatedSuites };
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
                  {/* Edit suite */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setEditingSuite(s.name);
                      setEditSuiteName(s.name);
                    }}
                  >
                    <PencilIcon className="h-4 w-4 text-blue-600" />
                  </button>
                  {/* Delete suite */}
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

              {/* Case List */}
              {selectedSuite === s && (
                <ul className="mt-1 ml-4 space-y-1">
                  {s.cases.map(c => (
                    <li
                      key={c.name}
                      className={`flex justify-between items-center p-1 rounded cursor-pointer ${
                        selectedCase === c ? 'bg-blue-200' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedCase(c)}
                    >
                      {/* Inline edit case */}
                      {editingCase === c.name ? (
                        <input
                          className="flex-1 border-b px-1 py-0"
                          value={editCaseName}
                          onChange={e => setEditCaseName(e.target.value)}
                          onBlur={async () => {
                            const newName = editCaseName.trim();
                            if (
                              meta &&
                              selectedSuite &&
                              newName &&
                              newName !== c.name
                            ) {
                              // duplicate check on rename
                              if (
                                selectedSuite.cases.some(cc => cc.name === newName)
                              ) {
                                const ok = confirm(
                                  `Test case with the same name already exists. Replace it?`
                                );
                                if (!ok) {
                                  setEditingCase(null);
                                  return;
                                }
                                selectedSuite.cases = selectedSuite.cases.filter(
                                  cc => cc.name !== newName
                                );
                              }
                              const updatedSuites = meta.suites.map(su =>
                                su === selectedSuite
                                  ? {
                                      ...su,
                                      cases: su.cases.map(cc =>
                                        cc.name === c.name
                                          ? { ...cc, name: newName }
                                          : cc
                                      ),
                                    }
                                  : su
                              );
                              const updated = { ...meta, suites: updatedSuites };
                              await saveMeta(updated);
                              const newSuite = updated.suites.find(
                                su => su.name === selectedSuite.name
                              )!;
                              setSelectedSuite(newSuite);
                              setSelectedCase(
                                newSuite.cases.find(cc => cc.name === newName) || null
                              );
                            }
                            setEditingCase(null);
                          }}
                          onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                          autoFocus
                        />
                      ) : (
                        <span className="flex-1">📝 {c.name}</span>
                      )}
                      <div className="flex space-x-1">
                        {/* Edit case */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setEditingCase(c.name);
                            setEditCaseName(c.name);
                          }}
                        >
                          <PencilIcon className="h-4 w-4 text-blue-600" />
                        </button>
                        {/* Delete case */}
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
                  ))}
                  {/* + Create new case */}
                  <li>
                    <div className="flex space-x-2">
                      <input
                        className="flex-1 border rounded px-2 py-1"
                        value={newCaseName}
                        onChange={e => setNewCaseName(e.target.value)}
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

        {/* Back */}
        <button
          onClick={onBack}
          className="mt-6 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          ← Back
        </button>
      </aside>

      {/* Detail Pane */}
      <main className="flex-1 p-4 overflow-auto bg-white rounded-lg">
        {selectedCase ? (
          <div>
            <h3 className="text-xl font-semibold mb-4">
              Steps for “{selectedCase.name}”
            </h3>
            <TestCaseBuilder
              projectDir={projectDir!}
              suiteName={selectedSuite!.name}
              caseName={selectedCase.name}
              meta={meta!}  
              onMetaChange={saveMeta}
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
