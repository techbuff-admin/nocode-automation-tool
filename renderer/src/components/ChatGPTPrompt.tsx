import React, { useContext } from 'react';
import { generateTestCases } from '../services/api';
import { ChatContext } from '../context/ChatContext';

export default function ChatGPTPrompt() {
  const { prompt, setPrompt, setGenerated, setLoading, loading } =
    useContext(ChatContext)!;

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const text = await generateTestCases(prompt);
      setGenerated(text);
    } catch (err) {
      alert('Error generating test cases: ' + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your test scenario…"
        rows={5}
        className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg focus:outline-none focus:border-blue-500 transition"
      />
      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Generating…' : 'Generate'}
      </button>
    </div>
  );
}
