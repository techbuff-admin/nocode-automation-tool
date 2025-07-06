// // renderer/src/components/Layout.tsx
// import React, { ReactNode, useContext,useState } from 'react';
// import { NavLink } from 'react-router-dom';
// import { AuthContext } from '../context/AuthContext';

// // ← new: import icons
// import {
//   HomeIcon,
//   DocumentTextIcon,
//   FolderOpenIcon,
//   PlayIcon,
//   CubeIcon,
//   ClipboardIcon,
//   EyeIcon,
//   ArrowTopRightOnSquareIcon,
//   XMarkIcon,
//   Bars3Icon,
// } from '@heroicons/react/24/outline';

// export default function Layout({ children }: { children: ReactNode }) {
//   const { logout } = useContext(AuthContext);
//   const [collapsed, setCollapsed] = useState(false);

//   // helper for nav link styling
//   const linkClasses = (isActive: boolean) =>
//     `flex items-center px-3 py-2 rounded-md transition-colors ${
//       isActive
//         ? 'bg-blue-100 text-blue-800 font-semibold'
//         : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
//     }`;
//     const buttonClasses = `flex items-center w-full px-3 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors`;
//   return (
//     <div className="flex h-screen">
//       <aside  className={`flex flex-col bg-white border-r shadow-sm transition-all duration-200 ${
//           collapsed ? 'w-16' : 'w-60'
//         }`}
//       >
//         {/* <div className="px-6 py-4 text-xl font-bold border-b">My Automation</div> */}
//         {/* collapse/expand button */}
//         <div className="flex justify-end p-2">
//           <button
//             onClick={() => setCollapsed(c => !c)}
//             className="p-1 rounded hover:bg-gray-100"
//             title={collapsed ? 'Expand menu' : 'Collapse menu'}
//           >
//             {collapsed ? (
//               <Bars3Icon className="h-6 w-6 text-gray-600" />
//             ) : (
//               <XMarkIcon className="h-6 w-6 text-gray-600" />
//             )}
//           </button>
//         </div>
//         <nav className="flex-1 px-2 py-4 space-y-1">
//           <NavLink to="/" end className={({ isActive }) => linkClasses(isActive)}>
//             <HomeIcon className="h-5 w-5 mr-3 flex-shrink-0" />
//             Home
//           </NavLink>

//           <NavLink to="/meta" className={({ isActive }) => linkClasses(isActive)}>
//             <DocumentTextIcon className="h-5 w-5 mr-3 flex-shrink-0" />
//             Project Metadata
//           </NavLink>

//           <NavLink to="/projects" className={({ isActive }) => linkClasses(isActive)}>
//             <FolderOpenIcon className="h-5 w-5 mr-3 flex-shrink-0" />
//             My Projects
//           </NavLink>

//           <NavLink to="/generate" className={({ isActive }) => linkClasses(isActive)}>
//             <PlayIcon className="h-5 w-5 mr-3 flex-shrink-0" />
//             Generate Tests
//           </NavLink>

//           <NavLink to="/actions" className={({ isActive }) => linkClasses(isActive)}>
//             <CubeIcon className="h-5 w-5 mr-3 flex-shrink-0" />
//             Action Pool
//           </NavLink>

//           <NavLink to="/suite" className={({ isActive }) => linkClasses(isActive)}>
//             <ClipboardIcon className="h-5 w-5 mr-3 flex-shrink-0" />
//              Playground
//           </NavLink>
//            {/* ← new Console button */}
//            <button
//             onClick={() => window.api.openConsoleWindow()}
//             className={buttonClasses}
//           >
//             <EyeIcon className="h-5 w-5 mr-3 flex-shrink-0" />
//             Open Console logs
//           </button>
//         </nav>

//         <div className="px-6 py-4 border-t">
//           <button
//             onClick={() => {
//               if (confirm('Log out?')) logout();
//             }}
//             className="flex items-center w-full px-3 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
//           >
//             <ArrowTopRightOnSquareIcon className="h-5 w-5 mr-3 flex-shrink-0" />
//             Logout
//           </button>
//         </div>
//       </aside>

//       <main className="flex-1 p-6 overflow-auto bg-gray-50">{children}</main>
//     </div>
//   );
// }
// renderer/src/components/Layout.tsx
import React, { ReactNode, useContext, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

// ← imports
import {
  HomeIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  PlayIcon,
  CubeIcon,
  ClipboardIcon,
  EyeIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';

export default function Layout({ children }: { children: ReactNode }) {
  const { logout } = useContext(AuthContext);
  const [collapsed, setCollapsed] = useState(false);

  // main nav-item classes
  const navItemClasses = (isActive: boolean) => `
    flex items-center
    ${collapsed ? 'justify-center' : ''}
    px-3 py-2 rounded-md transition-colors
    ${isActive
      ? 'bg-blue-100 text-blue-800 font-semibold'
      : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'}
  `;

  // footer/logout button classes
  const footerItemClasses = `
    flex items-center
    ${collapsed ? 'justify-center' : ''}
    w-full px-3 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors
  `;

  return (
    <div className="flex h-screen">
      <aside
        className={`
          flex flex-col bg-white border-r shadow-sm
          transition-all duration-200
          ${collapsed ? 'w-16' : 'w-60'}
        `}
      >
        {/* collapse/expand toggle */}
        <div className="flex justify-end p-2">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1 rounded hover:bg-gray-100"
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {collapsed ? (
              <Bars3Icon className="h-6 w-6 text-gray-600" />
            ) : (
              <XMarkIcon className="h-6 w-6 text-gray-600" />
            )}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          <NavLink to="/" end className={({ isActive }) => navItemClasses(isActive)}>
            <HomeIcon className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Home'}
          </NavLink>

          <NavLink to="/meta" className={({ isActive }) => navItemClasses(isActive)}>
            <DocumentTextIcon className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Project Metadata'}
          </NavLink>

          <NavLink to="/projects" className={({ isActive }) => navItemClasses(isActive)}>
            <FolderOpenIcon className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'My Projects'}
          </NavLink>

          <NavLink to="/generate" className={({ isActive }) => navItemClasses(isActive)}>
            <PlayIcon className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Generate Tests'}
          </NavLink>

          <NavLink to="/actions" className={({ isActive }) => navItemClasses(isActive)}>
            <CubeIcon className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Action Pool'}
          </NavLink>

          <NavLink to="/suite" className={({ isActive }) => navItemClasses(isActive)}>
            <ClipboardIcon className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Playground'}
          </NavLink>

          {/* Console logs */}
          <button
            onClick={() => window.api.openConsoleWindow()}
            className={`
              flex items-center
              ${collapsed ? 'justify-center' : ''}
              w-full px-3 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors
            `}
          >
            <EyeIcon className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Open Console'}
          </button>
        </nav>

        <div className="px-6 py-4 border-t">
          <button
            onClick={() => {
              if (confirm('Log out?')) logout();
            }}
            className={footerItemClasses}
          >
            <ArrowTopRightOnSquareIcon
              className={`h-5 w-5 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`}
            />
            {!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto bg-gray-50">{children}</main>
    </div>
  );
}
