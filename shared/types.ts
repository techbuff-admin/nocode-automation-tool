import { Page } from "playwright";

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
  pages: Page[];
  suites: TestSuite[];
}

