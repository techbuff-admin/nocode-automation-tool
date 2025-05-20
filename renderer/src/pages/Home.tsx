// renderer/src/pages/Home.tsx
import React from 'react';
import SystemCheck from '../components/SystemCheck'; // Adjust the path as needed

export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Welcome to No-Code Automation Tool</h1>
      <p className="mb-6 text-gray-700">
        Use this desktop app to build and run end-to-end Playwright tests without writing code:
      </p>
      {/* SystemCheck goes here */}
      {/* You can import and render your updated SystemCheck component */}
      <SystemCheck />
    </div>
  );
}
