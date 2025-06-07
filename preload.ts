import { contextBridge, ipcRenderer, shell } from 'electron';
import { ProjectMeta } from './shared/types';

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
  loadMeta: (projectDir: string) =>
    ipcRenderer.invoke('meta:load', projectDir) as Promise<ProjectMeta>,
  saveMeta: (projectDir: string, meta: any) =>
    ipcRenderer.invoke('meta:save', projectDir, meta),
  // ← new:
  pathExists:   (p: string) => ipcRenderer.invoke('path-exists', p),
  deletePath:   (p: string) => ipcRenderer.invoke('delete-path', p),
  runTestCase: (
        projectDir: string,
        suiteName: string,
        caseName: string,
        headless: boolean,        // ← new
        browsers: string[]        // ← new
      ) => ipcRenderer.invoke(
        'run:testcase',
        projectDir,
        suiteName,
        caseName,
        headless,                 // ← new
        browsers                  // ← new
      ),
    runSuite: (
        projectDir: string,
        suiteName: string,
        headless: boolean,        // ← new
        browsers: string[]        // ← new
      ) => ipcRenderer.invoke(
        'run:suite',
        projectDir,
        suiteName,
        headless,                 // ← new
        browsers                  // ← new
      ),
      
      generateReport: (dir: string) => ipcRenderer.invoke('generateReport', dir),
      clearReports:   (dir: string) => ipcRenderer.invoke('clearReports', dir),
});

