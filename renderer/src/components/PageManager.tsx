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

  // State
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [newPage, setNewPage] = useState('');
  const [newLocator, setNewLocator] = useState({ name: '', selector: '' });
  const [currentPage, setCurrentPage] = useState<string | null>(null);

  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [editingPageName, setEditingPageName] = useState('');

  const [editingLocatorKey, setEditingLocatorKey] = useState<string | null>(null);
  const [editingLocatorValue, setEditingLocatorValue] = useState<string>('');

  // Load metadata
  useEffect(() => {
    if (!projectDir) return;
    window.api.loadMeta(projectDir).then((m: ProjectMeta) => {
      setMeta(m);
      if (m.pages.length && currentPage === null) {
        setCurrentPage(m.pages[0].name);
      }
    });
  }, [projectDir]);

  // Persist pages
  const onPagesChange = async (newPages: PageObject[]) => {
    if (!meta || !projectDir) return;
    const updated: ProjectMeta = { ...meta, pages: newPages };
    setMeta(updated);
    await window.api.saveMeta(projectDir, updated);
  };

  if (!meta) return <p>Loading pages…</p>;

  const pagesArr = meta.pages;

  // Add page
  const addPage = () => {
    const name = newPage.trim();
    if (!name) return;

    // duplicate‐page check
    if (pagesArr.some(p => p.name === name)) {
      const ok = confirm(
        `Page with the same name already exists. Would you like to replace it?`
      );
      if (!ok) return;
      onPagesChange(
        pagesArr
          .filter(p => p.name !== name)
          .concat({ name, selectors: {}, file: undefined })
      );
      setCurrentPage(name);
      setNewPage('');
      return;
    }

    onPagesChange([...pagesArr, { name, selectors: {}, file: undefined }]);
    setCurrentPage(name);
    setNewPage('');
  };

  // Add locator
  const addLocator = () => {
    if (!currentPage) return;
    const key = newLocator.name.trim();
    if (!key) return;
    const val = newLocator.selector;

    // duplicate‐locator check
    const pageObj = pagesArr.find(p => p.name === currentPage);
    if (!pageObj) return;
    const selMap = pageObj.selectors || {};
    if (selMap[key] !== undefined) {
      const ok = confirm(
        `Locator with the same name already exists. Would you like to replace it?`
      );
      if (!ok) return;
    }

    onPagesChange(
      pagesArr.map(p =>
        p.name === currentPage
          ? { ...p, selectors: { ...selMap, [key]: val } }
          : p
      )
    );
    setNewLocator({ name: '', selector: '' });
  };

  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">2. Page Objects</h2>
      <div className="flex space-x-6">
        {/* Pages list */}
        <div className="w-1/3">
          <h3 className="font-medium">Pages</h3>
          <ul className="space-y-2">
            {pagesArr.map(p => (
              <li
                key={p.name}
                className="flex items-center justify-between p-2 rounded hover:bg-gray-100 cursor-pointer"
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
                        // duplicate on inline rename
                        if (pagesArr.some(pg => pg.name === newName)) {
                          const ok = confirm(
                            `Page with the same name already exists. Replace it?`
                          );
                          if (!ok) {
                            setEditingPage(null);
                            return;
                          }
                        }
                        const pageObj = pagesArr.find(pg => pg.name === oldName)!;
                        const filtered = pagesArr.filter(
                          pg => pg.name !== oldName && pg.name !== newName
                        );
                        const renamed = { ...pageObj, name: newName };
                        await onPagesChange([...filtered, renamed]);
                        if (currentPage === oldName) {
                          setCurrentPage(newName);
                        }
                      }
                      setEditingPage(null);
                    }}
                    onKeyDown={e =>
                      e.key === 'Enter' && e.currentTarget.blur()
                    }
                    autoFocus
                  />
                ) : (
                  <span
                    className={`flex-1 ${
                      currentPage === p.name ? 'font-semibold' : ''
                    }`}
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
                      if (confirm(`Delete page "${p.name}"?`)) {
                        onPagesChange(pagesArr.filter(pg => pg.name !== p.name));
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

          {/* Add page */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="New page name"
              value={newPage}
              onChange={e => setNewPage(e.target.value)}
              className="border rounded px-2 py-1 w-full"
            />
            <button
              onClick={addPage}
              className="mt-2 px-3 py-1 bg-green-600 text-white rounded"
            >
              Add Page
            </button>
          </div>
        </div>

        {/* Locators panel */}
        <div className="w-2/3">
          <h3 className="font-medium">
            Locators for “{currentPage || 'Select a page'}”
          </h3>
          {currentPage ? (
            (() => {
              const pageObj = pagesArr.find(p => p.name === currentPage);
              if (!pageObj) return <p className="text-red-500">Error loading page</p>;
              const locators = pageObj.selectors || {};

              return (
                <>
                  <ul className="space-y-2 mb-4">
                    {Object.entries(locators).map(([key, sel]) => (
                      <li
                        key={key}
                        className="flex items-center justify-between"
                      >
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
                              className="px-2"
                              onClick={() => {
                                const oldKey = key;
                                const newKey = (editingLocatorKey || '').trim();
                                const newVal = editingLocatorValue;
                                const selMap = pageObj.selectors || {};

                                // duplicate check
                                if (
                                  newKey !== oldKey &&
                                  selMap[newKey] !== undefined
                                ) {
                                  const ok = confirm(
                                    `Locator with the same name already exists. Replace it?`
                                  );
                                  if (!ok) {
                                    setEditingLocatorKey(null);
                                    return;
                                  }
                                }

                                const updatedSelectors = { ...selMap };
                                delete updatedSelectors[oldKey];
                                updatedSelectors[newKey] = newVal;
                                onPagesChange(
                                  pagesArr.map(p =>
                                    p.name === currentPage
                                      ? { ...p, selectors: updatedSelectors }
                                      : p
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
                                    onPagesChange(
                                      pagesArr.map(p =>
                                        p.name === currentPage
                                          ? {
                                              ...p,
                                              selectors: Object.fromEntries(
                                                Object.entries(p.selectors || {}).filter(
                                                  ([k]) => k !== key
                                                )
                                              ),
                                            }
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

                  {/* Add locator */}
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Locator name"
                      value={newLocator.name}
                      onChange={e =>
                        setNewLocator(l => ({ ...l, name: e.target.value }))
                      }
                      className="border rounded px-2 py-1 w-full"
                    />
                    <input
                      type="text"
                      placeholder="CSS selector"
                      value={newLocator.selector}
                      onChange={e =>
                        setNewLocator(l => ({ ...l, selector: e.target.value }))
                      }
                      className="border rounded px-2 py-1 w-full"
                    />
                    <button
                      onClick={addLocator}
                      className="px-3 py-1 bg-green-600 text-white rounded"
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

      {/* Navigation buttons */}
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
