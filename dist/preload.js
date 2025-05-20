"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose safe APIs to renderer
electron_1.contextBridge.exposeInMainWorld('api', {
    systemCheck: () => electron_1.ipcRenderer.invoke('system:check'),
    //createProject: (config: any) => ipcRenderer.invoke('project:create', config),
    runTests: (scripts) => electron_1.ipcRenderer.invoke('tests:execute', scripts),
    installDependency: (depName) => electron_1.ipcRenderer.invoke('dependency:install', depName),
    openExternal: (url) => electron_1.ipcRenderer.invoke('open-external', url),
    selectDirectory: () => electron_1.ipcRenderer.invoke('select-directory'),
    createProject: (opts) => electron_1.ipcRenderer.invoke('project:create', opts),
    createSuite: (opts) => electron_1.ipcRenderer.invoke('suite:create', opts),
    createTestCase: (opts) => electron_1.ipcRenderer.invoke('case:add', opts),
    getFileTree: (projectDir) => electron_1.ipcRenderer.invoke('fs:tree', projectDir),
});
