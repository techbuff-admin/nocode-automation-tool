// import { Page } from "playwright";

// /** One entry in your “Page Objects” step */
// export interface PageObject {
//   /** Human-friendly name shown in the UI */
//   name: string;

//   /** 
//    * If you’re writing these out to disk, you can include a `file` property 
//    * (e.g. "login_page.po.ts"). Otherwise your generator can derive it.
//    */
//   file?: string;

//   /** 
//    * A map of logical names → CSS/XPath selectors 
//    * e.g. { usernameInput: '#user', submitBtn: 'button[type=submit]' } 
//    */
//   selectors: Record<string, string>;
// }
// // shared/types.ts
// export type Action =
//   | { type: 'goto'; url: string }
//   | { type: 'fill'; selector: string; value: string }
//   | { type: 'click'; selector: string }
//   | { type: 'wait'; timeout: number };

// export interface TestCase {
//   name: string;
//   tags: string[];
//   timeout: number;
//   retries: number;
//   headless: boolean;
//   elementWait: number;
//   actions: Action[];
// }

// export interface TestSuite {
//   name: string;
//   file: string;
//   cases: TestCase[];
//   parallel: boolean;
//   hooks?: {
//     beforeAll?: Action[];
//     beforeEach?: Action[];
//     afterEach?: Action[];
//     afterAll?: Action[];
//   };
//   beforeAll: Action[];
//   afterAll: Action[];
//   beforeEach: Action[];
//   afterEach: Action[];
// }

// export interface ProjectMeta {
//   name: string;
//   env: {
//     baseUrl: string;
//     timeout: number;
//     [key: string]: any;
//   };
//   pages: PageObject[];
//   suites: TestSuite[];
//   integrations?: {            // ← newly added
//     jiraBaseUrl?: string;
//     jiraEmail?: string;
//     jiraToken?: string;
//     azureOrgUrl?: string;
//     azurePAT?: string;
//   };
// }
// shared/types.ts
import { Page } from 'playwright';

/** One entry in your “Page Objects” step */
export interface PageObject {
  name: string;
  file?: string;
  selectors: Record<string, string>;
  //selectors: Record<string, LocatorInfo>;
}
export interface LocatorInfo {
  selector: string;
  type?: string;
 // screenshot?: string;
}
export type Action =
  | { type: 'goto'; url: string }
  | { type: 'fill'; selector: string; value: string }
  | { type: 'click'; selector: string }
  | { type: 'wait'; timeout: number }
  | { type: 'dblclick'; selector: string }
  | { type: 'hover'; selector: string }
  | { type: 'press'; selector: string; key: string }
  | { type: 'check'; selector: string }
  | { type: 'uncheck'; selector: string }
  | { type: 'selectOption'; selector: string; value: string }
  | { type: 'setInputFiles'; selector: string; files: string[] }
  | { type: 'screenshot'; selector: string }
  // ← new: assertion
  | { type: 'assertion'; assertion: string; selector?: string;  expected?: string | number; }
  | { type: 'assert'; assertion: string; selector?: string;  expected?: string | number; };

export interface TestCase {
  name: string;
  tags: string[];
  timeout: number;
  retries: number;
  headless: boolean;
  elementWait: number;
  actions: Action[];
}

export interface TestSuite {
  name: string;
  file: string;
  cases: TestCase[];
  parallel: boolean;
  hooks?: {
    beforeAll?: Action[];
    beforeEach?: Action[];
    afterEach?: Action[];
    afterAll?: Action[];
  };
    beforeAll: Action[];
  afterAll: Action[];
  beforeEach: Action[];
  afterEach: Action[];
}

export interface ProjectMeta {
  name: string;
  env: {
    baseUrl: string;
    timeout: number;
    [key: string]: any;
  };
  pages: PageObject[];
  suites: TestSuite[];
  integrations?: {
    jiraBaseUrl?: string;
    jiraEmail?: string;
    jiraToken?: string;
    azureOrgUrl?: string;
    azurePAT?: string;
  };
}

