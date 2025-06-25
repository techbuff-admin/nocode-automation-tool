// // renderer/src/components/ExecutionPanel.tsx
// import React, { useContext, useEffect, useState } from 'react';
// import {
//   ChevronDownIcon,
//   ChevronRightIcon,
// } from '@heroicons/react/24/outline';
// import { ProjectContext } from '../context/ProjectContext';
// import { ProjectMeta } from '../../../shared/types';
// import Spinner from './Spinner';

// const BROWSERS = ['edge','firefox','safari','chrome'] as const;
// type BrowserName = typeof BROWSERS[number];

// interface CaseSel {
//   selected: boolean;
//   browsers: Record<BrowserName, boolean>;
//   smoke: boolean;
//   regression: boolean;
// }
// interface SuiteSel extends CaseSel {
//   cases: Record<string, CaseSel>;
// }

// export default function ExecutionPanel({ onBack }: { onBack: () => void }) {
//   const { projectDir } = useContext(ProjectContext);
//   const [meta, setMeta] = useState<ProjectMeta | null>(null);
//   const [sel, setSel] = useState<Record<string, SuiteSel>>({});
//   const [openSuites, setOpenSuites] = useState<Record<string,boolean>>({});
//   const [running, setRunning] = useState(false);
//   const [generatingReport, setGeneratingReport] = useState(false);
//   const [clearing, setClearing] = useState(false);
//   const [isHeadless, setIsHeadless] = useState(true); // ← new

//   // load metadata & init all flags unchecked
//   useEffect(() => {
//     if (!projectDir) return;
//     window.api.loadMeta(projectDir).then(m => {
//       setMeta(m);
//       const initial: Record<string,SuiteSel> = {};
//       const opens: Record<string,boolean> = {};
//       m.suites.forEach(suite => {
//         const defaultBrows: Record<BrowserName,boolean> = {
//           chromium:false, firefox:false, webkit:false, chrome:false
//         };
//         const cases: Record<string,CaseSel> = {};
//         suite.cases.forEach(c => {
//           cases[c.name] = {
//             selected: false,
//             browsers: { ...defaultBrows },
//             smoke: false,
//             regression: false,
//           };
//         });
//         initial[suite.name] = {
//           selected: false,
//           browsers: { ...defaultBrows },
//           smoke: false,
//           regression: false,
//           cases
//         };
//         opens[suite.name] = true; // expanded by default
//       });
//       setSel(initial);
//       setOpenSuites(opens);
//     });
//   }, [projectDir]);

//   if (!meta) return <p>Loading…</p>;

//   const anySmoke = Object.values(sel).some(s =>
//     Object.values(s.cases).some(c => c.smoke)
//   );
//   const anyReg = Object.values(sel).some(s =>
//     Object.values(s.cases).some(c => c.regression)
//   );

//   // ─── Execution handlers ───
//   const handleExecuteSelected = async () => {
//     if (!projectDir) return;
//     setRunning(true);
//     try {
//       const tasks: Promise<any>[] = [];
//       Object.entries(sel).forEach(([suiteName, suiteSel]) => {
//         if (suiteSel.selected) {
//           const bs = BROWSERS.filter(b => suiteSel.browsers[b]);
//           tasks.push(
//             window.api.runSuite(projectDir, suiteName, isHeadless, bs)
//           );
//         }
//         Object.entries(suiteSel.cases).forEach(([caseName, caseSel]) => {
//           if (caseSel.selected) {
//             const bs = BROWSERS.filter(b => caseSel.browsers[b]);
//             tasks.push(
//               window.api.runTestCase(
//                 projectDir,
//                 suiteName,
//                 caseName,
//                 isHeadless,
//                 bs
//               )
//             );
//           }
//         });
//       });
//       await Promise.all(tasks);
//     } finally {
//       setRunning(false);
//     }
//   };

//   const handleExecuteSmoke = async () => {
//     if (!projectDir) return;
//     setRunning(true);
//     try {
//       const tasks: Promise<any>[] = [];
//       Object.entries(sel).forEach(([suiteName, suiteSel]) => {
//         Object.entries(suiteSel.cases).forEach(([caseName, caseSel]) => {
//           if (caseSel.smoke) {
//             const bs = BROWSERS.filter(b => caseSel.browsers[b]);
//             tasks.push(
//               window.api.runTestCase(
//                 projectDir,
//                 suiteName,
//                 caseName,
//                 isHeadless,
//                 bs
//               )
//             );
//           }
//         });
//       });
//       await Promise.all(tasks);
//     } finally {
//       setRunning(false);
//     }
//   };

//   const handleExecuteRegression = async () => {
//     if (!projectDir) return;
//     setRunning(true);
//     try {
//       const tasks: Promise<any>[] = [];
//       Object.entries(sel).forEach(([suiteName, suiteSel]) => {
//         Object.entries(suiteSel.cases).forEach(([caseName, caseSel]) => {
//           if (caseSel.regression) {
//             const bs = BROWSERS.filter(b => caseSel.browsers[b]);
//             tasks.push(
//               window.api.runTestCase(
//                 projectDir,
//                 suiteName,
//                 caseName,
//                 isHeadless,
//                 bs
//               )
//             );
//           }
//         });
//       });
//       await Promise.all(tasks);
//     } finally {
//       setRunning(false);
//     }
//   };

//   // ─── Report handlers ───
//   const handleGenerateReport = async () => {
//     if (!projectDir) return;
//     setGeneratingReport(true);
//     try {
//       await window.api.generateReport(projectDir);
//     } finally {
//       setGeneratingReport(false);
//     }
//   };

//   const handleClearReports = async () => {
//     if (!projectDir) return;
//     setClearing(true);
//     try {
//       await window.api.clearReports(projectDir);
//       alert('Old reports deleted');
//     } finally {
//       setClearing(false);
//     }
//   };

//   // ─── UI update helpers ───
//   const toggleSuiteOpen = (suite: string) =>
//     setOpenSuites(o => ({ ...o, [suite]: !o[suite] }));

//   const updateSuiteField = (
//     suiteName: string,
//     field: keyof CaseSel,
//     cascade: boolean
//   ) => {
//     setSel(prev => {
//       const S = prev[suiteName];
//       const nv = !S[field];
//       const newCases = cascade
//         ? Object.fromEntries(Object.entries(S.cases).map(([k,c]) => [
//             k, { ...c, [field]: nv }
//           ]))
//         : S.cases;
//       return {
//         ...prev,
//         [suiteName]: { ...S, [field]: nv, cases: newCases }
//       };
//     });
//   };

//   const updateCaseField = (
//     suiteName: string,
//     caseName: string,
//     field: keyof CaseSel
//   ) => {
//     setSel(prev => {
//       const S = prev[suiteName];
//       const C = S.cases[caseName];
//       const nv = !C[field];
//       const updatedCase = { ...C, [field]: nv };
//       const newCases = { ...S.cases, [caseName]: updatedCase };
//       const agg = ['selected','smoke','regression'] as const;
//       const newSuite: SuiteSel = {
//         ...S,
//         cases: newCases,
//         ...(agg.includes(field)
//           ? { [field]: Object.values(newCases).every(c2 => c2[field]) }
//           : {}
//         ),
//       } as any;
//       return { ...prev, [suiteName]: newSuite };
//     });
//   };

//   const toggleSuiteBrowser = (suiteName: string, b: BrowserName) =>
//     setSel(prev => {
//       const S = prev[suiteName];
//       const nv = !S.browsers[b];
//       const newSuiteBrows = { ...S.browsers, [b]: nv };
//       const newCases = Object.fromEntries(Object.entries(S.cases).map(([k,c]) => [
//         k, { ...c, browsers: { ...c.browsers, [b]: nv } }
//       ]));
//       return {
//         ...prev,
//         [suiteName]: { ...S, browsers: newSuiteBrows, cases: newCases }
//       };
//     });

//   const toggleCaseBrowser = (suiteName: string, caseName: string, b: BrowserName) =>
//     setSel(prev => {
//       const S = prev[suiteName];
//       const C = S.cases[caseName];
//       const nv = !C.browsers[b];
//       const updatedCase = { ...C, browsers: { ...C.browsers, [b]: nv } };
//       const newCases = { ...S.cases, [caseName]: updatedCase };
//       const suiteHasAll = Object.values(newCases).every(c2 => c2.browsers[b]);
//       return {
//         ...prev,
//         [suiteName]: {
//           ...S,
//           browsers: { ...S.browsers, [b]: suiteHasAll },
//           cases: newCases
//         }
//       };
//     });

//   // ─── Render ───
//   return (
//     <div className="space-y-4">
//       {/* ← Top CTAs */}
//       <div className="flex flex-wrap gap-2">
//         <label className="inline-flex items-center space-x-1">
//           <input
//             type="checkbox"
//             checked={isHeadless}
//             onChange={e => setIsHeadless(e.target.checked)}
//           />
//           <span>Headless</span>
//         </label>
//         <button
//           onClick={handleExecuteSelected}
//           disabled={running||generatingReport||clearing}
//           className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
//         >
//           {running ? 'Executing…' : 'Execute Selected'}
//         </button>
//         {anySmoke && (
//           <button
//             onClick={handleExecuteSmoke}
//             disabled={running}
//             className="px-4 py-2 bg-orange-500 text-white rounded disabled:opacity-50"
//           >
//             {running ? 'Executing…' : 'Execute Smoke'}
//           </button>
//         )}
//         {anyReg && (
//           <button
//             onClick={handleExecuteRegression}
//             disabled={running}
//             className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
//           >
//             {running ? 'Executing…' : 'Execute Regression'}
//           </button>
//         )}
//         <button
//           onClick={handleGenerateReport}
//           disabled={generatingReport||running||clearing}
//           className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
//         >
//           {generatingReport ? 'Generating…' : 'Generate Reports'}
//         </button>
//         <button
//           onClick={handleClearReports}
//           disabled={clearing||running||generatingReport}
//           className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
//         >
//           {clearing ? <Spinner size="sm" /> : 'Clear Reports'}
//         </button>
//       </div>

//       {/* ← Suite & Case list */}
//       {meta.suites.map(suite => {
//         const S = sel[suite.name];
//         const isOpen = openSuites[suite.name];
//         return (
//           <div key={suite.name} className="border rounded">
//             <div
//               className="flex items-center p-2 bg-gray-100 cursor-pointer"
//               onClick={() => toggleSuiteOpen(suite.name)}
//             >
//               {isOpen
//                 ? <ChevronDownIcon className="h-5 w-5 mr-2"/>
//                 : <ChevronRightIcon className="h-5 w-5 mr-2"/>}
//               <input
//                 type="checkbox"
//                 checked={S.selected}
//                 onClick={e => e.stopPropagation()}
//                 onChange={() => updateSuiteField(suite.name,'selected',true)}
//               />
//               <span className="ml-2 font-semibold">{suite.name}</span>
//               <div className="ml-auto flex items-center space-x-2">
//                 {BROWSERS.map(b => (
//                   <label key={b} className="flex items-center text-xs space-x-1">
//                     <input
//                       type="checkbox"
//                       checked={S.browsers[b]}
//                       onClick={e => e.stopPropagation()}
//                       onChange={() => toggleSuiteBrowser(suite.name,b)}
//                     />
//                     <span>{b}</span>
//                   </label>
//                 ))}
//                 <label className="flex items-center text-xs space-x-1">
//                   <input
//                     type="checkbox"
//                     checked={S.smoke}
//                     onClick={e => e.stopPropagation()}
//                     onChange={() => updateSuiteField(suite.name,'smoke',true)}
//                   />
//                   <span>Smoke</span>
//                 </label>
//                 <label className="flex items-center text-xs space-x-1">
//                   <input
//                     type="checkbox"
//                     checked={S.regression}
//                     onClick={e => e.stopPropagation()}
//                     onChange={() => updateSuiteField(suite.name,'regression',true)}
//                   />
//                   <span>Regression</span>
//                 </label>
//               </div>
//             </div>
//             {isOpen && (
//               <div className="pl-8 pb-4 space-y-2">
//                 {suite.cases.map(tc => {
//                   const C = S.cases[tc.name];
//                   return (
//                     <div
//                       key={tc.name}
//                       className="flex items-center p-2 hover:bg-gray-50 rounded"
//                     >
//                       <input
//                         type="checkbox"
//                         checked={C.selected}
//                         onClick={e => e.stopPropagation()}
//                         onChange={() => updateCaseField(suite.name,tc.name,'selected')}
//                       />
//                       <span className="ml-2">{tc.name}</span>
//                       <div className="ml-auto flex items-center space-x-2">
//                         {BROWSERS.map(b => (
//                           <label key={b} className="flex items-center text-xs space-x-1">
//                             <input
//                               type="checkbox"
//                               checked={C.browsers[b]}
//                               onClick={e => e.stopPropagation()}
//                               onChange={() => toggleCaseBrowser(suite.name,tc.name,b)}
//                             />
//                             <span>{b}</span>
//                           </label>
//                         ))}
//                         <label className="flex items-center text-xs space-x-1">
//                           <input
//                             type="checkbox"
//                             checked={C.smoke}
//                             onClick={e => e.stopPropagation()}
//                             onChange={() => updateCaseField(suite.name,tc.name,'smoke')}
//                           />
//                           <span>Smoke</span>
//                         </label>
//                         <label className="flex items-center text-xs space-x-1">
//                           <input
//                             type="checkbox"
//                             checked={C.regression}
//                             onClick={e => e.stopPropagation()}
//                             onChange={() => updateCaseField(suite.name,tc.name,'regression')}
//                           />
//                           <span>Regression</span>
//                         </label>
//                       </div>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </div>
//         );
//       })}
//     </div>
//   );
// }
// renderer/src/components/ExecutionPanel.tsx
import React, { useContext, useEffect, useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlayIcon,
  FireIcon,
  TagIcon,
  DocumentTextIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { ProjectContext } from '../context/ProjectContext';
import { ProjectMeta, TestSuite, TestCase } from '../../../shared/types';
import Spinner from './Spinner';

const BROWSERS = ['edge','firefox','safari','chrome'] as const;
type BrowserName = typeof BROWSERS[number];

interface CaseSel {
  selected: boolean;
  browsers: Record<BrowserName, boolean>;
  smoke: boolean;
  regression: boolean;
}
interface SuiteSel extends CaseSel {
  cases: Record<string, CaseSel>;
}

export default function ExecutionPanel({ onBack }: { onBack: () => void }) {
  const { projectDir } = useContext(ProjectContext);
  const [meta, setMeta] = useState<ProjectMeta|null>(null);
  const [sel, setSel] = useState<Record<string,SuiteSel>>({});
  const [openSuites, setOpenSuites] = useState<Record<string,boolean>>({});
  const [running, setRunning] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [isHeadless, setIsHeadless] = useState(true);

  // load metadata & initialize
  useEffect(() => {
    if (!projectDir) return;
    window.api.loadMeta(projectDir).then(m => {
      setMeta(m);
      const initial: Record<string,SuiteSel> = {};
      const opens: Record<string,boolean> = {};
      m.suites.forEach((suite: TestSuite) => {
        const defaultBrows = { chromium:false, firefox:false, webkit:false, chrome:false };
        const cases: Record<string,CaseSel> = {};
        suite.cases.forEach((c: TestCase) => {
          const tags = Array.isArray(c.tags) ? c.tags : [];
          cases[c.name] = {
            selected: false,
            browsers: { ...defaultBrows },
            smoke: tags.includes('smoke'),
            regression: tags.includes('regression'),
          };
        });
        initial[suite.name] = {
          selected: false,
          browsers: { ...defaultBrows },
          smoke: false,
          regression: false,
          cases,
        };
        opens[suite.name] = true;
      });
      setSel(initial);
      setOpenSuites(opens);
    });
  }, [projectDir]);

  if (!meta) return <p>Loading…</p>;
  if (Object.keys(sel).length !== meta.suites.length) return <p>Initializing…</p>;

  const anySmoke = Object.values(sel).some(s =>
    Object.values(s.cases).some(c => c.smoke)
  );
  const anyReg = Object.values(sel).some(s =>
    Object.values(s.cases).some(c => c.regression)
  );

  // helper to run tasks in parallel
  async function runParallel(tasks: Promise<any>[]) {
    setRunning(true);
    try { await Promise.all(tasks); }
    finally { setRunning(false); }
  }

  // Execute Selected
  const handleExecuteSelected = () => {
    if (!projectDir) return;
    const tasks: Promise<any>[] = [];
    Object.entries(sel).forEach(([suiteName, S]) => {
      if (S.selected) {
        const chosen = BROWSERS.filter(b => S.browsers[b]);
        const runOn = chosen.length ? chosen : ['chrome'];
        runOn.forEach(b =>
          tasks.push(window.api.runSuite(projectDir, suiteName, isHeadless, [b]))
        );
      }
      Object.entries(S.cases).forEach(([caseName, C]) => {
        if (C.selected) {
          const chosen = BROWSERS.filter(b => C.browsers[b]);
          const runOn = chosen.length ? chosen : ['chrome'];
          runOn.forEach(b =>
            tasks.push(window.api.runTestCase(projectDir, suiteName, caseName, isHeadless, [b]))
          );
        }
      });
    });
    runParallel(tasks);
  };

  // Execute Smoke
  const handleExecuteSmoke = () => {
    if (!projectDir) return;
    const tasks: Promise<any>[] = [];
    Object.entries(sel).forEach(([suiteName, S]) => {
      Object.entries(S.cases).forEach(([caseName, C]) => {
        if (C.smoke) {
          const chosen = BROWSERS.filter(b => C.browsers[b]);
          const runOn = chosen.length ? chosen : ['chrome'];
          runOn.forEach(b =>
            tasks.push(window.api.runTestCase(projectDir, suiteName, caseName, isHeadless, [b]))
          );
        }
      });
    });
    runParallel(tasks);
  };

  // Execute Regression
  const handleExecuteRegression = () => {
    if (!projectDir) return;
    const tasks: Promise<any>[] = [];
    Object.entries(sel).forEach(([suiteName, S]) => {
      Object.entries(S.cases).forEach(([caseName, C]) => {
        if (C.regression) {
          const chosen = BROWSERS.filter(b => C.browsers[b]);
          const runOn = chosen.length ? chosen : ['chrome'];
          runOn.forEach(b =>
            tasks.push(window.api.runTestCase(projectDir, suiteName, caseName, isHeadless, [b]))
          );
        }
      });
    });
    runParallel(tasks);
  };

  // Generate / Clear Reports
  const handleGenerateReport = async () => {
    if (!projectDir) return;
    setGeneratingReport(true);
    try { await window.api.generateReport(projectDir); }
    finally { setGeneratingReport(false); }
  };
  const handleClearReports = async () => {
    if (!projectDir) return;
    setClearing(true);
    try {
      await window.api.clearReports(projectDir);
      alert('Old reports deleted');
    } finally { setClearing(false); }
  };

  // UI toggles
  const toggleSuiteOpen = (suite: string) =>
    setOpenSuites(o => ({ ...o, [suite]: !o[suite] }));

  const updateSuiteField = (
    suiteName: string,
    field: keyof CaseSel,
    cascade: boolean
  ) => {
    setSel(prev => {
      const S = prev[suiteName], nv = !S[field];
      const newCases = cascade
        ? Object.fromEntries(Object.entries(S.cases).map(
            ([k,c]) => [k, { ...c, [field]: nv }]))
        : S.cases;
      return { ...prev, [suiteName]: { ...S, [field]: nv, cases: newCases } };
    });
  };

  const updateCaseField = (
    suiteName: string,
    caseName: string,
    field: keyof CaseSel
  ) => {
    setSel(prev => {
      const S = prev[suiteName],
            C = S.cases[caseName],
            nv = !C[field],
            newCases = { ...S.cases, [caseName]: { ...C, [field]: nv } },
            aggFields: (keyof CaseSel)[] = ['selected','smoke','regression'];
      const newSuite = {
        ...S,
        cases: newCases,
        ...(aggFields.includes(field)
          ? { [field]: Object.values(newCases).every(c2 => c2[field]) }
          : {}
        ),
      } as SuiteSel;
      return { ...prev, [suiteName]: newSuite };
    });
  };

  const toggleSuiteBrowser = (suiteName: string, b: BrowserName) =>
    setSel(prev => {
      const S = prev[suiteName], nv = !S.browsers[b];
      const suiteBrows = { ...S.browsers, [b]: nv };
      const cases = Object.fromEntries(Object.entries(S.cases).map(
        ([k,c]) => [k, { ...c, browsers: { ...c.browsers, [b]: nv } }]
      ));
      return { ...prev, [suiteName]: { ...S, browsers: suiteBrows, cases } };
    });

  const toggleCaseBrowser = (suiteName: string, caseName: string, b: BrowserName) =>
    setSel(prev => {
      const S = prev[suiteName],
            C = S.cases[caseName],
            nv = !C.browsers[b],
            updated = { ...C.browsers, [b]: nv },
            cases = { ...S.cases, [caseName]: { ...C, browsers: updated } },
            suiteHasAll = Object.values(cases).every(c2 => c2.browsers[b]);
      return {
        ...prev,
        [suiteName]: {
          ...S,
          browsers: { ...S.browsers, [b]: suiteHasAll },
          cases
        }
      };
    });

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <label className="inline-flex items-center space-x-1 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isHeadless}
            onChange={e => setIsHeadless(e.target.checked)}
            className="h-4 w-4"
          />
          <span>Headless</span>
        </label>

        <button
          onClick={handleExecuteSelected}
          disabled={running||generatingReport||clearing}
          className="inline-flex items-center px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded disabled:opacity-50"
        >
          <PlayIcon className="h-4 w-4 mr-1" />
          <span>Run Selected</span>
        </button>

        {anySmoke && (
          <button
            onClick={handleExecuteSmoke}
            disabled={running}
            className="inline-flex items-center px-2 py-1 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded disabled:opacity-50"
          >
            <FireIcon className="h-4 w-4 mr-1" />
            <span>Run Smoke</span>
          </button>
        )}

        {anyReg && (
          <button
            onClick={handleExecuteRegression}
            disabled={running}
            className="inline-flex items-center px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded disabled:opacity-50"
          >
            <TagIcon className="h-4 w-4 mr-1" />
            <span>Run Reg</span>
          </button>
        )}

        <button
          onClick={handleGenerateReport}
          disabled={generatingReport||running||clearing}
          className="inline-flex items-center px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50"
        >
            <DocumentTextIcon className="h-4 w-4 mr-1" />
            <span>Reports</span>
        </button>

        <button
          onClick={handleClearReports}
          disabled={clearing||running||generatingReport}
          className="inline-flex items-center px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded disabled:opacity-50"
        >
          {clearing ? <Spinner size="sm" /> : <TrashIcon className="h-4 w-4 mr-1" />}
          <span>Clear</span>
        </button>
      </div>

      {/* Suite / Case Tree */}
      {meta.suites.map((suite: TestSuite) => {
        const S = sel[suite.name];
        const isOpen = openSuites[suite.name];
        return (
          <div key={suite.name} className="border rounded">
            <div
              className="flex items-center p-2 bg-gray-100 cursor-pointer"
              onClick={() => toggleSuiteOpen(suite.name)}
            >
              {isOpen
                ? <ChevronDownIcon className="h-5 w-5 mr-2"/>
                : <ChevronRightIcon className="h-5 w-5 mr-2"/>}

              <input
                type="checkbox"
                checked={S.selected}
                onClick={e => e.stopPropagation()}
                onChange={() => updateSuiteField(suite.name,'selected',true)}
              />
              <span className="ml-2 font-semibold">{suite.name}</span>

              <div className="ml-auto flex items-center space-x-2">
                {BROWSERS.map(b => (
                  <label key={b} className="flex items-center text-xs space-x-1">
                    <input
                      type="checkbox"
                      checked={S.browsers[b]}
                      onClick={e => e.stopPropagation()}
                      onChange={() => toggleSuiteBrowser(suite.name,b)}
                    />
                    <span>{b}</span>
                  </label>
                ))}
              </div>
            </div>

            {isOpen && (
              <div className="pl-8 pb-4 space-y-2">
                {suite.cases.map((tc: TestCase) => {
                  const C = S.cases[tc.name];
                  return (
                    <div
                      key={tc.name}
                      className="flex items-center p-2 hover:bg-gray-50 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={C.selected}
                        onClick={e => e.stopPropagation()}
                        onChange={() => updateCaseField(suite.name, tc.name, 'selected')}
                      />
                      <span className="ml-2">{tc.name}</span>

                      <div className="ml-auto flex items-center space-x-2">
                        {BROWSERS.map(b => (
                          <label key={b} className="flex items-center text-xs space-x-1">
                            <input
                              type="checkbox"
                              checked={C.browsers[b]}
                              onClick={e => e.stopPropagation()}
                              onChange={() => toggleCaseBrowser(suite.name, tc.name, b)}
                            />
                            <span>{b}</span>
                          </label>
                        ))}

                        {/* Smoke tag */}
                        {C.smoke ? (
                          <span
                            onClick={() => updateCaseField(suite.name, tc.name, 'smoke')}
                            className="cursor-pointer bg-orange-200 text-orange-800 px-2 text-xs rounded-full"
                          >
                            Smoke
                          </span>
                        ) : (
                          <button
                            onClick={() => updateCaseField(suite.name, tc.name, 'smoke')}
                            className="text-orange-500 text-xs hover:underline"
                          >
                            Tag Smoke
                          </button>
                        )}

                        {/* Regression tag */}
                        {C.regression ? (
                          <span
                            onClick={() => updateCaseField(suite.name, tc.name, 'regression')}
                            className="cursor-pointer bg-purple-200 text-purple-800 px-2 text-xs rounded-full"
                          >
                            Regression
                          </span>
                        ) : (
                          <button
                            onClick={() => updateCaseField(suite.name, tc.name, 'regression')}
                            className="text-purple-500 text-xs hover:underline"
                          >
                            Tag Regression
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
