// renderer/src/pages/Generate.tsx
import React, { useContext } from 'react';
import IntegrationSettings from '../components/IntegrationSettings';    // ← new
import ChatGPTPrompt from '../components/ChatGPTPrompt';
import { ChatContext } from '../context/ChatContext';
import DownloadButton from '../components/DownloadButton';

export default function Generate() {
  const { loading, generated } = useContext(ChatContext)!;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Generate Test Cases</h2>

      {/* 0) Integration settings */}
      <IntegrationSettings />   {/* ← new */}

      {/* 1) Your prompt + generate button */}
      <ChatGPTPrompt />

      {/* 2) Inline loader, non-blocking */}
      {loading && (
        <div className="flex items-center mt-4 text-gray-600">
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full mr-2" />
          <span>Generating test cases…</span>
        </div>
      )}

      {/* 3) Once generated, show the text + Download button */}
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
