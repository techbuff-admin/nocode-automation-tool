// renderer/src/components/DownloadButton.tsx
import React from 'react';

interface DownloadButtonProps {
  /** The text to put into the downloaded file */
  text: string;
  /** Optional filename (defaults to "testcases.txt") */
  filename?: string;
}

export default function DownloadButton({
  text,
  filename = 'testcases.txt',
}: DownloadButtonProps) {
  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
    >
      Download Testcases
    </button>
  );
}
