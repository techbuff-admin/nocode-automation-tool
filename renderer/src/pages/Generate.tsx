// renderer/src/pages/Generate.tsx
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import IntegrationSettings from '../components/IntegrationSettings';
import ChatGPTPrompt from '../components/ChatGPTPrompt';
import { ChatContext } from '../context/ChatContext';
import DownloadButton from '../components/DownloadButton';
import { ProjectContext } from '../context/ProjectContext';

export default function Generate() {
  const { loading, generated } = useContext(ChatContext)!;
  const { projectDir } = useContext(ProjectContext)!;
  const navigate = useNavigate();

  // If no projectDir, force them to pick one
  if (!projectDir) {
    return (
      <div className="p-6 text-center">
        <p className="mb-4 text-red-600 font-semibold">
          Please select a project before generating tests.
        </p>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Choose Project
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Generate Test Cases</h2>

      {/* Integration settings */}
      <IntegrationSettings />

      {/* Prompt UI */}
      <ChatGPTPrompt />

      {/* Loader */}
      {loading && (
        <div className="flex items-center mt-4 text-gray-600">
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2" />
          <span>Generating test cases…</span>
        </div>
      )}

      {/* Generated output */}
      {generated && !loading && (
        <div className="mt-6">
          <pre className="bg-gray-100 p-4 rounded-lg whitespace-pre-wrap">
            {generated}
          </pre>
          <DownloadButton text={generated} />
        </div>
      )}
    </div>
  );
}
