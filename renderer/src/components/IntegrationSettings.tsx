// renderer/src/components/IntegrationSettings.tsx
import React, { useContext, useEffect, useState } from 'react';
import { ProjectContext } from '../context/ProjectContext';
import { ProjectMeta } from '../../../shared/types';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

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

  // Tooltip state
  const [showTooltip, setShowTooltip] = useState<{
    [key: string]: boolean;
  }>({});

  // Load existing meta
  useEffect(() => {
    if (!projectDir) return;
    window.api
      .loadMeta(projectDir)
      .then((m: ProjectMeta) => {
        setMeta(m);
        setIntegrations((m as any).integrations || {});
      })
      .catch((err) => {
        console.error('Failed to load integrations', err);
      });
  }, [projectDir]);

  // Save integrations back to disk
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
    } catch (err: any) {
      console.error('Error saving integrations', err);
      alert('Failed to save settings: ' + (err.message || err));
    } finally {
      setSaving(false);
    }
  };

  // Helper to render a label+tooltip
  function renderLabel(
    htmlFor: string,
    text: string,
    tooltipKey: string,
    tipText: string
  ) {
    return (
      <label className="flex items-center mb-1">
        <span className="font-medium mr-1">{text}</span>
        <button
          type="button"
          onClick={() =>
            setShowTooltip((t) => ({ ...t, [tooltipKey]: !t[tooltipKey] }))
          }
          className="relative p-1 text-gray-600 hover:text-gray-800"
        >
          <QuestionMarkCircleIcon className="h-5 w-5" />
          {showTooltip[tooltipKey] && (
            <div className="absolute z-10 left-0 top-full mt-1 w-64 p-2 bg-gray-700 text-white text-sm rounded shadow-lg">
              {tipText}
            </div>
          )}
        </button>
      </label>
    );
  }

  return (
    <div className="mb-6 p-4 border rounded-lg bg-gray-50">
      <h2 className="text-xl font-semibold mb-4">Integration Settings</h2>

      {/* Jira */}
      <div className="space-y-2 mb-4">
        {renderLabel(
          'jiraBaseUrl',
          'Jira Base URL',
          'jiraBaseUrl',
          'Your Jira Cloud base URL, e.g. https://yourcompany.atlassian.net'
        )}
        <input
          id="jiraBaseUrl"
          type="text"
          value={integrations.jiraBaseUrl || ''}
          onChange={(e) =>
            setIntegrations((i) => ({ ...i, jiraBaseUrl: e.target.value }))
          }
          className="w-full border rounded px-2 py-1"
          placeholder="https://yourcompany.atlassian.net"
        />

        {renderLabel(
          'jiraEmail',
          'Jira Email',
          'jiraEmail',
          'The email address of your Atlassian account'
        )}
        <input
          id="jiraEmail"
          type="email"
          value={integrations.jiraEmail || ''}
          onChange={(e) =>
            setIntegrations((i) => ({ ...i, jiraEmail: e.target.value }))
          }
          className="w-full border rounded px-2 py-1"
          placeholder="you@yourcompany.com"
        />

        {renderLabel(
          'jiraToken',
          'Jira API Token',
          'jiraToken',
          'Generate at https://id.atlassian.com/manage-profile/security/api-tokens'
        )}
        <input
          id="jiraToken"
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
        {renderLabel(
          'azureOrgUrl',
          'Azure DevOps Org URL',
          'azureOrgUrl',
          'Your Azure DevOps URL, e.g. https://dev.azure.com/yourOrg'
        )}
        <input
          id="azureOrgUrl"
          type="text"
          value={integrations.azureOrgUrl || ''}
          onChange={(e) =>
            setIntegrations((i) => ({ ...i, azureOrgUrl: e.target.value }))
          }
          className="w-full border rounded px-2 py-1"
          placeholder="https://dev.azure.com/yourOrg"
        />
     {renderLabel(
          'azureProject',
          'Azure Project',
          'azureProject',
          'The name of your Azure DevOps project (e.g. MyTeamProject)'
          
        )}     
    <input
    type="text"
    value={integrations.azureProject || ''}
    onChange={e => setIntegrations(i => ({ ...i, azureProject: e.target.value }))}
    placeholder="e.g. MyTeamProject"
   className="w-full border rounded px-2 py-1"
   />
        {renderLabel(
          'azurePAT',
          'Azure DevOps PAT',
          'azurePAT',
          'Personal Access Token with Work Items (read) scope'
        )}
        <input
          id="azurePAT"
          type="password"
          value={integrations.azurePAT || ''}
          onChange={(e) =>
            setIntegrations((i) => ({ ...i, azurePAT: e.target.value }))
          }
          className="w-full border rounded px-2 py-1"
          placeholder="••••••••••"
        />
      </div>

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
