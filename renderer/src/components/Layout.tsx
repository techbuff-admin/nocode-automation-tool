// // renderer/src/components/Layout.tsx
// import React, { ReactNode, useContext } from 'react';
// import { NavLink } from 'react-router-dom';
// import { AuthContext } from '../context/AuthContext';

// export default function Layout({ children }: { children: ReactNode }) {
//   const { logout } = useContext(AuthContext);

//   return (
//     <div className="flex h-screen">
//       <aside className="flex flex-col w-60 bg-gray-100 p-4 border-r">
//         <nav className="space-y-2">
//           <NavLink
//             to="/"
//             className={({ isActive }) =>
//               isActive ? 'block font-semibold' : 'block text-gray-700'
//             }
//           >
//             Home
//           </NavLink>
//           <NavLink
//             to="/meta"
//             className={({ isActive }) =>
//               isActive ? 'block font-semibold' : 'block text-gray-700'
//             }
//           >
//             Project Metadata
//           </NavLink>
//           <NavLink to="/projects" className="block text-gray-700">
//            My Projects
//             </NavLink>
//           {/* <NavLink to="/project-setup" className="block text-gray-700">
//                New web project
//             </NavLink> */}
//           <NavLink
//             to="/generate"
//             className={({ isActive }) =>
//               isActive ? 'block font-semibold' : 'block text-gray-700'
//             }
//           >
//             Generate Tests
//           </NavLink>
//           <NavLink
//             to="/actions"
//             className={({ isActive }) =>
//               isActive ? 'block font-semibold' : 'block text-gray-700'
//             }
//           >
//             Action Pool
//           </NavLink>
//           <NavLink
//             to="/suite"
//             className={({ isActive }) =>
//               isActive ? 'block font-semibold' : 'block text-gray-700'
//             }
//           >
//             Test Suite
//           </NavLink>
//         </nav>

//         <div className="flex-1" />

//         <button
//           onClick={() => {
//             if (confirm('Log out?')) logout();
//           }}
//           className="mt-4 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
//         >
//           Logout
//         </button>
//       </aside>

//       <main className="flex-1 p-6 overflow-auto">{children}</main>
//     </div>
//   );
// }
// renderer/src/components/Layout.tsx
import React, { ReactNode, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// ← new: import icons
import {
  HomeIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  PlayIcon,
  CubeIcon,
  ClipboardIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

export default function Layout({ children }: { children: ReactNode }) {
  const { logout } = useContext(AuthContext);

  // helper for nav link styling
  const linkClasses = (isActive: boolean) =>
    `flex items-center px-3 py-2 rounded-md transition-colors ${
      isActive
        ? 'bg-blue-100 text-blue-800 font-semibold'
        : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
    }`;

  return (
    <div className="flex h-screen">
      <aside className="flex flex-col w-60 bg-white border-r shadow-sm">
        {/* <div className="px-6 py-4 text-xl font-bold border-b">My Automation</div> */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          <NavLink to="/" end className={({ isActive }) => linkClasses(isActive)}>
            <HomeIcon className="h-5 w-5 mr-3 flex-shrink-0" />
            Home
          </NavLink>

          <NavLink to="/meta" className={({ isActive }) => linkClasses(isActive)}>
            <DocumentTextIcon className="h-5 w-5 mr-3 flex-shrink-0" />
            Project Metadata
          </NavLink>

          <NavLink to="/projects" className={({ isActive }) => linkClasses(isActive)}>
            <FolderOpenIcon className="h-5 w-5 mr-3 flex-shrink-0" />
            My Projects
          </NavLink>

          <NavLink to="/generate" className={({ isActive }) => linkClasses(isActive)}>
            <PlayIcon className="h-5 w-5 mr-3 flex-shrink-0" />
            Generate Tests
          </NavLink>

          <NavLink to="/actions" className={({ isActive }) => linkClasses(isActive)}>
            <CubeIcon className="h-5 w-5 mr-3 flex-shrink-0" />
            Action Pool
          </NavLink>

          <NavLink to="/suite" className={({ isActive }) => linkClasses(isActive)}>
            <ClipboardIcon className="h-5 w-5 mr-3 flex-shrink-0" />
             Playground
          </NavLink>
        </nav>

        <div className="px-6 py-4 border-t">
          <button
            onClick={() => {
              if (confirm('Log out?')) logout();
            }}
            className="flex items-center w-full px-3 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="h-5 w-5 mr-3 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto bg-gray-50">{children}</main>
    </div>
  );
}
