import React, { createContext, ReactNode, useState } from 'react';

interface ProjectContextType {
  basePath: string | null;
  setBasePath: (p: string | null) => void;

  projectName: string;
  setProjectName: (n: string) => void;

  projectDir: string | null;
  setProjectDir: (d: string | null) => void;
}

export const ProjectContext = createContext<ProjectContextType>({
  basePath: null,
  setBasePath: () => {},         // still a no-op default

  projectName: '',
  setProjectName: () => {},

  projectDir: null,
  setProjectDir: () => {},
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  // basePath can be null
  const [basePath, setBasePath] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  // projectDir can be null
  const [projectDir, setProjectDir] = useState<string | null>(null);

  return (
    <ProjectContext.Provider
      value={{
        basePath,
        setBasePath,
        projectName,
        setProjectName,
        projectDir,
        setProjectDir,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}
