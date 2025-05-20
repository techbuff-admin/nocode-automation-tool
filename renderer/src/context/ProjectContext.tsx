import React, { createContext, ReactNode, useState } from 'react';

interface ProjectContextType {
  projectDir: string | null;
  setProjectDir: (dir: string) => void;
}

export const ProjectContext = createContext<ProjectContextType>({
  projectDir: null,
  setProjectDir: () => {},
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectDir, setProjectDir] = useState<string | null>(null);

  return (
    <ProjectContext.Provider value={{ projectDir, setProjectDir }}>
      {children}
    </ProjectContext.Provider>
  );
}
