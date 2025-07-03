import React, { useEffect, useState } from 'react';

interface DepStatus {
  name: 'playwright' | 'java' | 'allure' | 'msedge';
  display: string;
  installed: boolean;
  version?: string;
  latestVersion?: string;
}

export default function SystemCheck() {
  const [list, setList] = useState<DepStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const deps = await window.api.systemCheck();
      setList(deps);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const handleInstall = async (dep: DepStatus) => {
    setInstalling(dep.name);
    try {
      await window.api.installDependency(dep.name);
      await reload();
    } catch (err: any) {
      alert(`Failed to install ${dep.display}: ${err}`);
    } finally {
      setInstalling(null);
    }
  };

  const handleUpdate = async (dep: DepStatus) => {
    setInstalling(dep.name);
    try {
      // for Playwright, we want to re-install CLI and browsers
      if (dep.name === 'playwright') {
        await window.api.installDependency('playwright');
      }
      if (dep.name === 'msedge') {
        await window.api.installDependency('msedge');
      } else if (dep.name === 'allure') {
        await window.api.installDependency('allure');
      }
      await reload();
    } catch (err: any) {
      alert(`Failed to update ${dep.display}: ${err}`);
    } finally {
      setInstalling(null);
    }
  };

  if (loading) {
    return (
      <section className="mb-6 flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-gray-600">Checking system requirements…</p>
        <div className="w-full max-w-md bg-gray-200 rounded-full h-2 mt-4 overflow-hidden">
          <div className="h-2 w-1/3 bg-blue-600 animate-pulse" />
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <h3 className="text-lg font-semibold mb-2">🔧 System Requirements</h3>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="py-2">Dependency</th>
            <th className="py-2">Status</th>
            <th className="py-2">Installed</th>
            <th className="py-2">Latest</th>
            <th className="py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {list.map(dep => {
            const needUpdate =
              dep.installed &&
              dep.latestVersion &&
              dep.version !== dep.latestVersion;

            return (
              <tr key={dep.name} className="border-t">
                <td className="py-2">{dep.display}</td>
                <td className="py-2">
                  {dep.installed
                    ? <span className="text-green-600">✅ Installed</span>
                    : <span className="text-red-600">❌ Missing</span>}
                </td>
                <td className="py-2">
                  {dep.version ?? <em className="text-gray-500">—</em>}
                </td>
                <td className="py-2">
                  {dep.latestVersion ?? <em className="text-gray-500">—</em>}
                </td>
                <td className="py-2 space-x-2">
                  {!dep.installed ? (
                    dep.name === 'java' ? (
                      <button
                        onClick={() =>
                          window.api.openExternal('https://adoptium.net/releases.html')
                        }
                        className="px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                      >
                        Download
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInstall(dep)}
                        disabled={installing === dep.name}
                        className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {installing === dep.name ? 'Installing…' : 'Install'}
                      </button>
                    )
                  ) : needUpdate ? (
                    <button
                      onClick={() => handleUpdate(dep)}
                      disabled={installing === dep.name}
                      className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {installing === dep.name ? 'Updating…' : 'Update'}
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
