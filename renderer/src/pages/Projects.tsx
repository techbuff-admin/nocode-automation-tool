import React, { useEffect, useState, useContext } from 'react';
import { ProjectContext } from '../context/ProjectContext';
import { useNavigate } from 'react-router-dom';

export default function Projects() {
  const [rootDir, setRootDir] = useState<string>('');
  const [projects, setProjects] = useState<{name:string;path:string}[]>([]);
  const { setProjectDir, setProjectName } = useContext(ProjectContext);
  const navigate = useNavigate();

  // On mount, fetch root & list
  useEffect(() => {
    window.api.getRootProjectsDir().then((d) => {
      setRootDir(d);
      window.api.listProjects().then(setProjects);
    });
  }, []);

  const open = (proj: {name:string; path:string}) => {
    setProjectDir(proj.path);
    setProjectName(proj.name);
    navigate('/suite');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Your Projects</h2>
      <p className="mb-4 text-sm text-gray-600">
        All projects live in: <code>{rootDir}</code>
      </p>

      {projects.length === 0 ? (
        <p className="text-gray-500">No projects yet. Click “New Project” below.</p>
      ) : (
        <ul className="space-y-2 mb-6">
          {projects.map((p) => (
            <li key={p.path}>
              <button
                onClick={() => open(p)}
                className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded"
              >
                {p.name}
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
