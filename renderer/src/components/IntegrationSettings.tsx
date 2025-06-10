// renderer/src/components/IntegrationSettings.tsx
import React, { useContext, useEffect, useState } from 'react';
import { ProjectContext } from '../context/ProjectContext';
import { ProjectMeta } from '../../../shared/types';

interface Integrations {
  jiraBaseUrl?: string;
  jiraEmail?: string;
  jiraToken?: string;
  azureOrgUrl?: string;
  azurePAT?: string;
}

export default function IntegrationSettings() {
  const { projectDir } = useContext(ProjectContext);
  const [meta, setMeta] = useState<ProjectMeta | null>(null);
  const [integrations, setIntegrations] = useState<Integrations>({});
  const [saving, setSaving] = useState(false);

  // 1) Load on mount
  useEffect(() => {
    if (!projectDir) return;
    window.api.loadMeta(projectDir)
      .then((m: ProjectMeta) => {
        setMeta(m);
        setIntegrations((m as any).integrations || {});
      })
      .catch((err) => {
        console.error('Failed to load integrations', err);
      });
  }, [projectDir]);

  // 2) Handler to save integrations
  const save = async () => {
    if (!meta || !projectDir) return;
    setSaving(true);
    try {
      const updated: ProjectMeta = {
        ...meta,
        integrations: { ...integrations },
      };
      await window.api.saveMeta(projectDir, updated);
      setMeta(updated);
      // (optional) show a toast/snackbar here
    } catch (err: any) {
      console.error('Error saving integrations', err);
      alert('Failed to save settings: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 p-4 border rounded-lg bg-gray-50">
      <h2 className="text-xl font-semibold mb-4">Integration Settings</h2>

      {/* Jira */}
      <div className="space-y-2 mb-4">
        <label className="block font-medium">Jira Base URL</label>
        <input
          type="text"
          value={integrations.jiraBaseUrl || ''}
          onChange={(e) =>
            setIntegrations((i) => ({ ...i, jiraBaseUrl: e.target.value }))
          }
          className="w-full border rounded px-2 py-1"
          placeholder="https://yourcompany.atlassian.net"
        />

        <label className="block font-medium">Jira Email</label>
        <input
          type="email"
          value={integrations.jiraEmail || ''}
          onChange={(e) =>
            setIntegrations((i) => ({ ...i, jiraEmail: e.target.value }))
          }
          className="w-full border rounded px-2 py-1"
          placeholder="you@yourcompany.com"
        />

        <label className="block font-medium">Jira API Token</label>
        <input
          type="password"
          value={integrations.jiraToken || ''}
          onChange={(e) =>
            setIntegrations((i) => ({ ...i, jiraToken: e.target.value }))
          }
          className="w-full border rounded px-2 py-1"
          placeholder="••••••••••"
        />
      </div>

      {/* Azure DevOps */}
      <div className="space-y-2 mb-4">
        <label className="block font-medium">Azure DevOps Org URL</label>
        <input
          type="text"
          value={integrations.azureOrgUrl || ''}
          onChange={(e) =>
            setIntegrations((i) => ({ ...i, azureOrgUrl: e.target.value }))
          }
          className="w-full border rounded px-2 py-1"
          placeholder="https://dev.azure.com/yourOrg"
        />

        <label className="block font-medium">Azure DevOps PAT</label>
        <input
          type="password"
          value={integrations.azurePAT || ''}
          onChange={(e) =>
            setIntegrations((i) => ({ ...i, azurePAT: e.target.value }))
          }
          className="w-full border rounded px-2 py-1"
          placeholder="••••••••••"
        />
      </div>

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
}
