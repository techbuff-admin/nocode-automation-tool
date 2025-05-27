// renderer/src/components/MetaEditor.tsx
import React, { useEffect, useState, useContext } from 'react';
import ReactJson from 'react-json-view';
import { ProjectContext } from '../context/ProjectContext';
import { ProjectMeta } from '../../../shared/types';

export default function MetaEditor() {
  const { projectDir } = useContext(ProjectContext);
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [dirty, setDirty] = useState(false);

  // Load on mount
  useEffect(() => {
    if (!projectDir) return;
    window.api.loadMeta(projectDir).then((m) => setMeta(m));
  }, [projectDir]);

  const onEdit = (edit: any) => {
    setMeta(edit.updated_src);
    setDirty(true);
  };

  const onSave = async () => {
    if (!meta || !projectDir) return;
    await window.api.saveMeta(projectDir, meta);
    setDirty(false);
    alert('Specs regenerated!');
  };

  if (!meta) return <div>Loading metadata…</div>;

  return (
    <div>
      <ReactJson
        src={meta}
        name={false}
        enableClipboard={false}
        displayDataTypes={false}
        onEdit={onEdit}
        onAdd={onEdit}
        onDelete={onEdit}
      />
      <button
        onClick={onSave}
        disabled={!dirty}
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
      >
        {dirty ? 'Save & Regenerate' : 'Up to Date'}
      </button>
    </div>
  );
}
