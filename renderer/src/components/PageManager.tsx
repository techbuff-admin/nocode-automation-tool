// renderer/src/components/PageManager.tsx
import React, { useContext, useEffect, useState } from 'react';
import { ProjectContext } from '../context/ProjectContext';
import { ProjectMeta, PageObject } from '../../../shared/types';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function PageManager({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { projectDir } = useContext(ProjectContext);

  // --- State ---
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [newPage, setNewPage] = useState('');
  const [newLocator, setNewLocator] = useState({ name: '', selector: '' });
  const [currentPage, setCurrentPage] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [editingPageName, setEditingPageName] = useState('');
  const [editingLocatorKey, setEditingLocatorKey] = useState<string | null>(null);
  const [editingLocatorValue, setEditingLocatorValue] = useState('');
  const [scanUrl, setScanUrl] = useState('');
  const [extracting, setExtracting] = useState(false);

  // Load metadata from disk
  const loadMeta = async () => {
    if (!projectDir) return;
    const m = await window.api.loadMeta(projectDir);
    setMeta(m);
    // on first load pick first page
    if (m.pages.length && !currentPage) {
      setCurrentPage(m.pages[0].name);
    }
  };

  useEffect(() => {
    loadMeta();
  }, [projectDir]);

  // Save pages back to meta + reload
  const savePages = async (newPages: PageObject[]) => {
    if (!projectDir || !meta) return;
    const updated: ProjectMeta = { ...meta, pages: newPages };
    await window.api.saveMeta(projectDir, updated);
    await loadMeta();
  };

  if (!meta) return <p>Loading pages…</p>;
  const pagesArr = meta.pages;

  // 1) Open a headed browser so user can log in
  const openAndLogin = async () => {
    if (!scanUrl.trim()) return alert('Please enter a URL first.');
    try {
      await window.api.openScanSession(scanUrl.trim());
    } catch (err: any) {
      alert('Failed to open scan session: ' + err.message);
    }
  };

  // 2) Once logged in, extract locators
  const extractLocators = async () => {
    if (!currentPage) return;
    setExtracting(true);
    try {
      const found: Array<{ name: string; selector: string }> =
        await window.api.extractLocators();

      const pageObj = pagesArr.find(p => p.name === currentPage);
      if (!pageObj) throw new Error(`Page "${currentPage}" not found in meta`);

      const merged = { ...(pageObj.selectors || {}) };
      for (const { name, selector } of found) {
        if (!merged[name]) merged[name] = selector;
      }

      await savePages(
        pagesArr.map(p =>
          p.name === currentPage ? { ...p, selectors: merged } : p
        )
      );
    } catch (err: any) {
      alert(`Extraction failed: ${err.message}`);
    } finally {
      setExtracting(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">2. Page Objects</h2>
      <div className="flex space-x-6">
        {/* --- Pages list --- */}
        <div className="w-1/3">
          <h3 className="font-medium mb-2">Pages</h3>
          <ul className="space-y-2">
            {pagesArr.map(p => (
              <li
                key={p.name}
                className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                  p.name === currentPage ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-100'
                }`}
                onClick={() => {
                  setCurrentPage(p.name);
                  setEditingLocatorKey(null);
                }}
              >
                {editingPage === p.name ? (
                  <input
                    className="flex-1 border rounded px-1 py-0"
                    value={editingPageName}
                    onChange={e => setEditingPageName(e.target.value)}
                    onBlur={async () => {
                      const oldName = p.name;
                      const newName = editingPageName.trim();
                      if (newName && newName !== oldName) {
                        if (pagesArr.some(pg => pg.name === newName)) {
                          if (!confirm(`Replace page "${newName}"?`)) {
                            setEditingPage(null);
                            return;
                          }
                          // remove both old & new to avoid duplicate
                          const filtered = pagesArr.filter(
                            pg => pg.name !== oldName && pg.name !== newName
                          );
                          await savePages([...filtered, { ...p, name: newName }]);
                        } else {
                          // simple rename
                          await savePages(
                            pagesArr.map(pg =>
                              pg.name === oldName ? { ...pg, name: newName } : pg
                            )
                          );
                        }
                        if (currentPage === oldName) {
                          setCurrentPage(newName);
                        }
                      }
                      setEditingPage(null);
                    }}
                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                    autoFocus
                  />
                ) : (
                  <span>{p.name}</span>
                )}

                <div className="flex space-x-1">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setEditingPage(p.name);
                      setEditingPageName(p.name);
                    }}
                  >
                    <PencilIcon className="h-4 w-4 text-blue-600" />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm(`Delete page "${p.name}"?`)) {
                        savePages(pagesArr.filter(pg => pg.name !== p.name));
                        if (currentPage === p.name) setCurrentPage(null);
                      }
                    }}
                  >
                    <TrashIcon className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Add new page */}
          <div className="mt-4 space-y-2">
            <input
              type="text"
              placeholder="New page name"
              value={newPage}
              onChange={e => setNewPage(e.target.value)}
              className="border rounded px-2 py-1 w-full"
            />
            <button
              onClick={() => {
                const nm = newPage.trim();
                if (!nm) return;
                // always include selectors: {}
                const pageObj: PageObject = { name: nm, selectors: {} };

                if (pagesArr.some(p => p.name === nm)) {
                  if (!confirm(`Replace page "${nm}"?`)) return;
                  savePages(
                    pagesArr
                      .filter(p => p.name !== nm)
                      .concat(pageObj)
                  );
                } else {
                  savePages([...pagesArr, pageObj]);
                }
                setCurrentPage(nm);
                setNewPage('');
              }}
              className="px-3 py-1 bg-green-600 text-white rounded w-full"
            >
              Add Page
            </button>
          </div>
        </div>

        {/* --- Locators + Scan panel --- */}
        <div className="w-2/3 space-y-4">
          <h3 className="font-medium mb-2">
            Locators for “{currentPage || 'Select a page'}”
          </h3>

          {/* Open & Log In / Extract */}
          <div className="flex space-x-2 mb-4">
            <input
              type="text"
              placeholder="https://example.com/login"
              value={scanUrl}
              onChange={e => setScanUrl(e.target.value)}
              className="flex-1 border rounded px-2 py-1"
            />
            <button
              onClick={openAndLogin}
              className="px-4 py-1 bg-purple-600 text-white rounded"
            >
              Open & Log In
            </button>
            <button
              onClick={extractLocators}
              disabled={!currentPage || extracting}
              className="px-4 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {extracting ? 'Extracting…' : 'Extract Locators'}
            </button>
          </div>

          {/* Render locators or placeholder */}
          {currentPage ? (
            (() => {
              const pageObj = pagesArr.find(p => p.name === currentPage);
              if (!pageObj) {
                return <p className="text-red-500">Error: page not found in meta</p>;
              }
              const locators = pageObj.selectors || {};
              return (
                <>
                  {/* Locator list */}
                  <ul className="space-y-2 mb-4">
                    {Object.entries(locators).map(([key, sel]) => (
                      <li key={key} className="flex items-center justify-between">
                        {editingLocatorKey === key ? (
                          <div className="flex space-x-2 items-center">
                            <input
                              className="border rounded px-1 py-0"
                              value={editingLocatorKey}
                              onChange={e => setEditingLocatorKey(e.target.value)}
                            />
                            <input
                              className="border rounded px-1 py-0"
                              value={editingLocatorValue}
                              onChange={e => setEditingLocatorValue(e.target.value)}
                            />
                            <button
                              className="px-2 bg-blue-500 text-white rounded"
                              onClick={async () => {
                                const old = key;
                                const nw = (editingLocatorKey || '').trim();
                                const updated = { ...locators };
                                delete updated[old];
                                updated[nw] = editingLocatorValue;
                                await savePages(
                                  pagesArr.map(p =>
                                    p.name === currentPage ? { ...p, selectors: updated } : p
                                  )
                                );
                                setEditingLocatorKey(null);
                              }}
                            >
                              Save
                            </button>
                            <button onClick={() => setEditingLocatorKey(null)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span>
                              <strong>{key}</strong>: <code>{sel}</code>
                            </span>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => {
                                  setEditingLocatorKey(key);
                                  setEditingLocatorValue(sel);
                                }}
                              >
                                <PencilIcon className="h-4 w-4 text-blue-600" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Delete locator "${key}"?`)) {
                                    const updated = { ...locators };
                                    delete updated[key];
                                    savePages(
                                      pagesArr.map(p =>
                                        p.name === currentPage
                                          ? { ...p, selectors: updated }
                                          : p
                                      )
                                    );
                                  }
                                }}
                              >
                                <TrashIcon className="h-4 w-4 text-red-600" />
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                    {Object.keys(locators).length === 0 && (
                      <li className="text-gray-500">No locators yet.</li>
                    )}
                  </ul>

                  {/* Manual add */}
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Locator name"
                      value={newLocator.name}
                      onChange={e =>
                        setNewLocator({ ...newLocator, name: e.target.value })
                      }
                      className="border rounded px-2 py-1 w-full"
                    />
                    <input
                      type="text"
                      placeholder="CSS selector"
                      value={newLocator.selector}
                      onChange={e =>
                        setNewLocator({ ...newLocator, selector: e.target.value })
                      }
                      className="border rounded px-2 py-1 w-full"
                    />
                    <button
                      onClick={() => {
                        if (!currentPage) return;
                        const nm = newLocator.name.trim();
                        const vl = newLocator.selector.trim();
                        if (!nm || !vl) return;
                        const updated = { ...locators, [nm]: vl };
                        savePages(
                          pagesArr.map(p =>
                            p.name === currentPage ? { ...p, selectors: updated } : p
                          )
                        );
                        setNewLocator({ name: '', selector: '' });
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded w-full"
                    >
                      Add Locator
                    </button>
                  </div>
                </>
              );
            })()
          ) : (
            <p className="text-gray-500">Select a page to view locators.</p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button onClick={onBack} className="px-4 py-2 border rounded">
          ← Back
        </button>
        <button onClick={onNext} className="px-4 py-2 bg-blue-600 text-white rounded">
          Save & Next →
        </button>
      </div>
    </>
  );
}

