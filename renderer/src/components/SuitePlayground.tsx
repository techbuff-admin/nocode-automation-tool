// // renderer/src/components/SuitePlayground.tsx
// import React, { useContext, useEffect, useState } from 'react';
// import { ProjectContext } from '../context/ProjectContext';
// import { TestSuite, TestCase, ProjectMeta } from '../../../shared/types';
// import {
//   PlusCircleIcon,
//   PencilIcon,
//   TrashIcon,
//   PlayIcon,
// } from '@heroicons/react/24/outline';
// import TestCaseBuilder from './TestCaseBuilder';
// import HookBuilder from './HookBuilder';

// type HookName = 'beforeAll' | 'beforeEach' | 'afterEach' | 'afterAll';
// type RunState = 'idle' | 'running' | 'passed' | 'failed';

// export default function SuitePlayground({ onBack }: { onBack: () => void }) {
//   const { projectDir } = useContext(ProjectContext);

//   // --- Meta & selection state ---
//   const [meta, setMeta] = useState<ProjectMeta | null>(null);
//   const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
//   const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
//   const [editingHook, setEditingHook] = useState<HookName | null>(null);

//   // --- Inline‐edit state ---
//   const [editingSuite, setEditingSuite] = useState<string | null>(null);
//   const [editingSuiteName, setEditingSuiteName] = useState('');
//   const [editingCase, setEditingCase] = useState<string | null>(null);
//   const [editingCaseName, setEditingCaseName] = useState('');

//   // --- Creation flags ---
//   const [creatingSuite, setCreatingSuite] = useState(false);
//   const [newSuiteName, setNewSuiteName] = useState('');
//   const [creatingCase, setCreatingCase] = useState(false);
//   const [newCaseName, setNewCaseName] = useState('');

//   // ← new: run settings
//   const [runHeadless, setRunHeadless] = useState(true);
//   const [runBrowsers, setRunBrowsers] = useState({
//     chrome: true,
//     firefox: false,
//     safari: false,
//     edge: false,
//   });

//   // ← new: status trackers
//   const [suiteStatus, setSuiteStatus] = useState<Record<string, RunState>>({});
//   const [caseStatus, setCaseStatus] = useState<Record<string, RunState>>({});

//   // ← new: report‐folder presence
//   const [hasResults, setHasResults] = useState(false);
//   const [hasReport, setHasReport] = useState(false);

//   // Load meta + check reports
//   useEffect(() => {
//     if (!projectDir) return;
//     window.api.loadMeta(projectDir).then((m) => {
//       setMeta(m);
//       if (m.suites.length) setSelectedSuite(m.suites[0]);
//     });
//     ;(async () => {
//       const r = await window.api.pathExists(`${projectDir}/allure-results`);
//       const p = await window.api.pathExists(`${projectDir}/allure-report`);
//       setHasResults(r);
//       setHasReport(p);
//     })();
//   }, [projectDir]);

//   // Save meta & re‐select so sidebar stays open
//   const saveMeta = async (updated: ProjectMeta) => {
//     setMeta(updated);
//     if (selectedSuite) {
//       const reSel = updated.suites.find((s) => s.name === selectedSuite.name) || null;
//       setSelectedSuite(reSel);
//       if (selectedCase && reSel) {
//         const reCase = reSel.cases.find((c) => c.name === selectedCase.name) || null;
//         setSelectedCase(reCase);
//       }
//     }
//     await window.api.saveMeta(projectDir!, updated);
//   };

//   // --- Suite CRUD ---
//   const addSuite = async () => {
//     if (!newSuiteName.trim() || !meta) return;
//     const name = newSuiteName.trim();
//     const dup = meta.suites.some((s) => s.name === name);
//     if (dup) {
//       if (!confirm(`Suite "${name}" exists. Replace it?`)) return;
//       meta.suites = meta.suites.filter((s) => s.name !== name);
//     }
//     setCreatingSuite(true);
//     const s: TestSuite = { name, cases: [], hooks: {} };
//     await saveMeta({ ...meta, suites: [...meta.suites, s] });
//     setSelectedSuite(s);
//     setNewSuiteName('');
//     setCreatingSuite(false);
//   };
//   const deleteSuite = async (name: string) => {
//     if (!meta || !confirm(`Delete suite "${name}"?`)) return;
//     await saveMeta({ ...meta, suites: meta.suites.filter((s) => s.name !== name) });
//     setSelectedSuite(null);
//     setSelectedCase(null);
//     setEditingHook(null);
//   };

//   // --- Case CRUD ---
//   const addCase = async () => {
//     if (!selectedSuite || !newCaseName.trim() || !meta) return;
//     const name = newCaseName.trim();
//     const dup = selectedSuite.cases.some((c) => c.name === name);
//     if (dup) {
//       if (!confirm(`Case "${name}" exists. Replace it?`)) return;
//       selectedSuite.cases = selectedSuite.cases.filter((c) => c.name !== name);
//     }
//     setCreatingCase(true);
//     const updated: ProjectMeta = {
//       ...meta,
//       suites: meta.suites.map((s) =>
//         s === selectedSuite ? { ...s, cases: [...s.cases, { name, actions: [] }] } : s
//       ),
//     };
//     await saveMeta(updated);
//     const su = updated.suites.find((s) => s.name === selectedSuite.name)!;
//     setSelectedSuite(su);
//     setSelectedCase(su.cases.at(-1)!);
//     setNewCaseName('');
//     setCreatingCase(false);
//   };
//   const deleteCase = async (caseName: string) => {
//     if (!selectedSuite || !confirm(`Delete case "${caseName}"?`)) return;
//     const updated: ProjectMeta = {
//       ...meta!,
//       suites: meta!.suites.map((s) =>
//         s === selectedSuite ? { ...s, cases: s.cases.filter((c) => c.name !== caseName) } : s
//       ),
//     };
//     await saveMeta(updated);
//     const su = updated.suites.find((s) => s.name === selectedSuite.name)!;
//     setSelectedSuite(su);
//     setSelectedCase(null);
//   };

//   // ← new: run suite
//   const runSuite = async (suite: TestSuite) => {
//     if (!projectDir) return;
//     const browsers = Object.entries(runBrowsers)
//       .filter(([, v]) => v)
//       .map(([k]) => k);
//     setSuiteStatus((s) => ({ ...s, [suite.name]: 'running' }));
//     try {
//       const { passed, output } = await window.api.runSuite(
//         projectDir,
//         suite.name,
//         runHeadless,
//         browsers
//       );
//       console.log(output);
//       setSuiteStatus((s) => ({ ...s, [suite.name]: passed ? 'passed' : 'failed' }));
//     } catch {
//       setSuiteStatus((s) => ({ ...s, [suite.name]: 'failed' }));
//     }
//   };

//   // ← new: run single case
//   const runCase = async (suite: TestSuite, testCase: TestCase) => {
//     if (!projectDir) return;
//     const key = `${suite.name}::${testCase.name}`;
//     const browsers = Object.entries(runBrowsers)
//       .filter(([, v]) => v)
//       .map(([k]) => k);
//     setCaseStatus((c) => ({ ...c, [key]: 'running' }));
//     try {
//       const { passed, output } = await window.api.runTestCase(
//         projectDir,
//         suite.name,
//         testCase.name,
//         runHeadless,
//         browsers
//       );
//       console.log(output);
//       setCaseStatus((c) => ({ ...c, [key]: passed ? 'passed' : 'failed' }));
//     } catch {
//       setCaseStatus((c) => ({ ...c, [key]: 'failed' }));
//     }
//   };

//   // ← new: generate & open Allure report
//   const generateAndOpenReport = async () => {
//     if (!projectDir) return;
//     await window.api.generateReport(projectDir);
//     setHasResults(true);
//     setHasReport(true);
//   };

//   // ← new: clear both report folders
//   const clearReports = async () => {
//     if (
//       !confirm(
//         'Delete both "allure-results" and "allure-report"? This cannot be undone.'
//       )
//     )
//       return;
//     await window.api.clearReports(projectDir);
//     await window.api.clearReports(projectDir);
//     setHasResults(false);
//     setHasReport(false);
//   };

//   if (!meta) return <p>Loading…</p>;

//   return (
//     <div className="flex h-full">
//       {/* --- Sidebar --- */}
//       <aside className="w-64 border-r p-4 overflow-auto space-y-6">
//         <div>
//           <h3 className="font-semibold mb-2">Test Suites</h3>
//           <div className="flex space-x-2">
//             <input
//               className="flex-1 border rounded px-2 py-1"
//               placeholder="+ Suite name"
//               value={newSuiteName}
//               onChange={(e) => setNewSuiteName(e.target.value)}
//             />
//             <button
//               onClick={addSuite}
//               disabled={creatingSuite}
//               className="p-1 hover:bg-gray-100"
//             >
//               <PlusCircleIcon className="h-5 w-5 text-green-600" />
//             </button>
//           </div>
//         </div>

//         <ul className="space-y-2">
//           {meta.suites.map((s) => {
//             const isSel = selectedSuite === s;
//             return (
//               <li key={s.name}>
//                 <div
//                   className={`flex items-center justify-between p-1 rounded cursor-pointer ${
//                     isSel ? 'bg-blue-100 font-bold' : 'hover:bg-gray-50'
//                   }`}
//                   onClick={() => {
//                     setSelectedSuite(s);
//                     setSelectedCase(null);
//                     setEditingHook(null);
//                   }}
//                 >
//                   {editingSuite === s.name ? (
//                     <input
//                       className="border rounded px-1 py-0 flex-1"
//                       value={editingSuiteName}
//                       onChange={(e) => setEditingSuiteName(e.target.value)}
//                       onBlur={async () => {
//                         const nn = editingSuiteName.trim();
//                         if (nn && nn !== s.name && meta) {
//                           const dup = meta.suites.some((x) => x.name === nn);
//                           if (dup && !confirm(`Replace "${nn}"?`)) {
//                             setEditingSuite(null);
//                             return;
//                           }
//                           const updated: ProjectMeta = {
//                             ...meta,
//                             suites: meta.suites.map((x) =>
//                               x.name === s.name ? { ...x, name: nn } : x
//                             ),
//                           };
//                           await saveMeta(updated);
//                           setSelectedSuite(
//                             updated.suites.find((x) => x.name === nn)!
//                           );
//                         }
//                         setEditingSuite(null);
//                       }}
//                       onKeyDown={(e) =>
//                         e.key === 'Enter' && e.currentTarget.blur()
//                       }
//                       autoFocus
//                     />
//                   ) : (
//                     <span className="flex-1">📁 {s.name}</span>
//                   )}

//                   <div className="flex space-x-1">
//                     {editingSuite !== s.name && (
//                       <button
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           setEditingSuite(s.name);
//                           setEditingSuiteName(s.name);
//                         }}
//                       >
//                         <PencilIcon className="h-4 w-4 text-blue-600" />
//                       </button>
//                     )}
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         deleteSuite(s.name);
//                       }}
//                     >
//                       <TrashIcon className="h-4 w-4 text-red-600" />
//                     </button>
//                   </div>
//                 </div>

//                 {/* Hooks */}
//                 {isSel && (
//                   <ul className="ml-4 mt-2 space-y-1">
//                     {(['beforeAll', 'beforeEach', 'afterEach', 'afterAll'] as HookName[]).map(
//                       (hook) => {
//                         const exists =
//                           Array.isArray(s.hooks?.[hook]) && s.hooks![hook]!.length > 0;
//                         return exists ? (
//                           <li
//                             key={hook}
//                             className="flex items-center justify-between p-1 bg-gray-50 hover:bg-gray-100"
//                           >
//                             <button
//                               className="flex-1 text-left"
//                               onClick={() => setEditingHook(hook)}
//                             >
//                               {hook}
//                             </button>
//                             <button
//                               onClick={() => {
//                                 if (!confirm(`Delete hook "${hook}"?`)) return;
//                                 const updatedSuite: TestSuite = {
//                                   ...s,
//                                   hooks: { ...s.hooks! },
//                                 };
//                                 delete updatedSuite.hooks![hook];
//                                 saveMeta({
//                                   ...meta,
//                                   suites: meta.suites.map((x) =>
//                                     x.name === s.name ? updatedSuite : x
//                                   ),
//                                 });
//                                 setEditingHook(null);
//                               }}
//                             >
//                               <TrashIcon className="h-4 w-4 text-red-600" />
//                             </button>
//                           </li>
//                         ) : (
//                           <li key={hook} className="p-1">
//                             <button
//                               className="text-green-600 hover:underline"
//                               onClick={() => {
//                                 const updatedSuite: TestSuite = {
//                                   ...s,
//                                   hooks: { ...(s.hooks || {}), [hook]: [] },
//                                 };
//                                 saveMeta({
//                                   ...meta,
//                                   suites: meta.suites.map((x) =>
//                                     x.name === s.name ? updatedSuite : x
//                                   ),
//                                 }).then(() => setEditingHook(hook));
//                               }}
//                             >
//                               + Add {hook}
//                             </button>
//                           </li>
//                         );
//                       }
//                     )}
//                   </ul>
//                 )}

//                 {/* Cases */}
//                 {isSel && (
//                   <ul className="mt-1 ml-4 space-y-1">
//                     {s.cases.map((c) => {
//                       const isCaseSel = selectedCase === c;
//                       const key = `${s.name}::${c.name}`;
//                       const cs = caseStatus[key] || 'idle';
//                       return (
//                         <li
//                           key={c.name}
//                           className={`flex justify-between items-center p-1 rounded cursor-pointer ${
//                             isCaseSel ? 'bg-blue-200' : 'hover:bg-gray-50'
//                           }`}
//                           onClick={() => {
//                             setSelectedCase(c);
//                             setEditingHook(null);
//                           }}
//                         >
//                           {editingCase === c.name ? (
//                             <input
//                               className="border rounded px-1 py-0 flex-1"
//                               value={editingCaseName}
//                               onChange={(e) => setEditingCaseName(e.target.value)}
//                               onBlur={async () => {
//                                 const nn = editingCaseName.trim();
//                                 if (
//                                   nn &&
//                                   nn !== c.name &&

//                                   selectedSuite &&
//                                   meta
//                                 ) {
//                                   const dup = selectedSuite.cases.some((x) => x.name === nn);
//                                   if (dup && !confirm(`Replace "${nn}"?`)) {
//                                     setEditingCase(null);
//                                     return;
//                                   }
//                                   const updatedSuite: TestSuite = {
//                                     ...selectedSuite,
//                                     cases: selectedSuite.cases.map((x) =>
//                                       x.name === c.name ? { ...x, name: nn } : x
//                                     ),
//                                   };
//                                   const updated: ProjectMeta = {
//                                     ...meta,
//                                     suites: meta.suites.map((x) =>
//                                       x.name === selectedSuite.name ? updatedSuite : x
//                                     ),
//                                   };
//                                   await saveMeta(updated);
//                                   setSelectedCase(
//                                     updatedSuite.cases.find((x) => x.name === nn) || null
//                                   );
//                                 }
//                                 setEditingCase(null);
//                               }}
//                               onKeyDown={(e) =>
//                                 e.key === 'Enter' && e.currentTarget.blur()
//                               }
//                               autoFocus
//                             />
//                           ) : (
//                             <span className="flex-1">📝 {c.name}</span>
//                           )}

//                           <div className="flex space-x-1">
//                             {editingCase !== c.name && (
//                               <button
//                                 onClick={(e) => {
//                                   e.stopPropagation();
//                                   setEditingCase(c.name);
//                                   setEditingCaseName(c.name);
//                                 }}
//                               >
//                                 <PencilIcon className="h-4 w-4 text-blue-600" />
//                               </button>
//                             )}
//                             <button
//                               onClick={(e) => {
//                                 e.stopPropagation();
//                                 deleteCase(c.name);
//                               }}
//                             >
//                               <TrashIcon className="h-4 w-4 text-red-600" />
//                             </button>
//                           </div>
//                         </li>
//                       );
//                     })}

//                     {/* Add new case */}
//                     <li>
//                       <div className="flex space-x-2">
//                         <input
//                           className="flex-1 border rounded px-2 py-1"
//                           placeholder="+ Case name"
//                           value={newCaseName}
//                           onChange={(e) => setNewCaseName(e.target.value)}
//                         />
//                         <button
//                           onClick={addCase}
//                           disabled={creatingCase}
//                           className="p-1 hover:bg-gray-100"
//                         >
//                           <PlusCircleIcon className="h-5 w-5 text-green-600" />
//                         </button>
//                       </div>
//                     </li>
//                   </ul>
//                 )}
//               </li>
//             );
//           })}
//         </ul>

//         <button
//           onClick={onBack}
//           className="mt-6 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
//         >
//           ← Back
//         </button>
//       </aside>

//       {/* --- Main pane --- */}
//       <main className="flex-1 p-4 overflow-auto bg-white rounded-lg">
//         {selectedSuite ? (
//           editingHook ? (
//             <HookBuilder
//               projectDir={projectDir!}
//               suiteName={selectedSuite.name}
//               hookName={editingHook}
//               meta={meta}
//               onMetaChange={saveMeta}
//             />
//           ) : selectedCase ? (
//             /* CASE SELECTED: run-case + report + builder */
//             <div>
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="text-xl font-semibold">
//                   Steps for “{selectedCase.name}”
//                 </h3>

//                 <div className="flex items-center space-x-4">
//                   {/* run settings */}
//                   <label className="flex items-center text-sm">
//                     <input
//                       type="checkbox"
//                       checked={runHeadless}
//                       onChange={(e) => setRunHeadless(e.target.checked)}
//                       className="mr-1"
//                     />
//                     Headless
//                   </label>
//                   {(['chrome', 'firefox', 'safari', 'edge'] as const).map(
//                     (br) => (
//                       <label key={br} className="flex items-center text-sm">
//                         <input
//                           type="checkbox"
//                           checked={runBrowsers[br]}
//                           onChange={() =>
//                             setRunBrowsers((r) => ({
//                               ...r,
//                               [br]: !r[br],
//                             }))
//                           }
//                           className="mr-1"
//                         />
//                         {br.charAt(0).toUpperCase() + br.slice(1)}
//                       </label>
//                     )
//                   )}

//                   {/* Run Case */}
//                   <button
//                     onClick={() => runCase(selectedSuite, selectedCase)}
//                     disabled={
//                       caseStatus[`${selectedSuite.name}::${selectedCase.name}`] ===
//                       'running'
//                     }
//                     className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
//                   >
//                     <PlayIcon className="h-5 w-5" />
//                     <span>Run Case</span>
//                     {(() => {
//                       const key = `${selectedSuite.name}::${selectedCase.name}`;
//                       const cs = caseStatus[key] || 'idle';
//                       if (cs === 'running')
//                         return <span className="ml-2 loader h-5 w-5" />;
//                       if (cs === 'passed') return <span className="ml-2 text-green-300">✅</span>;
//                       if (cs === 'failed') return <span className="ml-2 text-red-400">❌</span>;
//                       return null;
//                     })()}
//                   </button>

//                   {/* Generate & Open Report */}
//                   <button
//                     onClick={generateAndOpenReport}
//                     className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
//                   >
//                     Generate & Open Report
//                   </button>

//                   {/* Clear Reports */}
//                   <button
//                     onClick={clearReports}
//                     disabled={!hasResults && !hasReport}
//                     className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
//                   >
//                     Clear Reports
//                   </button>
//                 </div>
//               </div>

//               <TestCaseBuilder
//                 projectDir={projectDir!}
//                 suiteName={selectedSuite.name}
//                 caseName={selectedCase.name}
//                 meta={meta}
//                 onMetaChange={saveMeta}
//               />
//             </div>
//           ) : (
//             /* SUITE ONLY: run-suite + report */
//             <div>
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="text-xl font-semibold">
//                   Suite: “{selectedSuite.name}”
//                 </h3>
//                 <div className="flex items-center space-x-4">
//                   {/* run settings */}
//                   <label className="flex items-center text-sm">
//                     <input
//                       type="checkbox"
//                       checked={runHeadless}
//                       onChange={(e) => setRunHeadless(e.target.checked)}
//                       className="mr-1"
//                     />
//                     Headless
//                   </label>
//                   {(['chrome', 'firefox', 'safari', 'edge'] as const).map(
//                     (br) => (
//                       <label key={br} className="flex items-center text-sm">
//                         <input
//                           type="checkbox"
//                           checked={runBrowsers[br]}
//                           onChange={() =>
//                             setRunBrowsers((r) => ({
//                               ...r,
//                               [br]: !r[br],
//                             }))
//                           }
//                           className="mr-1"
//                         />
//                         {br.charAt(0).toUpperCase() + br.slice(1)}
//                       </label>
//                     )
//                   )}

//                   {/* Run Suite */}
//                   <button
//                     onClick={() => runSuite(selectedSuite)}
//                     disabled={suiteStatus[selectedSuite.name] === 'running'}
//                     className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
//                   >
//                     <PlayIcon className="h-5 w-5" />
//                     <span>Run Suite</span>
//                     {(() => {
//                       const st = suiteStatus[selectedSuite.name] || 'idle';
//                       if (st === 'running') return <span className="ml-2 loader h-5 w-5" />;
//                       if (st === 'passed') return <span className="ml-2 text-green-300">✅</span>;
//                       if (st === 'failed') return <span className="ml-2 text-red-400">❌</span>;
//                       return null;
//                     })()}
//                   </button>

//                   {/* Generate & Open Report */}
//                   <button
//                     onClick={generateAndOpenReport}
//                     className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
//                   >
//                     Generate & Open Report
//                   </button>

//                   {/* Clear Reports */}
//                   <button
//                     onClick={clearReports}
//                     disabled={!hasResults && !hasReport}
//                     className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
//                   >
//                     Clear Reports
//                   </button>
//                 </div>
//               </div>
//               <p className="text-gray-500 mb-4">
//                 Select a test case to edit or click “Run Suite” to execute all tests.
//               </p>
//             </div>
//           )
//         ) : (
//           <p className="text-gray-500">No suite selected.</p>
//         )}
//       </main>
//     </div>
//   );
// }
// renderer/src/components/SuitePlayground.tsx
import React, { useContext, useEffect, useState } from 'react';
import { ProjectContext } from '../context/ProjectContext';
import { TestSuite, TestCase, ProjectMeta } from '../../../shared/types';
import {
  PlusCircleIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline';
import TestCaseBuilder from './TestCaseBuilder';
import HookBuilder from './HookBuilder';

type HookName = 'beforeAll' | 'beforeEach' | 'afterEach' | 'afterAll';
type RunState = 'idle' | 'running' | 'passed' | 'failed';

export default function SuitePlayground({ onBack }: { onBack: () => void }) {
  const { projectDir } = useContext(ProjectContext);

  // --- Meta & selection state ---
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [selectedSuite, setSelectedSuite] = useState<TestSuite | null>(null);
  const [selectedCase, setSelectedCase] = useState<TestCase | null>(null);
  const [editingHook, setEditingHook] = useState<HookName | null>(null);

  // --- Inline‐edit state ---
  const [editingSuite, setEditingSuite] = useState<string | null>(null);
  const [editingSuiteName, setEditingSuiteName] = useState('');
  const [editingCase, setEditingCase] = useState<string | null>(null);
  const [editingCaseName, setEditingCaseName] = useState('');

  // --- Creation flags ---
  const [creatingSuite, setCreatingSuite] = useState(false);
  const [newSuiteName, setNewSuiteName] = useState('');
  const [creatingCase, setCreatingCase] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');

  // ← new: run settings
  const [runHeadless, setRunHeadless] = useState(true);
  const [runBrowsers, setRunBrowsers] = useState({
    chrome: true,
    firefox: false,
    safari: false,
    edge: false,
  });

  // ← new: status trackers
  const [suiteStatus, setSuiteStatus] = useState<Record<string, RunState>>({});
  const [caseStatus, setCaseStatus] = useState<Record<string, RunState>>({});

  // ← new: report‐folder presence
  const [hasResults, setHasResults] = useState(false);
  const [hasReport, setHasReport] = useState(false);

  // Load meta + check for existing Allure folders
  useEffect(() => {
    if (!projectDir) return;
    window.api.loadMeta(projectDir).then((m) => {
      setMeta(m);
      if (m.suites.length) setSelectedSuite(m.suites[0]);
    });
    (async () => {
      const r = await window.api.pathExists(`${projectDir}/allure-results`);
      const p = await window.api.pathExists(`${projectDir}/allure-report`);
      setHasResults(r);
      setHasReport(p);
    })();
  }, [projectDir]);

  // Save meta & re‐select so the sidebar stays open
  const saveMeta = async (updated: ProjectMeta) => {
    setMeta(updated);
    if (selectedSuite) {
      const reSel = updated.suites.find((s) => s.name === selectedSuite.name) || null;
      setSelectedSuite(reSel);
      if (selectedCase && reSel) {
        const reCase = reSel.cases.find((c) => c.name === selectedCase.name) || null;
        setSelectedCase(reCase);
      }
    }
    await window.api.saveMeta(projectDir!, updated);
  };

  // --- Suite CRUD ---
  const addSuite = async () => {
    if (!newSuiteName.trim() || !meta) return;
    const name = newSuiteName.trim();
    const dup = meta.suites.some((s) => s.name === name);
    if (dup) {
      if (!confirm(`Suite "${name}" exists. Replace it?`)) return;
      meta.suites = meta.suites.filter((s) => s.name !== name);
    }
    setCreatingSuite(true);
    const s: TestSuite = { name, cases: [], hooks: {} };
    await saveMeta({ ...meta, suites: [...meta.suites, s] });
    setSelectedSuite(s);
    setNewSuiteName('');
    setCreatingSuite(false);
  };
  const deleteSuite = async (name: string) => {
    if (!meta || !confirm(`Delete suite "${name}"?`)) return;
    await saveMeta({ ...meta, suites: meta.suites.filter((s) => s.name !== name) });
    setSelectedSuite(null);
    setSelectedCase(null);
    setEditingHook(null);
  };

  // --- Case CRUD ---
  const addCase = async () => {
    if (!selectedSuite || !newCaseName.trim() || !meta) return;
    const name = newCaseName.trim();
    const dup = selectedSuite.cases.some((c) => c.name === name);
    if (dup) {
      if (!confirm(`Case "${name}" exists. Replace it?`)) return;
      selectedSuite.cases = selectedSuite.cases.filter((c) => c.name !== name);
    }
    setCreatingCase(true);
    const updated: ProjectMeta = {
      ...meta,
      suites: meta.suites.map((s) =>
        s === selectedSuite ? { ...s, cases: [...s.cases, { name, actions: [] }] } : s
      ),
    };
    await saveMeta(updated);
    const su = updated.suites.find((s) => s.name === selectedSuite.name)!;
    setSelectedSuite(su);
    setSelectedCase(su.cases.at(-1)!);
    setNewCaseName('');
    setCreatingCase(false);
  };
  const deleteCase = async (caseName: string) => {
    if (!selectedSuite || !confirm(`Delete case "${caseName}"?`)) return;
    const updated: ProjectMeta = {
      ...meta!,
      suites: meta!.suites.map((s) =>
        s === selectedSuite ? { ...s, cases: s.cases.filter((c) => c.name !== caseName) } : s
      ),
    };
    await saveMeta(updated);
    const su = updated.suites.find((s) => s.name === selectedSuite.name)!;
    setSelectedSuite(su);
    setSelectedCase(null);
  };

  // ← new: run suite
  const runSuite = async (suite: TestSuite) => {
    if (!projectDir) return;
    const browsers = Object.entries(runBrowsers)
      .filter(([, v]) => v)
      .map(([k]) => k);
    setSuiteStatus((s) => ({ ...s, [suite.name]: 'running' }));
    try {
      const { passed, output } = await window.api.runSuite(
        projectDir,
        suite.name,
        runHeadless,
        browsers
      );
      console.log(output);
      setSuiteStatus((s) => ({ ...s, [suite.name]: passed ? 'passed' : 'failed' }));
    } catch {
      setSuiteStatus((s) => ({ ...s, [suite.name]: 'failed' }));
    }
  };

  // ← new: run single case
  const runCase = async (suite: TestSuite, testCase: TestCase) => {
    if (!projectDir) return;
    const key = `${suite.name}::${testCase.name}`;
    const browsers = Object.entries(runBrowsers)
      .filter(([, v]) => v)
      .map(([k]) => k);
    setCaseStatus((c) => ({ ...c, [key]: 'running' }));
    try {
      const { passed, output } = await window.api.runTestCase(
        projectDir,
        suite.name,
        testCase.name,
        runHeadless,
        browsers
      );
      console.log(output);
      setCaseStatus((c) => ({ ...c, [key]: passed ? 'passed' : 'failed' }));
    } catch {
      setCaseStatus((c) => ({ ...c, [key]: 'failed' }));
    }
  };

  // ← new: generate & open Allure report
  const generateAndOpenReport = async () => {
    if (!projectDir) return;
    await window.api.generateReport(projectDir);
   // await window.api.serveAllure(projectDir);
    setHasResults(true);
    setHasReport(true);
  };

  // ← new: clear both report folders
  const clearReports = async () => {
    if (
      !confirm(
        'Delete both "allure-results" and "allure-report"? This cannot be undone.'
      )
    )
      return;
    await window.api.clearReports(projectDir);
    await window.api.clearReports(projectDir);
    setHasResults(false);
    setHasReport(false);
  };

  if (!meta) return <p>Loading…</p>;

  return (
    <div className="flex h-full">
      {/* --- Sidebar --- */}
      <aside className="w-64 border-r p-4 overflow-auto space-y-6">
        <div>
          <h3 className="font-semibold mb-2">Test Suites</h3>
          <div className="flex space-x-2">
            <input
              className="flex-1 border rounded px-2 py-1"
              placeholder="+ Suite name"
              value={newSuiteName}
              onChange={(e) => setNewSuiteName(e.target.value)}
            />
            <button
              onClick={addSuite}
              disabled={creatingSuite}
              className="p-1 hover:bg-gray-100"
            >
              <PlusCircleIcon className="h-5 w-5 text-green-600" />
            </button>
          </div>
        </div>

        <ul className="space-y-2">
          {meta.suites.map((s) => {
            const isSel = selectedSuite === s;
            return (
              <li key={s.name}>
                <div
                  className={`flex items-center justify-between p-1 rounded cursor-pointer ${
                    isSel ? 'bg-blue-100 font-bold' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    setSelectedSuite(s);
                    setSelectedCase(null);
                    setEditingHook(null);
                  }}
                >
                  {editingSuite === s.name ? (
                    <input
                      className="border rounded px-1 py-0 flex-1"
                      value={editingSuiteName}
                      onChange={(e) => setEditingSuiteName(e.target.value)}
                      onBlur={async () => {
                        const nn = editingSuiteName.trim();
                        if (nn && nn !== s.name && meta) {
                          const dup = meta.suites.some((x) => x.name === nn);
                          if (dup && !confirm(`Replace "${nn}"?`)) {
                            setEditingSuite(null);
                            return;
                          }
                          const updated: ProjectMeta = {
                            ...meta,
                            suites: meta.suites.map((x) =>
                              x.name === s.name ? { ...x, name: nn } : x
                            ),
                          };
                          await saveMeta(updated);
                          setSelectedSuite(
                            updated.suites.find((x) => x.name === nn)!
                          );
                        }
                        setEditingSuite(null);
                      }}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && e.currentTarget.blur()
                      }
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1">📁 {s.name}</span>
                  )}

                  <div className="flex space-x-1">
                    {editingSuite !== s.name && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSuite(s.name);
                          setEditingSuiteName(s.name);
                        }}
                      >
                        <PencilIcon className="h-4 w-4 text-blue-600" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSuite(s.name);
                      }}
                    >
                      <TrashIcon className="h-4 w-4 text-red-600" />
                    </button>
                  </div>
                </div>

                {/* Hooks */}
                {isSel && (
                  <ul className="ml-4 mt-2 space-y-1">
                    {(['beforeAll', 'beforeEach', 'afterEach', 'afterAll'] as HookName[]).map(
                      (hook) => {
                        const exists =
                          Array.isArray(s.hooks?.[hook]) && s.hooks![hook]!.length > 0;
                        return exists ? (
                          <li
                            key={hook}
                            className="flex items-center justify-between p-1 bg-gray-50 hover:bg-gray-100"
                          >
                            <button
                              className="flex-1 text-left"
                              onClick={() => setEditingHook(hook)}
                            >
                              {hook}
                            </button>
                            <button
                              onClick={() => {
                                if (!confirm(`Delete hook "${hook}"?`)) return;
                                const updatedSuite: TestSuite = {
                                  ...s,
                                  hooks: { ...s.hooks! },
                                };
                                delete updatedSuite.hooks![hook];
                                saveMeta({
                                  ...meta,
                                  suites: meta.suites.map((x) =>
                                    x.name === s.name ? updatedSuite : x
                                  ),
                                });
                                setEditingHook(null);
                              }}
                            >
                              <TrashIcon className="h-4 w-4 text-red-600" />
                            </button>
                          </li>
                        ) : (
                          <li key={hook} className="p-1">
                            <button
                              className="text-green-600 hover:underline"
                              onClick={() => {
                                const updatedSuite: TestSuite = {
                                  ...s,
                                  hooks: { ...(s.hooks || {}), [hook]: [] },
                                };
                                saveMeta({
                                  ...meta,
                                  suites: meta.suites.map((x) =>
                                    x.name === s.name ? updatedSuite : x
                                  ),
                                }).then(() => setEditingHook(hook));
                              }}
                            >
                              + Add {hook}
                            </button>
                          </li>
                        );
                      }
                    )}
                  </ul>
                )}

                {/* Cases */}
                {isSel && (
                  <ul className="mt-1 ml-4 space-y-1">
                    {s.cases.map((c) => {
                      const isCaseSel = selectedCase === c;
                      const key = `${s.name}::${c.name}`;
                      const cs = caseStatus[key] || 'idle';
                      return (
                        <li
                          key={c.name}
                          className={`flex justify-between items-center p-1 rounded cursor-pointer ${
                            isCaseSel ? 'bg-blue-200' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            setSelectedCase(c);
                            setEditingHook(null);
                          }}
                        >
                          {editingCase === c.name ? (
                            <input
                              className="border rounded px-1 py-0 flex-1"
                              value={editingCaseName}
                              onChange={(e) => setEditingCaseName(e.target.value)}
                              onBlur={async () => {
                                const nn = editingCaseName.trim();
                                if (
                                  nn &&
                                  nn !== c.name &&
                                  selectedSuite &&
                                  meta
                                ) {
                                  const dup = selectedSuite.cases.some((x) => x.name === nn);
                                  if (dup && !confirm(`Replace "${nn}"?`)) {
                                    setEditingCase(null);
                                    return;
                                  }
                                  const updatedSuite: TestSuite = {
                                    ...selectedSuite,
                                    cases: selectedSuite.cases.map((x) =>
                                      x.name === c.name ? { ...x, name: nn } : x
                                    ),
                                  };
                                  const updated: ProjectMeta = {
                                    ...meta,
                                    suites: meta.suites.map((x) =>
                                      x.name === selectedSuite.name ? updatedSuite : x
                                    ),
                                  };
                                  await saveMeta(updated);
                                  setSelectedCase(
                                    updatedSuite.cases.find((x) => x.name === nn) || null
                                  );
                                }
                                setEditingCase(null);
                              }}
                              onKeyDown={(e) =>
                                e.key === 'Enter' && e.currentTarget.blur()
                              }
                              autoFocus
                            />
                          ) : (
                            <span className="flex-1">📝 {c.name}</span>
                          )}

                          <div className="flex space-x-1">
                            {editingCase !== c.name && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCase(c.name);
                                  setEditingCaseName(c.name);
                                }}
                              >
                                <PencilIcon className="h-4 w-4 text-blue-600" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCase(c.name);
                              }}
                            >
                              <TrashIcon className="h-4 w-4 text-red-600" />
                            </button>
                          </div>
                        </li>
                      );
                    })}

                    {/* Add new case */}
                    <li>
                      <div className="flex space-x-2">
                        <input
                          className="flex-1 border rounded px-2 py-1"
                          placeholder="+ Case name"
                          value={newCaseName}
                          onChange={(e) => setNewCaseName(e.target.value)}
                        />
                        <button
                          onClick={addCase}
                          disabled={creatingCase}
                          className="p-1 hover:bg-gray-100"
                        >
                          <PlusCircleIcon className="h-5 w-5 text-green-600" />
                        </button>
                      </div>
                    </li>
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        <button
          onClick={onBack}
          className="mt-6 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
        >
          ← Back
        </button>
      </aside>

      {/* --- Main pane --- */}
      <main className="flex-1 p-4 overflow-auto bg-white rounded-lg">
        {selectedSuite ? (
          editingHook ? (
            <HookBuilder
              projectDir={projectDir!}
              suiteName={selectedSuite.name}
              hookName={editingHook}
              meta={meta}
              onMetaChange={saveMeta}
            />
          ) : selectedCase ? (
            /* CASE SELECTED: run-case + report + builder */
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold">
                  Steps for “{selectedCase.name}”
                </h3>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={runHeadless}
                      onChange={(e) => setRunHeadless(e.target.checked)}
                      className="mr-1"
                    />
                    Headless
                  </label>
                  {(['chrome', 'firefox', 'safari', 'edge'] as const).map(
                    (br) => (
                      <label key={br} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={runBrowsers[br]}
                          onChange={() =>
                            setRunBrowsers((r) => ({
                              ...r,
                              [br]: !r[br],
                            }))
                          }
                          className="mr-1"
                        />
                        {br.charAt(0).toUpperCase() + br.slice(1)}
                      </label>
                    )
                  )}
                  <button
                    onClick={() => runCase(selectedSuite, selectedCase)}
                    disabled={
                      caseStatus[`${selectedSuite.name}::${selectedCase.name}`] ===
                      'running'
                    }
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    <PlayIcon className="h-5 w-5" />
                    <span>Run Case</span>
                    {(() => {
                      const key = `${selectedSuite.name}::${selectedCase.name}`;
                      const cs = caseStatus[key] || 'idle';
                      if (cs === 'running')
                        return <span className="ml-2 loader h-5 w-5" />;
                      if (cs === 'passed') return <span className="ml-2 text-green-300">✅</span>;
                      if (cs === 'failed') return <span className="ml-2 text-red-400">❌</span>;
                      return null;
                    })()}
                  </button>
                </div>
              </div>

              {/* ← new: report buttons row */}
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={generateAndOpenReport}
                  className="flex items-center space-x-1 px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  <DocumentChartBarIcon className="h-5 w-5" />
                  <span>Generate & Open Report</span>
                </button>
                <button
                  onClick={clearReports}
                  disabled={!hasResults && !hasReport}
                  className="flex items-center space-x-1 px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  <TrashIcon className="h-5 w-5" />
                  <span>Clear Reports</span>
                </button>
              </div>

              <TestCaseBuilder
                projectDir={projectDir!}
                suiteName={selectedSuite.name}
                caseName={selectedCase.name}
                meta={meta}
                onMetaChange={saveMeta}
              />
            </div>
          ) : (
            /* SUITE ONLY: run-suite + report */
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-semibold">
                  Suite: “{selectedSuite.name}”
                </h3>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={runHeadless}
                      onChange={(e) => setRunHeadless(e.target.checked)}
                      className="mr-1"
                    />
                    Headless
                  </label>
                  {(['chrome', 'firefox', 'safari', 'edge'] as const).map(
                    (br) => (
                      <label key={br} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={runBrowsers[br]}
                          onChange={() =>
                            setRunBrowsers((r) => ({
                              ...r,
                              [br]: !r[br],
                            }))
                          }
                          className="mr-1"
                        />
                        {br.charAt(0).toUpperCase() + br.slice(1)}
                      </label>
                    )
                  )}
                  <button
                    onClick={() => runSuite(selectedSuite)}
                    disabled={suiteStatus[selectedSuite.name] === 'running'}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    <PlayIcon className="h-5 w-5" />
                    <span>Run Suite</span>
                    {(() => {
                      const st = suiteStatus[selectedSuite.name] || 'idle';
                      if (st === 'running') return <span className="ml-2 loader h-5 w-5" />;
                      if (st === 'passed') return <span className="ml-2 text-green-300">✅</span>;
                      if (st === 'failed') return <span className="ml-2 text-red-400">❌</span>;
                      return null;
                    })()}
                  </button>
                </div>
              </div>

              {/* ← new: report buttons row */}
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={generateAndOpenReport}
                  className="flex items-center space-x-1 px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  <DocumentChartBarIcon className="h-5 w-5" />
                  <span>Generate & Open Report</span>
                </button>
                <button
                  onClick={clearReports}
                  disabled={!hasResults && !hasReport}
                  className="flex items-center space-x-1 px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
                >
                  <TrashIcon className="h-5 w-5" />
                  <span>Clear Reports</span>
                </button>
              </div>

              <p className="text-gray-500 mb-4">
                Select a test case to edit or click “Run Suite” to execute all tests.
              </p>
            </div>
          )
        ) : (
          <p className="text-gray-500">No suite selected.</p>
        )}
      </main>
    </div>
  );
}
