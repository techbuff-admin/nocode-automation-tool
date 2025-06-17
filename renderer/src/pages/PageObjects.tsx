// renderer/src/pages/PageObjects.tsx
import React, { useContext, useEffect, useState } from 'react';
import { ProjectContext } from '../context/ProjectContext';
import { ProjectMeta, PageObject } from '../../../shared/types';
import PageObjectScanner from '../components/PageObjectScanner';

export default function PageObjectsPage() {
  const { projectDir } = useContext(ProjectContext)!;
  const [meta, setMeta] = useState<ProjectMeta | null>(null);

  // Load current meta
  useEffect(() => {
    if (!projectDir) return;
    window.api.loadMeta(projectDir).then(setMeta);
  }, [projectDir]);

  // Save new pages
  const onGenerated = async (newPages: PageObject[]) => {
    if (!meta) return;
    const updated: ProjectMeta = {
      ...meta,
      pages: [...meta.pages, ...newPages],
    };
    await window.api.saveMeta(projectDir, updated);
    setMeta(updated);
  };

  if (!meta) return <p>Loading…</p>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Page Objects</h2>

      {/* Auto-scan button + dialog */}
      <PageObjectScanner onGenerated={onGenerated} />

      {/* Existing page-objects list */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {meta.pages.map((p) => (
          <div key={p.name} className="border rounded-lg p-4 bg-white shadow-sm">
            <h3 className="font-medium mb-2 capitalize">{p.name}</h3>
            <ul className="list-disc ml-5 space-y-1 text-sm">
              {Object.entries(p.selectors).map(([key, sel]) => (
                <li key={key}>
                  <code className="font-mono">{key}</code> →{' '}
                  <code className="font-mono text-gray-700">{sel}</code>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {meta.pages.length === 0 && (
          <p className="text-gray-500 italic">No page objects yet. Scan a page above to get started.</p>
        )}
      </div>
    </div>
  );
}
