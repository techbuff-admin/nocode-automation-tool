import { Page } from "playwright";

/** One entry in your “Page Objects” step */
export interface PageObject {
  /** Human-friendly name shown in the UI */
  name: string;

  /** 
   * If you’re writing these out to disk, you can include a `file` property 
   * (e.g. "login_page.po.ts"). Otherwise your generator can derive it.
   */
  file?: string;

  /** 
   * A map of logical names → CSS/XPath selectors 
   * e.g. { usernameInput: '#user', submitBtn: 'button[type=submit]' } 
   */
  selectors: Record<string, string>;
}
// shared/types.ts
export type Action =
  | { type: 'goto'; url: string }
  | { type: 'fill'; selector: string; value: string }
  | { type: 'click'; selector: string }
  | { type: 'wait'; timeout: number };

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
  integrations?: {            // ← newly added
    jiraBaseUrl?: string;
    jiraEmail?: string;
    jiraToken?: string;
    azureOrgUrl?: string;
    azurePAT?: string;
  };
}

