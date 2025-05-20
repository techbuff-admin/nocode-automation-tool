// renderer/src/components/Layout.tsx
import React, { ReactNode, useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function Layout({ children }: { children: ReactNode }) {
  const { logout } = useContext(AuthContext);

  return (
    <div className="flex h-screen">
      <aside className="flex flex-col w-60 bg-gray-100 p-4 border-r">
        <nav className="space-y-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? 'block font-semibold' : 'block text-gray-700'
            }
          >
            Home
          </NavLink>
          <NavLink to="/project-setup" className="block text-gray-700">
               New web project
            </NavLink>
          <NavLink
            to="/generate"
            className={({ isActive }) =>
              isActive ? 'block font-semibold' : 'block text-gray-700'
            }
          >
            Generate Tests
          </NavLink>
          <NavLink
            to="/actions"
            className={({ isActive }) =>
              isActive ? 'block font-semibold' : 'block text-gray-700'
            }
          >
            Action Pool
          </NavLink>
          {/* <NavLink
            to="/suite"
            className={({ isActive }) =>
              isActive ? 'block font-semibold' : 'block text-gray-700'
            }
          >
            Test Suite
          </NavLink> */}
        </nav>

        <div className="flex-1" />

        <button
          onClick={() => {
            if (confirm('Log out?')) logout();
          }}
          className="mt-4 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Logout
        </button>
      </aside>

      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
