// renderer/src/services/api.ts
import { apiClient } from './http';

export async function generateTestCases(prompt: string): Promise<string> {
  // Your backend returns a plain string (the test-case content)
  const res = await apiClient.post<string>('/api/chatgpt/generate', { prompt });
  return res.data;
}
