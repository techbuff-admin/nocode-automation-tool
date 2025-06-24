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
  EyeIcon,
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
    const buttonClasses = `flex items-center w-full px-3 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors`;
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
           {/* ← new Console button */}
           <button
            onClick={() => window.api.openConsoleWindow()}
            className={buttonClasses}
          >
            <EyeIcon className="h-5 w-5 mr-3 flex-shrink-0" />
            Open Console logs
          </button>
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
