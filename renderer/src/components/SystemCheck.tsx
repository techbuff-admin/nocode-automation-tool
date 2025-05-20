// renderer/src/components/SystemCheck.tsx
import React, { useEffect, useState } from 'react';

interface DepStatus {
  name: 'playwright' | 'java' | 'allure';
  display: string;
  installed: boolean;
  version?: string;
}

export default function SystemCheck() {
  const [list, setList] = useState<DepStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    window.api
      .systemCheck()
      .then(setList)
      .finally(() => setLoading(false));
  }, []);

  const handleInstall = async (dep: DepStatus) => {
    setInstalling(dep.name);
    try {
      await window.api.installDependency(dep.name);
      const updated = await window.api.systemCheck();
      setList(updated);
    } catch (err) {
      alert(`Failed to install ${dep.display}: ${err}`);
    } finally {
      setInstalling(null);
    }
  };

  if (loading) {
    return (
      <section className="mb-6 flex flex-col items-center">
        {/* Spinner */}
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-gray-600">Checking system requirements…</p>

        {/* Indeterminate progress bar */}
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
        {/* …thead… */}
        <tbody>
          {list.map((dep) => (
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
                {dep.installed
                  ? null
                  : dep.name === 'java' ? (
                    <button
                    onClick={() =>
                      window.api.openExternal('https://adoptium.net/releases.html')
                        .catch(err => alert('Failed to open browser: ' + err))
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
                    )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
