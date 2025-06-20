// renderer/src/global.d.ts

export {};

declare global {
  interface Window {
    api: {
      [x: string]: any;
      systemCheck(): Promise<{
        name: 'playwright' | 'java' | 'allure';
        display: string;
        installed: boolean;
        version?: string;
      }[]>;
      
      /** Creates a Playwright project; returns the project path */
      createProject(config: { baseDir: string }): Promise<string>;

      /** Runs tests given a list of file paths; resolves when done */
      runTests(scripts: string[]): Promise<void>;
      installDependency(depName: string): Promise<string>;
      openExternal(url: string): Promise<boolean>; 
      selectDirectory(): Promise<string | null>;
      createProject(opts: {
        basePath: string;
        projectName: string;
      }): Promise<string>; // returns the full project path
      listProjects(): Promise<{name:string;path:string}[]>;
      getRootProjectsDir(): Promise<string>;
      createSuite(args: { projectDir: string; suiteName: string }): Promise<string>;
      captureElement: (selector: string,projectDir, pageName, locatorKey) => Promise<string>; // returns data‐URL
    };
  }
}
