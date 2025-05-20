import { contextBridge, ipcRenderer, shell } from 'electron';

// Expose safe APIs to renderer
contextBridge.exposeInMainWorld('api', {
  systemCheck: () => ipcRenderer.invoke('system:check'),
  //createProject: (config: any) => ipcRenderer.invoke('project:create', config),
  runTests: (scripts: string[]) => ipcRenderer.invoke('tests:execute', scripts),
  installDependency: (depName: string) =>
    ipcRenderer.invoke('dependency:install', depName),

  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  createProject: (opts: { basePath: string; projectName: string }) =>
    ipcRenderer.invoke('project:create', opts),
  createSuite: (opts: { projectDir: string; suiteName: string }) =>
    ipcRenderer.invoke('suite:create', opts),
  createTestCase: (opts: {
    projectDir: string;
    suiteFile: string;
    caseCode: string;
  }) => ipcRenderer.invoke('case:add', opts),
  getFileTree: (projectDir: string) =>
  ipcRenderer.invoke('fs:tree', projectDir),
  listProjects: () => ipcRenderer.invoke('projects:list'),
  getRootProjectsDir: () => ipcRenderer.invoke('projects:getRoot'),
});

