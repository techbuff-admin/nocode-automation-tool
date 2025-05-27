import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectContext } from '../context/ProjectContext';

export default function ProjectSetup() {
  const {
    basePath,
    setBasePath,
    projectName,
    setProjectName,
    setProjectDir,
  } = useContext(ProjectContext);

  const [status, setStatus] = useState<'idle' | 'creating' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();

  // 1) On mount, fetch the root nca-projects directory
  useEffect(() => {
    window.api.getRootProjectsDir().then((root) => {
      setBasePath(root);
    });
  }, [setBasePath]);

  // 2) Handler to scaffold the new project under basePath
  const handleCreate = async () => {
    if (!basePath || !projectName.trim()) return;
       // ← new: duplicate‐project check
   const name = projectName.trim();
   const fullPath = `${basePath}/${name}`;
   const exists = await window.api.pathExists(fullPath);
   if (exists) {
     const ok = confirm(
       `Project with the same name already exists. Would you like to replace it?`
     );
     if (!ok) return;
     // ← new: remove the old directory so we can recreate
     const fullPath = basePath + "/" + projectName
     await window.api.deletePath(fullPath);
   }  
    setStatus('creating');
    setError('');
    try {
      // this will mkdir <basePath>/<projectName> and install everything
      const fullPath = await window.api.createProject({
        basePath,
        projectName: projectName.trim(),
      });
      // save the active project into context
      setProjectDir(fullPath);
      setStatus('done');
      // navigate into the suite page
      navigate('/suite');
    } catch (e: any) {
      setError(e.message || String(e));
      setStatus('error');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Create New Project</h2>

      {/* 3) Show the fixed root directory */}
      <p className="mb-4 text-sm text-gray-600">
        Projects will be created under: <code>{basePath || 'Loading…'}</code>
      </p>

      {/* 4) Input for project name */}
      <div className="mb-4">
        <label className="block mb-1 font-medium">Project Name</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:border-blue-500"
          placeholder="Enter a unique name"
        />
      </div>

      {/* 5) Create button */}
      <button
        onClick={handleCreate}
        disabled={
          status === 'creating' ||
          !basePath ||
          !projectName.trim()
        }
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {status === 'creating' ? 'Creating…' : 'Create Project'}
      </button>

      {/* 6) Status messages */}
      {status === 'done' && (
        <div className="mt-4 text-green-600">
          Project “{projectName}” created successfully!
        </div>
      )}
      {status === 'error' && (
        <div className="mt-4 text-red-600">
          Error: {error}
        </div>
      )}
    </div>
  );
}
