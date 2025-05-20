import React, { useEffect, useState } from 'react';

export default function FileTree({ projectDir }) {
  const [nodes, setNodes] = useState<{path:string;type:'file'|'dir'}[]>([]);

  useEffect(() => {
    window.api.getFileTree(projectDir).then(setNodes);
  }, [projectDir]);

  return (
    <ul className="font-mono text-sm">
      {nodes.map(n => (
        <li key={n.path}>
          {n.type === 'dir' ? '📁' : '📄'} {n.path}
        </li>
      ))}
    </ul>
  );
}
