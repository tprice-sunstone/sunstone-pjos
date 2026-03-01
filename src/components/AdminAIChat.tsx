// ============================================================================
// AdminAIChat.tsx — src/components/AdminAIChat.tsx
// ============================================================================
// v3: Controlled component — accepts isOpen/onClose props from AdminShell.
// Atlas pill moved to admin header, so no more floating button here.
// ============================================================================

'use client';

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_PROMPTS = [
  'How is the platform doing this month?',
  "What are artists asking Sunny that she can't answer?",
  'Which tenants are most active?',
  'Give me a revenue report for this week',
  'What products are selling best?',
  'Any issues I should know about?',
  'Summarize event performance across tenants',
  'What knowledge gaps should I prioritize?',
];

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-[#0F0F12] text-[#9B9590] rounded-md p-3 my-2 text-xs overflow-x-auto"><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code class="bg-[#1A1A24] px-1 py-0.5 rounded text-xs text-[#E8E4DF]">$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[#E8E4DF]">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#FF7A00] underline underline-offset-2 hover:text-[#E86E00]">$1</a>'
  );

  const lines = html.split('\n');
  const processed: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;

  for (const line of lines) {
    const h3Match = line.match(/^###\s+(.+)/);
    const h2Match = line.match(/^##\s+(.+)/);
    const h1Match = line.match(/^#\s+(.+)/);

    if (h1Match) {
      if (inList) { processed.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; listType = null; }
      processed.push(`<h3 class="text-base font-bold text-[#E8E4DF] mt-4 mb-2">${h1Match[1]}</h3>`);
      continue;
    }
    if (h2Match) {
      if (inList) { processed.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; listType = null; }
      processed.push(`<h4 class="text-sm font-bold text-[#E8E4DF] mt-3 mb-1.5">${h2Match[1]}</h4>`);
      continue;
    }
    if (h3Match) {
      if (inList) { processed.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; listType = null; }
      processed.push(`<h5 class="text-sm font-semibold text-[#9B9590] mt-2 mb-1">${h3Match[1]}</h5>`);
      continue;
    }

    if (line.match(/^---+$/)) {
      if (inList) { processed.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; listType = null; }
      processed.push('<hr class="border-[#2A2A35] my-3" />');
      continue;
    }

    const bulletMatch = line.match(/^(\s*)[-•]\s+(.+)/);
    const numberMatch = line.match(/^(\s*)\d+\.\s+(.+)/);

    if (bulletMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) processed.push(listType === 'ol' ? '</ol>' : '</ul>');
        processed.push('<ul class="list-disc list-inside space-y-0.5 my-1.5 text-[#9B9590]">');
        inList = true; listType = 'ul';
      }
      processed.push(`<li class="text-sm">${bulletMatch[2]}</li>`);
    } else if (numberMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processed.push(listType === 'ol' ? '</ol>' : '</ul>');
        processed.push('<ol class="list-decimal list-inside space-y-0.5 my-1.5 text-[#9B9590]">');
        inList = true; listType = 'ol';
      }
      processed.push(`<li class="text-sm">${numberMatch[2]}</li>`);
    } else {
      if (inList) {
        processed.push(listType === 'ol' ? '</ol>' : '</ul>');
        inList = false; listType = null;
      }
      if (line.trim()) {
        processed.push(`<p class="my-1 text-sm text-[#9B9590]">${line}</p>`);
      } else {
        processed.push('<br/>');
      }
    }
  }
  if (inList) processed.push(listType === 'ol' ? '</ol>' : '</ul>');

  return processed.join('');
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 px-4">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#1A1A24' }}>
        <AtlasIconSmall className="w-3.5 h-3.5" style={{ color: '#FF7A00' }} />
      </div>
      <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ backgroundColor: '#1A1A24' }}>
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#6B6560', animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#6B6560', animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#6B6560', animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component — now controlled via props
// ============================================================================

export default function AdminAIChat({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: content.trim() };
      const assistantMsg: ChatMessage = { id: `assistant-${Date.now()}`, role: 'assistant', content: '' };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput('');
      setIsStreaming(true);

      try {
        const conversationHistory = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
        const response = await fetch('/api/admin/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: conversationHistory }),
        });

        if (!response.ok) throw new Error('Failed to get response');
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No stream');

        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                  fullText += data.text;
                  setMessages((prev) =>
                    prev.map((m) => m.id === assistantMsg.id ? { ...m, content: fullText } : m)
                  );
                }
              } catch {}
            }
          }
        }
      } catch (err) {
        console.error('Admin AI chat error:', err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: 'Something went wrong connecting to Atlas. Please try again.' }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Backdrop (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Chat Panel */}
      <div
        className={cn(
          'fixed z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out',
          'lg:right-0 lg:top-0 lg:bottom-0 lg:w-[440px] lg:border-l',
          'max-lg:left-0 max-lg:right-0 max-lg:bottom-0 max-lg:rounded-t-2xl max-lg:max-h-[calc(100vh-60px)]',
          isOpen
            ? 'translate-y-0 lg:translate-x-0'
            : 'translate-y-full lg:translate-y-0 lg:translate-x-full'
        )}
        style={{
          backgroundColor: '#1F1F28',
          borderColor: '#2A2A35',
          minHeight: isOpen ? '50vh' : 0,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ backgroundColor: '#18181F', borderBottom: '1px solid #2A2A35' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF7A00' }}>
              <AtlasIconSmall className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: '#E8E4DF' }}>Atlas</h2>
              <p className="text-xs" style={{ color: '#6B6560' }}>Platform Intelligence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ color: '#6B6560' }}
            aria-label="Close Atlas"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg" style={{ backgroundColor: '#1A1A24' }}>
                <AtlasIcon className="w-8 h-8" style={{ color: '#FF7A00' }} />
              </div>
              <h3 className="text-lg font-bold mb-1" style={{ color: '#E8E4DF' }}>Platform Intelligence</h3>
              <p className="text-sm mb-6 max-w-xs" style={{ color: '#9B9590' }}>
                I have real-time access to all platform data — revenue, tenants, sales, Sunny&#39;s activity, inventory, events, and more. Ask me anything.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="px-3 py-2 text-xs font-medium rounded-full transition-colors text-left"
                    style={{
                      color: '#9B9590',
                      backgroundColor: '#1A1A24',
                      border: '1px solid #2A2A35',
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end px-1">
                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm text-sm text-white" style={{ backgroundColor: '#FF7A00' }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 px-1">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: '#1A1A24' }}>
                      <AtlasIconSmall className="w-3.5 h-3.5" style={{ color: '#FF7A00' }} />
                    </div>
                    <div className="max-w-[88%]">
                      <div
                        className="rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed"
                        style={{ backgroundColor: '#1A1A24', border: '1px solid #222230' }}
                        dangerouslySetInnerHTML={{
                          __html: msg.content
                            ? renderMarkdown(msg.content)
                            : '<span style="color: #6B6560">...</span>',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {isStreaming && messages[messages.length - 1]?.content === '' && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-3 py-3" style={{ backgroundColor: '#1F1F28', borderTop: '1px solid #2A2A35' }}>
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about revenue, tenants, Sunny's gaps, events..."
              rows={1}
              disabled={isStreaming}
              className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:opacity-50 max-h-24"
              style={{
                backgroundColor: '#1A1A24',
                border: '1px solid #2A2A35',
                color: '#E8E4DF',
                minHeight: 42,
                // @ts-ignore
                '--tw-ring-color': '#FF7A00',
              }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 96) + 'px';
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0"
              style={{
                backgroundColor: input.trim() && !isStreaming ? '#FF7A00' : '#1A1A24',
                color: input.trim() && !isStreaming ? '#FFFFFF' : '#6B6560',
                minHeight: 42,
                minWidth: 42,
                cursor: input.trim() && !isStreaming ? 'pointer' : 'not-allowed',
              }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function AtlasIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
    </svg>
  );
}

function AtlasIconSmall({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 2v7.5c0 .828.672 1.5 1.5 1.5h1.5M2.5 2H1.5m1 0h11m0 0h1m-1 0v7.5c0 .828-.672 1.5-1.5 1.5h-1.5m-5 0h5m-5 0l-.667 2m5.667-2l.667 2M6 7.5v1M8 6v2.5m2-4v4" />
    </svg>
  );
}
