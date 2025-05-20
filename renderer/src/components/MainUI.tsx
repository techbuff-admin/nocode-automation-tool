import React, { useEffect, useState } from 'react';
import Layout from './Layout';
import SystemCheck from './SystemCheck';
import ChatGPTPrompt from './ChatGPTPrompt';
import ActionPool from './ActionPool';
import TestSuiteBuilder from './TestSuiteBuilder';


export default function MainUI() {
  const [systemStatus, setSystemStatus] = useState<string[]>([]);
  const [generated, setGenerated] = useState('');
  const [actions, setActions] = useState<string[]>([]);

  useEffect(() => {
    window.api.systemCheck().then(setSystemStatus);
  }, []);

  return (
    <Layout>
      <SystemCheck />
      <ChatGPTPrompt
        onGenerate={(text) => {
          setGenerated(text);
        }}
      />

      {generated && (
        <pre className="bg-gray-100 p-2 rounded mb-6 overflow-auto">
          {generated}
        </pre>
      )}

      <ActionPool
        onAdd={(act) => setActions((a) => [...a, act])}
      />

      <TestSuiteBuilder actions={actions} />
    </Layout>
  );
}
