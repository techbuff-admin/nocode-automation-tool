// renderer/src/context/ChatContext.tsx
import React, { createContext, ReactNode, useState } from 'react';

interface ChatContextType {
  prompt: string;
  setPrompt: (p: string) => void;
  generated: string;
  setGenerated: (g: string) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
}

export const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [prompt, setPrompt] = useState('');
  const [generated, setGenerated] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <ChatContext.Provider
      value={{ prompt, setPrompt, generated, setGenerated, loading, setLoading }}
    >
      {children}
    </ChatContext.Provider>
  );
}
