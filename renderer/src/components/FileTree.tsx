// renderer/src/components/FileTree.tsx
import React, { useEffect, useState } from 'react';

export default function FileTree({ projectDir, key }: { projectDir: string; key?: number }) {
  const [nodes, setNodes] = useState<{ path: string, type: string }[]>([]);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    window.api
      .getFileTree(projectDir)
      .then((nodes: { path: string; type: string }[]) => {
        if (nodes.length === 0) {
          setError('No project folder found');
          setNodes([]);
        } else {
          setError(null);
          setNodes(nodes);
        }
      })
      .catch((err: unknown) => {
        console.error('FileTree error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError('Error loading tree: ' + errorMessage);
        setNodes([]);
      });
  }, [projectDir, key]);
  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <ul className="font-mono text-sm">
      {nodes.map((n) => (
        <li key={n.path}>
          {n.type === 'dir' ? '📁' : '📄'} {n.path}
        </li>
      ))}
    </ul>
  );
}
