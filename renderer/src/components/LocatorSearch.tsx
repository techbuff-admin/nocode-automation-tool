// renderer/src/components/LocatorSearch.tsx
import React, { useState, useMemo } from 'react';
import { PageObject } from '../../../shared/types';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface LocatorSearchProps {
  pages?: PageObject[];                  // optional
  onSelect?: (locatorKey: string) => void;
  onAddNew?: () => void;
  onClose?: () => void;
}

export default function LocatorSearch({
  pages = [],
  onSelect = () => {},
  onAddNew = () => {},
  onClose = () => {},
}: LocatorSearchProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return pages
      .map((pg) => {
        const keys = Object.keys(pg.selectors || {});
        const matches = keys.filter((key) =>
          key.toLowerCase().includes(query.toLowerCase())
        );
        return { pageName: pg.name, keys: matches };
      })
      .filter((g) => g.keys.length > 0);
  }, [pages, query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg w-96 max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h3 className="text-lg font-semibold">Select a Locator</h3>
          <button onClick={onClose}>
            <XMarkIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4">
          <input
            type="text"
            placeholder="Search locators…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border rounded px-2 py-1 mb-4"
          />

          {filtered.length === 0 ? (
            <p className="text-gray-500">No locators found.</p>
          ) : (
            filtered.map((group) => (
              <div key={group.pageName} className="mb-3">
                <div className="font-medium">{group.pageName}</div>
                <ul className="ml-4 mt-1 space-y-1">
                  {group.keys.map((key) => {
                    const value = pages
                      .find((p) => p.name === group.pageName)
                      ?.selectors[key];
                    return (
                      <li key={key}>
                        <button
                          className="text-left w-full hover:underline"
                          onClick={() => {
                            onSelect(key);
                            onClose();
                          }}
                        >
                          {key}
                          {value ? ` → ${value}` : ''}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}

          <div className="mt-4">
            <button
              className="w-full text-center px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={() => {
                onAddNew();
                onClose();
              }}
            >
              + Add new locator…
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
