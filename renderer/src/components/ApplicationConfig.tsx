// renderer/src/components/ApplicationConfig.tsx
import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectContext } from '../context/ProjectContext';
import { ProjectMeta } from '../../../shared/types';

export default function ApplicationConfig({
  onNext,
}: {
  onNext: () => void;
}) {
  const { projectDir } = useContext(ProjectContext);
  const navigate = useNavigate();

  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [saving, setSaving] = useState(false);

  // If no projectDir is set, kick the user back to the projects list
  useEffect(() => {
    if (!projectDir) {
      navigate('/projects', { replace: true });
      return;
    }

    // Load the existing metadata JSON
    window.api
      .loadMeta(projectDir)
      .then(setMeta)
      .catch((err: any) => {
        console.error('loadMeta failed:', err);
        alert('Could not load project configuration. Please recreate or select another project.');
        navigate('/projects', { replace: true });
      });
  }, [projectDir, navigate]);

  const save = async () => {
    // If we don’t have a projectDir or meta yet, do nothing
    if (!meta || !projectDir) return;

    setSaving(true);
    try {
      // Write back the updated metadata JSON
      console.log('[ApplicationConfig] saving meta, projectDir=', projectDir);
     // await window.api.meta.save(projectDir, meta);
      await window.api.saveMeta(projectDir, meta);
      onNext(); // proceed to the next wizard step
    } catch (err: any) {
      console.error('saveMeta failed:', err);
      alert('Error saving configuration: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  // While loading, show a friendly message
  if (!meta) {
    return <p>Loading application settings…</p>;
  }

  return (
    <>
      <h2 className="text-2xl font-semibold mb-4">1. Application Settings</h2>
      <div className="space-y-4 max-w-lg">
        <div>
          <label className="block font-medium mb-1">Base URL</label>
          <input
            type="text"
            value={meta.env.baseUrl}
            onChange={(e) =>
              setMeta({
                ...meta,
                env: { ...meta.env, baseUrl: e.target.value },
              })
            }
            className="w-full border rounded p-2 focus:outline-none focus:border-blue-500"
            placeholder="https://your-app.example.com"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Default Timeout (ms)</label>
          <input
            type="number"
            value={meta.env.timeout}
            onChange={(e) =>
              setMeta({
                ...meta,
                env: { ...meta.env, timeout: parseInt(e.target.value, 10) },
              })
            }
            className="w-full border rounded p-2 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={save}
          disabled={saving || !meta.env.baseUrl.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save & Next'}
        </button>
      </div>
    </>
  );
}
