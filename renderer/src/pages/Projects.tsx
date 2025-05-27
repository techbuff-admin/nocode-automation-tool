// renderer/src/pages/Projects.tsx
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectContext } from '../context/ProjectContext';
import { TrashIcon } from '@heroicons/react/24/outline';

export default function Projects() {
  const [rootDir, setRootDir] = useState<string>('');
  const [projects, setProjects] = useState<{ name: string; path: string }[]>([]);
  const { basePath, setProjectDir, setProjectName } = useContext(ProjectContext);
  const navigate = useNavigate();

  // On mount, fetch root directory & list of projects
  useEffect(() => {
    window.api.getRootProjectsDir().then((d) => {
      setRootDir(d);
      window.api.listProjects().then(setProjects);
    });
  }, []);

  // Open a project
  const openProject = (proj: { name: string; path: string }) => {
    setProjectDir(proj.path);
    setProjectName(proj.name);
    navigate('/suite');
  };

  // Delete a project folder, after confirmation
  const deleteProject = async (proj: { name: string; path: string }) => {
    if (!basePath) return;
    if (
      !confirm(`Delete project "${proj.name}" and all its tests? This cannot be undone.`)
    )
      return;

    // Remove folder on disk
    await window.api.deletePath(proj.path);

    // If this was the active project, clear the context
    setProjectDir(null);
    setProjectName('');

    // Update UI
    setProjects((ps) => ps.filter((p) => p.path !== proj.path));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Your Projects</h2>
      <p className="mb-4 text-sm text-gray-600">
        All projects live in: <code>{rootDir || 'Loading…'}</code>
      </p>

      {projects.length === 0 ? (
        <p className="text-gray-500 mb-6">
          No projects yet. Click “New Project” below.
        </p>
      ) : (
        <ul className="space-y-2 mb-6">
          {projects.map((proj) => (
            <li
              key={proj.path}
              className="flex items-center justify-between p-2 bg-gray-50 hover:bg-gray-100 rounded"
            >
              <button
                onClick={() => openProject(proj)}
                className="flex-1 text-left"
              >
                {proj.name}
              </button>
              <button
                onClick={() => deleteProject(proj)}
                className="p-1 hover:bg-red-100 rounded"
                title={`Delete project ${proj.name}`}
              >
                <TrashIcon className="h-5 w-5 text-red-600" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => navigate('/project-setup')}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        New Project
      </button>
    </div>
  );
}
