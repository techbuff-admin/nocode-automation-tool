// renderer/src/components/PageManager.tsx
import React, { useContext, useEffect, useState } from 'react';
import { ProjectContext } from '../context/ProjectContext';
import { ProjectMeta, TestSuite } from '../../../shared/types';

export default function PageManager({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { projectDir } = useContext(ProjectContext);
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [newPage, setNewPage] = useState('');
  const [newLocator, setNewLocator] = useState({ name: '', selector: '' });
  const [currentPage, setCurrentPage] = useState<string | null>(null);

  useEffect(() => {
    window.api.loadMeta(projectDir!).then(setMeta);
  }, [projectDir]);

  if (!meta) return <p>Loading pages…</p>;

  const pages = Object.keys(meta.pages || {});

  const addPage = () => {
    if (!newPage.trim()) return;
    const pagesObj = { ...(meta.pages || {}), [newPage]: {} };
    setMeta({ ...meta, pages: pagesObj });
    setCurrentPage(newPage);
    setNewPage('');
  };

  const addLocator = () => {
    if (!currentPage || !newLocator.name.trim()) return;
    const pageLocs = meta.pages![currentPage] || {};
    pageLocs[newLocator.name] = newLocator.selector;
    setMeta({
      ...meta,
      pages: { ...meta.pages, [currentPage]: pageLocs },
    });
    setNewLocator({ name: '', selector: '' });
  };

  const save = async () => {
    await window.api.saveMeta(projectDir!, meta);
    onNext();
  };

  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">2. Page Objects</h2>
      <div className="flex space-x-6">
        <div className="w-1/3">
          <h3 className="font-medium">Pages</h3>
          <ul className="space-y-2">
            {pages.map((p) => (
              <li
                key={p}
                className={`p-2 rounded hover:bg-gray-100 cursor-pointer ${
                  currentPage === p ? 'bg-gray-200' : ''
                }`}
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <input
              type="text"
              placeholder="New page name"
              value={newPage}
              onChange={(e) => setNewPage(e.target.value)}
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

        <div className="w-2/3">
          <h3 className="font-medium">
            Locators for &ldquo;{currentPage || 'Select a page'}&rdquo;
          </h3>
          {currentPage && (
            <>
              <ul className="space-y-2 mb-4">
                {Object.entries(meta.pages![currentPage]).map(([n, sel]) => (
                  <li key={n} className="flex justify-between">
                    <span>
                      <strong>{n}</strong>: <code>{sel}</code>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Locator name"
                  value={newLocator.name}
                  onChange={(e) =>
                    setNewLocator((l) => ({ ...l, name: e.target.value }))
                  }
                  className="border rounded px-2 py-1 w-full"
                />
                <input
                  type="text"
                  placeholder="CSS selector"
                  value={newLocator.selector}
                  onChange={(e) =>
                    setNewLocator((l) => ({ ...l, selector: e.target.value }))
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
          )}
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <button onClick={onBack} className="px-4 py-2 border rounded">
          ← Back
        </button>
        <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded">
          Save & Next →
        </button>
      </div>
    </>
  );
}
