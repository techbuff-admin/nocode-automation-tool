// renderer/src/components/PageManager.tsx
import React, { useContext, useEffect, useState } from 'react';
import { ProjectContext } from '../context/ProjectContext';
import { ProjectMeta, PageObject } from '../../../shared/types';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Spinner from './Spinner';

interface Locator { name: string; selector: string; }

export default function PageManager({ onNext, onBack }: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { projectDir } = useContext(ProjectContext);

  // ─── State ────────────────────────────────────────────────
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [currentPage, setCurrentPage] = useState<string | null>(null);
  const [newPage, setNewPage] = useState('');
  const [scanUrl, setScanUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  // Inline edits
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [editingPageName, setEditingPageName] = useState('');
  const [editingLocatorKey, setEditingLocatorKey] = useState<string | null>(null);
  const [editingLocatorValue, setEditingLocatorValue] = useState('');

  // Manual locator-add
  const [newLocator, setNewLocator] = useState({ name: '', selector: '' });

  // Modal for element screenshot
  const [modal, setModal] = useState<{ open: boolean; imageSrc: string; label: string }>({
    open: false, imageSrc: '', label: ''
  });

  // ─── Load/Refresh metadata ────────────────────────────────
  const loadMeta = async () => {
    if (!projectDir) return;
    const m = await window.api.loadMeta(projectDir);
    setMeta(m);
    if (!currentPage && m.pages.length) {
      setCurrentPage(m.pages[0].name);
    }
  };
  useEffect(() => { loadMeta(); }, [projectDir]);

  const savePages = async (newPages: PageObject[]) => {
    if (!meta || !projectDir) return;
    const updated = { ...meta, pages: newPages };
    setMeta(updated);
    await window.api.saveMeta(projectDir, updated);
  };

  if (!meta) return <p>Loading pages…</p>;
  const pagesArr = meta.pages;
  const pageObj = pagesArr.find(p => p.name === currentPage);

  // ─── Step 1: Open in headed mode ──────────────────────────
  const openAndLogin = async () => {
    if (!scanUrl.trim()) return alert('Please enter a URL first.');
    try {
      await window.api.openScanSession(scanUrl.trim());
    } catch (e: any) {
      alert('Failed to open scan session: ' + e.message);
    }
  };

  // ─── Step 2: Extract & merge locators ─────────────────────
  const generateLocators = async () => {
    if (!currentPage) return;
    setGenerating(true);
    try {
      const found: Locator[] = await window.api.extractLocators();
      if (!pageObj) throw new Error('Page not found');
      const merged = { ...(pageObj.selectors || {}) };
      for (const { name, selector } of found) {
        if (!merged[name]) merged[name] = selector;
      }
      await savePages(
        pagesArr.map(p =>
          p.name === currentPage ? { ...p, selectors: merged } : p
        )
      );
    } catch (e: any) {
      alert('Failed to generate locators: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  // ─── Step 3: Show element thumbnail ──────────────────────
  const showElement = async (key: string) => {
    if (!projectDir) return alert('No projectDir!');
    try {
      const dataUrl = await window.api.captureElement(projectDir, key);
      setModal({ open: true, imageSrc: dataUrl, label: key });
    } catch (e: any) {
      alert('Capture failed: ' + e.message);
    }
  };

  return (
    <div className="relative">
      {generating && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-20">
          <Spinner /><span className="ml-2">Generating locators…</span>
        </div>
      )}

      <h2 className="text-2xl font-semibold mb-4">2. Page Objects</h2>
      <div className="flex space-x-6">

        {/* ─── Pages List ─────────────────────────────────── */}
        <div className="w-1/3">
          <h3 className="font-medium mb-2">Pages</h3>
          <ul className="space-y-2">
            {pagesArr.map(p => (
              <li
                key={p.name}
                className={`flex items-center justify-between p-2 rounded ${
                  p.name === currentPage ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-100 cursor-pointer'
                }`}
              >
                {editingPage === p.name ? (
                  <input
                    className="flex-1 border rounded px-1 py-0"
                    value={editingPageName}
                    onChange={e => setEditingPageName(e.target.value)}
                    onBlur={async () => {
                      const old = p.name;
                      const nw = editingPageName.trim();
                      if (nw && nw !== old) {
                        const exists = pagesArr.some(pg => pg.name === nw);
                        if (exists && !confirm(`Replace page "${nw}"?`)) {
                          setEditingPage(null);
                          return;
                        }
                        const filtered = pagesArr.filter(
                          pg => pg.name !== old && pg.name !== nw
                        );
                        await savePages([...filtered, { ...p, name: nw }]);
                        if (currentPage === old) setCurrentPage(nw);
                      }
                      setEditingPage(null);
                    }}
                    onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                    autoFocus
                  />
                ) : (
                  <span
                    className="flex-1"
                    onClick={() => {
                      setCurrentPage(p.name);
                      setEditingLocatorKey(null);
                    }}
                  >
                    {p.name}
                  </span>
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
                      if (!confirm(`Delete page "${p.name}"?`)) return;
                      const remaining = pagesArr.filter(pg => pg.name !== p.name);
                      savePages(remaining);
                      if (currentPage === p.name) {
                        setCurrentPage(remaining[0]?.name || null);
                      }
                    }}
                  >
                    <TrashIcon className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Add new page w/ duplicate check */}
          <div className="mt-4 space-y-2">
            <input
              type="text"
              placeholder="New page name"
              className="w-full border rounded px-2 py-1"
              value={newPage}
              onChange={e => setNewPage(e.target.value)}
            />
            <button
              onClick={() => {
                const nm = newPage.trim();
                if (!nm) return;
                const obj: PageObject = { name: nm, selectors: {} };
                if (pagesArr.some(p => p.name === nm)) {
                  if (!confirm(`Page "${nm}" already exists. Replace it?`)) {
                    return;
                  }
                  savePages(
                    pagesArr.filter(p => p.name !== nm).concat(obj)
                  );
                } else {
                  savePages([...pagesArr, obj]);
                }
                setCurrentPage(nm);
                setNewPage('');
              }}
              className="w-full bg-green-600 text-white py-1 rounded"
            >
              Add Page
            </button>
          </div>
        </div>

        {/* ─── Scan & Locator Panel ────────────────────────── */}
        <div className="w-2/3 space-y-4">
          <h3 className="font-medium mb-2">Locators for “{currentPage || '…'}”</h3>

          <div className="flex space-x-2 mb-4">
            <input
              type="text"
              placeholder="https://example.com/login"
              className="flex-1 border rounded px-2 py-1"
              value={scanUrl}
              onChange={e => setScanUrl(e.target.value)}
            />
            <button
              onClick={openAndLogin}
              className="px-4 bg-purple-600 text-white rounded"
            >
              Open & Log In
            </button>
            <button
              onClick={generateLocators}
              disabled={!currentPage}
              className="px-4 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              Generate Locators
            </button>
          </div>

          {pageObj ? (
            <>
              <ul className="space-y-2 mb-4">
                {Object.entries(pageObj.selectors).map(([key, sel]) => (
                  <li
                    key={key}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    {editingLocatorKey === key ? (
                      <div className="flex-1 flex space-x-2">
                        <input
                          className="flex-1 border rounded px-1 py-0"
                          value={editingLocatorKey}
                          onChange={e => setEditingLocatorKey(e.target.value)}
                        />
                        <input
                          className="flex-1 border rounded px-1 py-0"
                          value={editingLocatorValue}
                          onChange={e => setEditingLocatorValue(e.target.value)}
                        />
                        <button
                          onClick={async () => {
                            const old = key;
                            const nw = (editingLocatorKey || '').trim();
                            const map = { ...pageObj.selectors };
                            delete map[old];
                            map[nw] = editingLocatorValue.trim();
                            await savePages(
                              pagesArr.map(p =>
                                p.name === currentPage ? { ...p, selectors: map } : p
                              )
                            );
                            setEditingLocatorKey(null);
                            setEditingLocatorValue('');
                          }}
                          className="px-2 bg-green-600 text-white rounded text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingLocatorKey(null);
                            setEditingLocatorValue('');
                          }}
                          className="px-2 bg-gray-300 rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1">
                          <strong className="mr-2">{key}</strong>
                          <code className="text-xs text-gray-600">{sel}</code>
                        </span>
                        <div className="flex space-x-2">
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
                              if (!confirm(`Delete locator "${key}"?`)) return;
                              const map = { ...pageObj.selectors };
                              delete map[key];
                              savePages(
                                pagesArr.map(p =>
                                  p.name === currentPage ? { ...p, selectors: map } : p
                                )
                              );
                            }}
                          >
                            <TrashIcon className="h-4 w-4 text-red-600" />
                          </button>
                          <button
                            onClick={() => showElement(key)}
                            className="px-2 bg-indigo-600 text-white text-xs rounded"
                          >
                            Show
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
                {Object.keys(pageObj.selectors).length === 0 && (
                  <li className="text-gray-500 italic">No locators yet.</li>
                )}
              </ul>

              {/* Manual Add Locator */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Locator name"
                  className="w-full border rounded px-2 py-1"
                  value={newLocator.name}
                  onChange={e =>
                    setNewLocator(n => ({ ...n, name: e.target.value }))
                  }
                />
                <input
                  type="text"
                  placeholder="CSS selector"
                  className="w-full border rounded px-2 py-1"
                  value={newLocator.selector}
                  onChange={e =>
                    setNewLocator(n => ({ ...n, selector: e.target.value }))
                  }
                />
                <button
                  onClick={async () => {
                    if (!currentPage) return;
                    const nm = newLocator.name.trim();
                    const vl = newLocator.selector.trim();
                    if (!nm || !vl) return;
                    const map = { ...pageObj.selectors, [nm]: vl };
                    await savePages(
                      pagesArr.map(p =>
                        p.name === currentPage ? { ...p, selectors: map } : p
                      )
                    );
                    setNewLocator({ name: '', selector: '' });
                  }}
                  className="w-full bg-green-600 text-white py-1 rounded"
                >
                  Add Locator
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500">Select a page to view locators.</p>
          )}
        </div>
      </div>

      {/* Thumbnail Modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-30 flex items-center justify-center">
          <div className="bg-white p-4 rounded max-w-xl max-h-[80vh] overflow-auto">
            <h4 className="mb-2">{modal.label}</h4>
            <img
              src={modal.imageSrc}
              alt={modal.label}
              className="max-w-full max-h-[70vh]"
            />
            <div className="mt-2 text-right">
              <button
                onClick={() => setModal(m => ({ ...m, open: false }))}
                className="px-3 py-1 bg-gray-300 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button onClick={onBack} className="px-4 py-2 border rounded">← Back</button>
        <button onClick={onNext} className="px-4 py-2 bg-blue-600 text-white rounded">
          Save & Next →
        </button>
      </div>
    </div>
  );
}
