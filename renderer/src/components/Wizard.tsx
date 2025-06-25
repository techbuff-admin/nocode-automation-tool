// // src/components/Wizard.tsx
// import React, { useState,useContext } from 'react';
// import { SparklesIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
// import { ProjectContext } from '../context/ProjectContext';
// import ApplicationConfig from './ApplicationConfig';
// import PageManager from './PageManager';
// import SuitePlayground from './SuitePlayground';


// const steps = ['App Config', 'Page Objects', 'Suites & Cases'] as const;
 

// export default function Wizard() {
//   const [currentStep, setCurrentStep] = useState(0);
//   const { projectDir } = useContext(ProjectContext);
//   const projectName = projectDir?.split(/[\\/]/).pop() || 'Project';
//   return (
//     <div className="flex flex-col h-full">
//           <header className="flex items-center space-x-2 bg-gray-50 p-4 rounded-md shadow mb-6">
//   <SparklesIcon className="h-6 w-6 text-blue-500" />
//   <h3 className="text-3xl font-extrabold leading-tight">
//     Automation Playground for project {' '}
//     <span className="text-blue-600 underline">
//       {projectName}
//     </span>
//   </h3>
//   <RocketLaunchIcon className="h-6 w-6 text-blue-500" />
// </header>
//       {/* Step tabs */}
//       <nav className="flex border-b">
//         {steps.map((label, idx) => (
//           <button
//             key={label}
//             onClick={() => setCurrentStep(idx)}
//             className={
//               `px-4 py-2 -mb-px flex-1 text-center ` +
//               (currentStep === idx
//                 ? 'border-b-2 border-blue-600 font-semibold'
//                 : 'text-gray-500 hover:text-gray-700')
//             }
//           >
//             {label}
//           </button>
//         ))}
//       </nav>

//       {/* Content area */}
//       <div className="flex-1 overflow-auto p-6">
//         {currentStep === 0 && (
//           <ApplicationConfig onNext={() => setCurrentStep(1)} />
//         )}
//         {currentStep === 1 && (
//           <PageManager
//             onBack={() => setCurrentStep(0)}
//             onNext={() => setCurrentStep(2)}
//           />
//         )}
//         {currentStep === 2 && <SuitePlayground onBack={() => setCurrentStep(1)} />}
//       </div>
//     </div>
//   );
// }
// src/components/Wizard.tsx
import React, { useState, useContext } from 'react';
import { SparklesIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
import { ProjectContext } from '../context/ProjectContext';
import ApplicationConfig from './ApplicationConfig';
import PageManager from './PageManager';
import SuitePlayground from './SuitePlayground';
import ExecutionPanel from './ExecutionPanel';  // ← new

const steps = [
  'App Config',
  'Page Objects',
  'Suites & Cases',
  'Execution & Reports',  // ← added
] as const;

export default function Wizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const { projectDir } = useContext(ProjectContext);
  const projectName = projectDir?.split(/[\\/]/).pop() || 'Project';

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center space-x-2 bg-gray-50 p-4 rounded-md shadow mb-6">
        <SparklesIcon className="h-6 w-6 text-blue-500" />
        <h3 className="text-3xl font-extrabold leading-tight">
          Automation Playground for project{' '}
          <span className="text-blue-600 underline">{projectName}</span>
        </h3>
        <RocketLaunchIcon className="h-6 w-6 text-blue-500" />
      </header>

      {/* Step tabs */}
      <nav className="flex border-b">
        {steps.map((label, idx) => (
          <button
            key={label}
            onClick={() => setCurrentStep(idx)}
            className={
              `px-4 py-2 -mb-px flex-1 text-center ` +
              (currentStep === idx
                ? 'border-b-2 border-blue-600 font-semibold'
                : 'text-gray-500 hover:text-gray-700')
            }
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Content area */}
      <div className="flex-1 overflow-auto p-6">
        {currentStep === 0 && (
          <ApplicationConfig onNext={() => setCurrentStep(1)} />
        )}
        {currentStep === 1 && (
          <PageManager
            onBack={() => setCurrentStep(0)}
            onNext={() => setCurrentStep(2)}
          />
        )}
        {currentStep === 2 && (
          <SuitePlayground onBack={() => setCurrentStep(1)} />
        )}
        {currentStep === 3 && (
          <ExecutionPanel onBack={() => setCurrentStep(2)} />
        )}
      </div>
    </div>
  );
}
