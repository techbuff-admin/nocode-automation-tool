import React, { useState,useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectContext } from '../context/ProjectContext';

export default function ProjectSetup() {
  const [location, setLocation] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [status, setStatus] = useState<'idle'|'creating'|'done'|'error'>('idle');
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const { setProjectDir } = useContext(ProjectContext);

  const pickFolder = async () => {
    const dir = await window.api.selectDirectory();
    if (dir) setLocation(dir);
  };

  const handleCreate = async () => {
    if (!location || !projectName.trim()) return;
    setStatus('creating');
    setError('');
    try {
      const fullPath = await window.api.createProject({
        basePath: location,
        projectName: projectName.trim(),
      });
      setProjectDir(fullPath);
      setStatus('done');
      // pass the projectDir into your context or local storage if needed
      // then navigate to Test Suite page:
      navigate('/suite', { state: { projectDir: fullPath } });
    } catch (e: any) {
      setError(e.message || String(e));
      setStatus('error');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Create New Project</h2>

      <div className="mb-4">
        <button
          onClick={pickFolder}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          {location ? 'Change Folder' : 'Select Folder'}
        </button>
        {location && (
          <div className="mt-2 text-sm text-gray-600">📁 {location}</div>
        )}
      </div>

      {location && (
        <div className="mb-4">
          <label className="block mb-1">Project Name</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      )}

      <button
        onClick={handleCreate}
        disabled={status === 'creating' || !location || !projectName.trim()}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {status === 'creating' ? 'Creating…' : 'Create Project'}
      </button>

      {status === 'done' && (
        <div className="mt-4 text-green-600">Project created successfully!</div>
      )}
      {status === 'error' && (
        <div className="mt-4 text-red-600">Error: {error}</div>
      )}
    </div>
  );
}
