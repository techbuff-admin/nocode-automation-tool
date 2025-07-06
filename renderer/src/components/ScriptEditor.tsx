import React, { useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';

interface ScriptEditorProps {
  code: string;
  onChange: (newCode: string) => void;
}

export default function ScriptEditor({ code, onChange }: ScriptEditorProps) {
  const handleEditorWillMount = (monaco: Monaco) => {
    // 1) Tell TS about @playwright/test types (assumes it's in node_modules)
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      `/// <reference types="playwright__test" />`,
      'ts:filename/playwright.d.ts'
    );
    // 2) Point the resolver at your workspace so tsconfig.json is picked up
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      jsx: monaco.languages.typescript.JsxEmit.React,
      // ...any other flags your project needs
    });
  };

  return (
    <Editor
      height="60vh"
      language="typescript"
      theme="vs-dark"
      value={code}
      beforeMount={handleEditorWillMount}
      onChange={(v) => onChange(v || '')}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        automaticLayout: true,
      }}
    />
  );
}
