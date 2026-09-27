'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Sparkles, StopCircle, RefreshCw, Trash2,
  Download, FileText, ChevronLeft, Menu, Check, Copy, Paperclip, Loader2
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  created_at: string;
}

export default function ChatUI() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [input, setInput] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('openai/deepseek-v4-flash');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Performance Metrics
  const [ttft, setTtft] = useState<number | null>(null);
  const [tokenCount, setTokenCount] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load Sessions and Active Models on Mount
  useEffect(() => {
    const saved = localStorage.getItem('freetoken_sessions');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSessions(parsed);
      if (parsed.length > 0) setActiveSessionId(parsed[0].id);
    } else {
      createNewSession();
    }

    fetchModels();
  }, []);

  // Save Sessions whenever modified
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('freetoken_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Scroll to bottom during streaming
  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, isStreaming]);

  const fetchModels = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/models');
      const data = await res.json();
      const modelNames = data.data.map((m: any) => m.id);
      setModels(modelNames);
    } catch {
      setModels(['openai/deepseek-v4-flash', 'openai/qwen3.6-35b-a3b']);
    }
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Math.random().toString(36).substring(7),
      title: `Session ${sessions.length + 1}`,
      messages: [{ role: 'system', content: 'Welcome to your Local MoE Agent Hub. Powered by FreeToken GPU Acceleration.' }],
      model: selectedModel,
      created_at: new Date().toLocaleTimeString(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const getActiveSession = (): ChatSession | undefined => {
    return sessions.find(s => s.id === activeSessionId);
  };

  const updateActiveSessionMessages = (msgs: Message[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        // Set dynamic title based on the first prompt
        const firstUserMsg = msgs.find(m => m.role === 'user');
        const title = firstUserMsg ? firstUserMsg.content.substring(0, 24) + '...' : s.title;
        return { ...s, messages: msgs, title };
      }
      return s;
    }));
  };

  // ----------------- Real-Time Streaming Handler -----------------

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const systemMsg: Message = { 
          role: 'system', 
          content: `📄 **Document Indexed:** ${data.file} (${data.chunks_indexed} chunks added to vector store). You can now ask questions about this document using openthinker:7b or openchat:7b.` 
        };
        const session = getActiveSession();
        if (session) {
          updateActiveSessionMessages([...session.messages, systemMsg]);
        }
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload document.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const session = getActiveSession();
    if (!session) return;

    const userMsg: Message = { role: 'user', content: input };
    const updatedMsgs = [...session.messages, userMsg];
    updateActiveSessionMessages(updatedMsgs);
    setInput('');
    setIsStreaming(true);
    setTtft(null);
    setTokenCount(0);

    // Initialise AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const startTime = performance.now();
    let isFirstToken = true;

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          messages: updatedMsgs,
          stream: true
        }),
        signal: abortController.signal
      });

      if (!response.ok || !response.body) throw new Error('API Request Failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = '';

      // Initialize assistant bubble
      const activeMsgs = [...updatedMsgs, { role: 'assistant' as const, content: '' }];
      updateActiveSessionMessages(activeMsgs);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawJson = line.substring(6).trim();
            if (rawJson === '[DONE]') continue;

            try {
              const parsed = JSON.parse(rawJson);

              if (parsed.error) {
                assistantResponse += `\n\n⚠️ **Error**: ${parsed.error}`;
                break;
              }

              // Parse standard streaming choices structure
              const token = parsed.choices?.[0]?.delta?.content || parsed.text || '';
              if (token) {
                if (isFirstToken) {
                  setTtft(Math.round(performance.now() - startTime));
                  isFirstToken = false;
                }
                assistantResponse += token;
                setTokenCount(prev => prev + 1);

                // Update UI state with growing text
                activeMsgs[activeMsgs.length - 1] = {
                  role: 'assistant',
                  content: assistantResponse
                };
                updateActiveSessionMessages([...activeMsgs]);
              }
            } catch {
              // Handle raw text fallback safely
              if (rawJson) {
                assistantResponse += rawJson;
                activeMsgs[activeMsgs.length - 1] = { role: 'assistant', content: assistantResponse };
                updateActiveSessionMessages([...activeMsgs]);
              }
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.info("Stream stopped by client action.");
      } else {
        console.error(err);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  // ----------------- Export Utilities -----------------

  const exportChat = (format: 'json' | 'md') => {
    const session = getActiveSession();
    if (!session) return;

    let dataStr = '';
    let filename = `${session.title.toLowerCase().replace(/\s+/g, '-')}`;

    if (format === 'json') {
      dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session, null, 2));
      filename += '.json';
    } else {
      const markdown = session.messages.map(m => `### **${m.role.toUpperCase()}**\n\n${m.content}\n`).join('\n---\n\n');
      dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(markdown);
      filename += '.md';
    }

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const clearAllSessions = () => {
    localStorage.removeItem('freetoken_sessions');
    setSessions([]);
    setActiveSessionId('');
    createNewSession();
  };

  const copyToClipboard = (text: string, blockId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(blockId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const session = getActiveSession();

  return (
    <div className="flex h-screen bg-[#09090B] text-gray-100 overflow-hidden font-sans">
      {/* 1. SIDEBAR */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'w-80' : 'w-0'} bg-[#18181B] border-r border-zinc-800 flex flex-col z-20`}>
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span className="font-semibold text-white tracking-wide">FreeToken Engine</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="text-zinc-400 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={createNewSession}
          className="m-4 p-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg border border-zinc-700 transition flex items-center justify-center gap-2"
        >
          <span>New Session</span>
        </button>

        {/* Saved Chats Feed */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          {sessions.map(s => (
            <div
              key={s.id}
              onClick={() => setActiveSessionId(s.id)}
              className={`p-3 rounded-lg cursor-pointer transition flex items-center justify-between group ${activeSessionId === s.id ? 'bg-[#27272A] border border-zinc-700 text-white' : 'hover:bg-zinc-900 text-zinc-400'}`}
            >
              <div className="truncate text-sm font-medium pr-2">{s.title}</div>
              <span className="text-xs text-zinc-500 shrink-0">{s.created_at}</span>
            </div>
          ))}
        </div>

        {/* Bottom Options */}
        <div className="p-4 border-t border-zinc-800 space-y-2 bg-[#121214]">
          <button
            onClick={clearAllSessions}
            className="w-full p-2 hover:bg-red-950/40 text-red-400 hover:text-red-300 rounded-md transition flex items-center gap-2 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear Workspace</span>
          </button>
        </div>
      </div>

      {/* 2. CHAT CANVAS */}
      <div className="flex-1 flex flex-col h-full bg-[#09090B] relative">
        {/* Header */}
        <div className="h-16 border-b border-zinc-800 px-6 flex items-center justify-between bg-[#121214]/60 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="text-zinc-400 hover:text-white mr-2">
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="text-sm text-zinc-400 font-medium">Active Pipeline</div>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-white font-semibold text-lg border-none focus:outline-none cursor-pointer pr-4"
              >
                {models.map(m => (
                  <option key={m} value={m} className="bg-zinc-900 text-white text-sm">{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Metrics & Exports */}
          <div className="flex items-center gap-4">
            {ttft !== null && (
              <div className="text-xs px-2.5 py-1 bg-zinc-800 rounded-full text-indigo-300 flex items-center gap-1.5 border border-zinc-700">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                <span>TTFT: {ttft}ms</span>
                {tokenCount > 0 && <span className="text-zinc-500">| {tokenCount} tokens</span>}
              </div>
            )}

            <div className="flex items-center gap-1 border border-zinc-800 rounded-md p-1 bg-zinc-900">
              <button
                onClick={() => exportChat('json')}
                title="Export as JSON"
                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => exportChat('md')}
                title="Export as Markdown"
                className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Chat Feed Scrollway */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {session?.messages.filter(m => m.role !== 'system').map((m, idx) => (
            <div
              key={idx}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-3xl rounded-2xl p-4 shadow-xl ${m.role === 'user' ? 'bg-indigo-600/90 text-white rounded-br-none' : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-bl-none'}`}>
                {m.role === 'assistant' && (
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-zinc-800">
                    <span className="text-xs text-indigo-400 font-semibold tracking-wide">ASSISTANT MoE</span>
                    <button
                      onClick={() => copyToClipboard(m.content, `idx-${idx}`)}
                      className="text-zinc-500 hover:text-white"
                    >
                      {copiedId === `idx-${idx}` ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}

                {/* Advanced Markdown, Math, LaTeX Renderer */}
                <div className="prose prose-invert prose-zinc max-w-none text-sm leading-relaxed space-y-2">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          <div ref={streamEndRef} />
        </div>

        {/* Lower Control Pad */}
        <div className="p-4 border-t border-zinc-800/80 bg-[#121214]/80">
          <div className="max-w-4xl mx-auto flex items-center gap-3 relative">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition flex items-center justify-center shrink-0"
              title="Upload Document (PDF, DOCX, TXT)"
            >
              {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
            </button>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept=".pdf,.txt,.docx"
              onChange={handleFileUpload} 
            />

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Query local MoE engine..."
              rows={1}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white placeholder-zinc-500 resize-none pr-12"
            />

            <div className="absolute right-3 flex items-center gap-2">
              {isStreaming ? (
                <button
                  onClick={handleStop}
                  className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
                >
                  <StopCircle className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div className="text-center text-[10px] text-zinc-600 mt-2">
            Local serving is powered by bandwidth-adaptive MoE scheduling [112]. Data never leaves your PC.
          </div>
        </div>
      </div>
    </div>
  );
}
