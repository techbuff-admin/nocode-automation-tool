// renderer/src/services/api.ts
import { apiClient } from './http';

export async function generateTestCases(prompt: string): Promise<string> {
  // Your backend returns a plain string (the test-case content)
  const res = await apiClient.post<string>('/api/chatgpt/generate', { prompt });
  return res.data;
}
// ← updated: include projectDir as first argument
export async function fetchJiraDescription(
  projectDir: string,
  ticketId: string
): Promise<string> {
  return window.api.fetchJiraDescription(projectDir, ticketId);
}

// ← updated: include projectDir as first argument
export async function fetchAzureDescription(
  projectDir: string,
  workItemId: string
): Promise<string> {
  return window.api.fetchAzureDescription(projectDir, workItemId);
}

// renderer/src/services/api.ts
export async function jiraListIssues(
  projectDir: string
): Promise<{ key: string; summary: string }[]> {
  return window.api.jiraListIssues(projectDir);
}

export async function azureListWorkItems(
  projectDir: string
): Promise<{ id: string; title: string }[]> {
  return window.api.azureListWorkItems(projectDir);
}
