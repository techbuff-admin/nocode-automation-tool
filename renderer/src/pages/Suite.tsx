// import React, { useContext, useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { ProjectContext } from '../context/ProjectContext';
// import SuiteManager from '../components/SuiteManager';
// import TestCaseBuilder from '../components/TestCaseBuilder';
// import FileTree from '../components/FileTree';

// export default function Suite() {
//   const { projectDir, setProjectDir } = useContext(ProjectContext);
//   const navigate = useNavigate();

//   const [treeKey, setTreeKey] = useState(0);
//   const [suites, setSuites] = useState<string[]>([]);
//   const [selectedSuite, setSelectedSuite] = useState<string>('');

//   // If no projectDir at all, immediately send them to /projects
//   useEffect(() => {
//     if (!projectDir) {
//       navigate('/projects', { replace: true });
//     }
//   }, [projectDir, navigate]);

//   // Load suites, but catch PROJECT_NOT_FOUND
//   useEffect(() => {
//     if (!projectDir) return;

//     window.api.getFileTree(projectDir)
//       .then((nodes: { path: string; type: string }[]) => {
//         if (nodes.length === 0) {
//           // either brand new project or folder is gone
//           alert('No project found — please create or re-open one.');
//           setProjectDir(null);
//           navigate('/projects', { replace: true });
//           return;
//         }
//         // normal behavior: filter out spec files
//         const specs = nodes
//           .filter(
//             (n) =>
//               n.type === 'file' &&
//               n.path.startsWith('tests/') &&
//               n.path.endsWith('.spec.ts')
//           )
//           .map((n) => n.path);

//         setSuites(specs);
//         if (specs.length > 0 && !selectedSuite) {
//           setSelectedSuite(specs[0]);
//         }
//       })
//       .catch((err: any) => {
//         if (err.message === 'PROJECT_NOT_FOUND') {
//           // Folder was deleted outside your app
//           alert('Project folder no longer exists. Please pick or create a project.');
//           setProjectDir(null);
//           navigate('/projects', { replace: true });
//         } else {
//           console.error('Error loading suites:', err);
//           alert('Error loading project: ' + err.message);
//         }
//       });
//   }, [projectDir, treeKey, selectedSuite, navigate, setProjectDir]);

//   // If we got redirected, render nothing
//   if (!projectDir) return null;

//   return (
//     <div className="flex h-full">
//       <aside className="w-64 border-r p-4 overflow-auto">
//         <FileTree projectDir={projectDir} key={treeKey} />
//       </aside>

//       <main className="flex-1 p-6 overflow-auto">
//         <h2 className="text-2xl font-bold mb-4">Test Suites</h2>

//         <SuiteManager projectDir={projectDir} onRefresh={() => setTreeKey(k => k + 1)} />

//         {suites.length > 0 && (
//           <div className="mb-4">
//             <label className="block mb-1 font-medium">Select Suite:</label>
//             <select
//               value={selectedSuite}
//               onChange={(e) => setSelectedSuite(e.target.value)}
//               className="border rounded px-2 py-1"
//             >
//               {suites.map((s) => (
//                 <option key={s} value={s}>
//                   {s.replace('tests/', '')}
//                 </option>
//               ))}
//             </select>
//           </div>
//         )}

//         {selectedSuite ? (
//           <TestCaseBuilder
//             projectDir={projectDir}
//             suiteFile={`${projectDir}/${selectedSuite}`}
//             onRefresh={() => setTreeKey(k => k + 1)}
//           />
//         ) : (
//           <p className="text-gray-500">
//             {suites.length === 0
//               ? 'No test suites yet—create one above.'
//               : 'Select a suite to add test cases.'}
//           </p>
//         )}
//       </main>
//     </div>
//   );
// }
// renderer/src/pages/Suite.tsx
import React, { useContext, useEffect, useState } from 'react';
import { ProjectContext } from '../context/ProjectContext';
import { useNavigate } from 'react-router-dom';

import ApplicationConfig from '../components/ApplicationConfig';
import PageManager from '../components/PageManager';
import SuiteManager from '../components/SuiteManager';
import SuitePlayground from '../components/SuitePlayground';

export default function Suite() {
  const { projectDir } = useContext(ProjectContext);
  const navigate = useNavigate();

  // 0) redirect to /projects if no active project
  useEffect(() => {
    if (!projectDir) navigate('/projects', { replace: true });
  }, [projectDir, navigate]);

  // 1) wizard step index
  const [step, setStep] = useState(1);

  const next = () => setStep((s) => Math.min(3, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

   // ---------- HERE: file‐tree refresh key ----------
   const [treeKey, setTreeKey] = useState(0);
   // this is your refreshTree callback:
   const refreshTree = () => setTreeKey((k) => k + 1);
  if (!projectDir) return null;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Automation Playground</h1>

      <ol className="flex space-x-4">
        {['App Config', 'Page Objects', 'Suites & Cases'].map((label, i) => (
          <li
            key={i}
            className={`px-3 py-1 rounded-lg ${
              step === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="border p-4 rounded-lg bg-white">
        {step === 1 && (<ApplicationConfig onNext={next} />)}
        {step === 2 && (<PageManager onNext={next} onBack={prev} />)}
        {/* {step === 3 &&   <SuiteManager
    projectDir={projectDir}
    onRefresh={() => setTreeKey((k) => k + 1)}
    onBack={prev}  // ← make sure this is provided
  />} */}
  {step === 3 && (
         <SuitePlayground onBack={prev} />
       )}
      </div>
    </div>
  );
}
