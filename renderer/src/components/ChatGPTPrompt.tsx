// renderer/src/components/ChatGPTPrompt.tsx
import React, { useContext, useEffect, useState } from 'react';
import {
  generateTestCases,
  fetchJiraDescription,
  fetchAzureDescription,
  jiraListIssues,
  azureListWorkItems,
} from '../services/api';
import { ChatContext } from '../context/ChatContext';
import { ProjectContext } from '../context/ProjectContext';
import { ArrowPathIcon, CloudArrowDownIcon } from '@heroicons/react/24/outline';

export default function ChatGPTPrompt() {
  const { prompt, setPrompt, setGenerated, setLoading, loading } =
    useContext(ChatContext)!;
  const { projectDir } = useContext(ProjectContext)!;

  const [jiraOpen, setJiraOpen] = useState(false);
  const [jiraLoading, setJiraLoading] = useState(false);
  const [jiraFilter, setJiraFilter] = useState('');
  const [jiraIssues, setJiraIssues] = useState<{ key: string; summary: string }[]>([]);

  const [azureOpen, setAzureOpen] = useState(false);
  const [azureLoading, setAzureLoading] = useState(false);
  const [azureFilter, setAzureFilter] = useState('');
  const [azureItems, setAzureItems] = useState<{ id: string; title: string }[]>([]);

  // Generate tests
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const text = await generateTestCases(prompt);
      setGenerated(text);
    } catch (err: any) {
      alert('Error generating test cases: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Open Jira search
  const openJira = () => {
    if (!projectDir) return;
    setJiraOpen(true);
    setJiraLoading(true);
    jiraListIssues(projectDir)
      .then((list) => setJiraIssues(list))
      .catch((e) => alert('Failed to list Jira tickets: ' + e.message))
      .finally(() => setJiraLoading(false));
  };
  const selectJira = async (key: string) => {
    setJiraOpen(false);
    setLoading(true);
    try {
      const desc = await fetchJiraDescription(projectDir, key);
      setPrompt(
        `Generate test cases for the following scenario from Jira ticket "${key}":\n\n${desc}`
      );
    } catch (err: any) {
      alert('Error fetching Jira description: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Open Azure search
  const openAzure = () => {
    if (!projectDir) return;
    setAzureOpen(true);
    setAzureLoading(true);
    azureListWorkItems(projectDir)
      .then((list) => setAzureItems(list))
      .catch((e) => alert('Failed to list Azure items: ' + e.message))
      .finally(() => setAzureLoading(false));
  };
  const selectAzure = async (id: string) => {
    setAzureOpen(false);
    setLoading(true);
    try {
      const desc = await fetchAzureDescription(projectDir, id);
      setPrompt(
        `Generate test cases for the following scenario from Azure work item "${id}":\n\n${desc}`
      );
    } catch (err: any) {
      alert('Error fetching Azure description: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Filtered lists
  const filteredJira = jiraIssues.filter(
    (i) =>
      i.key.toLowerCase().includes(jiraFilter.toLowerCase()) ||
      i.summary.toLowerCase().includes(jiraFilter.toLowerCase())
  );
  const filteredAzure = azureItems.filter(
    (w) =>
      w.id.toLowerCase().includes(azureFilter.toLowerCase()) ||
      w.title.toLowerCase().includes(azureFilter.toLowerCase())
  );

  return (
    <div className="mb-4">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your test scenario…"
        rows={5}
        className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg focus:outline-none focus:border-blue-500 transition"
      />

      {/* Jira + Azure CTAs */}
      <div className="flex space-x-2 mb-2">
        <button
          onClick={openJira}
          disabled={loading || !projectDir}
          className="flex items-center space-x-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          <ArrowPathIcon className="h-5 w-5" />
          <span>Fetch from Jira</span>
        </button>
        <button
          onClick={openAzure}
          disabled={loading || !projectDir}
          className="flex items-center space-x-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          <CloudArrowDownIcon className="h-5 w-5" />
          <span>Fetch from Azure</span>
        </button>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Generating…' : 'Generate'}
      </button>

      {/* Jira Search Modal */}
      {jiraOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-96 max-h-[80vh] overflow-auto p-4">
            <h3 className="text-lg font-semibold mb-2">Select Jira Ticket</h3>
            <input
              value={jiraFilter}
              onChange={(e) => setJiraFilter(e.target.value)}
              placeholder="Search tickets…"
              className="w-full border rounded px-2 py-1 mb-3"
            />

            {jiraLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : (
              <ul className="max-h-60 overflow-auto">
                {filteredJira.map((i) => (
                  <li key={i.key}>
                    <button
                      onClick={() => selectJira(i.key)}
                      className="text-left w-full px-2 py-1 hover:bg-gray-100 rounded"
                    >
                      <strong>{i.key}</strong>: {i.summary}
                    </button>
                  </li>
                ))}
                {filteredJira.length === 0 && (
                  <li className="py-2 text-gray-500">
                    No tickets found.&nbsp;
                    <button
                      className="underline text-blue-600"
                      onClick={() => {
                        setJiraOpen(false);
                        // Optionally navigate to Jira in browser...
                      }}
                    >
                      Please create one.
                    </button>
                  </li>
                )}
              </ul>
            )}

            <div className="mt-3 text-right">
              <button
                onClick={() => setJiraOpen(false)}
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Azure Search Modal */}
      {azureOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-96 max-h-[80vh] overflow-auto p-4">
            <h3 className="text-lg font-semibold mb-2">
              Select Azure Work Item
            </h3>
            <input
              value={azureFilter}
              onChange={(e) => setAzureFilter(e.target.value)}
              placeholder="Search work items…"
              className="w-full border rounded px-2 py-1 mb-3"
            />

            {azureLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : (
              <ul className="max-h-60 overflow-auto">
                {filteredAzure.map((w) => (
                  <li key={w.id}>
                    <button
                      onClick={() => selectAzure(w.id)}
                      className="text-left w-full px-2 py-1 hover:bg-gray-100 rounded"
                    >
                      <strong>{w.id}</strong>: {w.title}
                    </button>
                  </li>
                ))}
                {filteredAzure.length === 0 && (
                  <li className="py-2 text-gray-500">
                    No work items found.&nbsp;
                    <button
                      className="underline text-blue-600"
                      onClick={() => {
                        setAzureOpen(false);
                        // Optionally open Azure in browser...
                      }}
                    >
                      Please create one.
                    </button>
                  </li>
                )}
              </ul>
            )}

            <div className="mt-3 text-right">
              <button
                onClick={() => setAzureOpen(false)}
                className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
