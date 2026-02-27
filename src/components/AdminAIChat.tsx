// ============================================================================
// AdminAIChat.tsx — src/components/AdminAIChat.tsx
// ============================================================================
// Floating "Ask Atlas" button + slide-in chat panel for platform admin.
// Atlas queries real-time platform data to provide insights, analytics,
// and custom reports. Styled with admin slate/amber palette.
// ============================================================================
// V2 FIX: Close button now properly hides panel and shows floating trigger.
// Root cause: inset-x-0 applied at ALL breakpoints, bleeding left:0 into
// desktop. Fixed by using max-lg: prefix (same pattern as MentorChat).
// Also: trigger button now uses opacity/pointer-events toggle instead of
// conditional rendering, preventing layout flash on open/close.
// ============================================================================

'use client';

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ============================================================================
// Suggested Prompts
// ============================================================================

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

// ============================================================================
// Markdown Renderer (same lightweight approach as MentorChat)
// ============================================================================

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-[var(--surface-base)] text-[var(--text-tertiary)] rounded-md p-3 my-2 text-xs overflow-x-auto "><code>$2</code></pre>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-[var(--surface-subtle)] px-1 py-0.5 rounded text-xs  text-[var(--text-primary)]">$1</code>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[var(--text-primary)]">$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent-600 underline underline-offset-2 hover:text-accent-700">$1</a>'
  );

  // Process lines for lists and headers
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
      processed.push(`<h3 class="text-base font-bold text-[var(--text-primary)] mt-4 mb-2">${h1Match[1]}</h3>`);
      continue;
    }
    if (h2Match) {
      if (inList) { processed.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; listType = null; }
      processed.push(`<h4 class="text-sm font-bold text-[var(--text-primary)] mt-3 mb-1.5">${h2Match[1]}</h4>`);
      continue;
    }
    if (h3Match) {
      if (inList) { processed.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; listType = null; }
      processed.push(`<h5 class="text-sm font-semibold text-[var(--text-secondary)] mt-2 mb-1">${h3Match[1]}</h5>`);
      continue;
    }

    if (line.match(/^---+$/)) {
      if (inList) { processed.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; listType = null; }
      processed.push('<hr class="border-[var(--border-default)] my-3" />');
      continue;
    }

    const bulletMatch = line.match(/^(\s*)[-•]\s+(.+)/);
    const numberMatch = line.match(/^(\s*)\d+\.\s+(.+)/);

    if (bulletMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) processed.push(listType === 'ol' ? '</ol>' : '</ul>');
        processed.push('<ul class="list-disc list-inside space-y-0.5 my-1.5 text-[var(--text-secondary)]">');
        inList = true; listType = 'ul';
      }
      processed.push(`<li class="text-sm">${bulletMatch[2]}</li>`);
    } else if (numberMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processed.push(listType === 'ol' ? '</ol>' : '</ul>');
        processed.push('<ol class="list-decimal list-inside space-y-0.5 my-1.5 text-[var(--text-secondary)]">');
        inList = true; listType = 'ol';
      }
      processed.push(`<li class="text-sm">${numberMatch[2]}</li>`);
    } else {
      if (inList) {
        processed.push(listType === 'ol' ? '</ol>' : '</ul>');
        inList = false; listType = null;
      }
      if (line.trim()) {
        processed.push(`<p class="my-1 text-sm text-[var(--text-secondary)]">${line}</p>`);
      } else {
        processed.push('<br/>');
      }
    }
  }
  if (inList) processed.push(listType === 'ol' ? '</ol>' : '</ul>');

  return processed.join('');
}

// ============================================================================
// Typing Indicator
// ============================================================================

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2 px-4">
      <div className="w-7 h-7 rounded-lg bg-[var(--surface-subtle)] flex items-center justify-center flex-shrink-0 mt-0.5">
        <AtlasIconSmall className="w-3.5 h-3.5 text-accent-500" />
      </div>
      <div className="bg-[var(--surface-subtle)] rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-[var(--text-tertiary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AdminAIChat() {
  const [isOpen, setIsOpen] = useState(false);
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

  // ========================================================================
  // Send message with streaming
  // ========================================================================

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: content.trim(),
      };

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput('');
      setIsStreaming(true);

      try {
        const conversationHistory = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

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
                    prev.map((m) =>
                      m.id === assistantMsg.id ? { ...m, content: fullText } : m
                    )
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

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <>
      {/* ================================================================ */}
      {/* Floating Button                                                  */}
      {/* FIX: Always render, use opacity/pointer-events like MentorChat   */}
      {/* ================================================================ */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed z-40 flex items-center gap-2 px-4 py-3 rounded-full',
          'bg-accent-500 text-[var(--text-on-accent)] shadow-lg',
          'hover:shadow-xl hover:scale-105 active:scale-95',
          'transition-all duration-200 ease-out',
          'bottom-6 right-6',
          isOpen && 'opacity-0 pointer-events-none scale-90'
        )}
        style={{ minHeight: 48, minWidth: 48 }}
        aria-label="Ask Atlas - Platform Intelligence"
      >
        <AtlasIcon className="w-5 h-5 text-[var(--text-on-accent)]" />
        <span className="text-sm font-semibold whitespace-nowrap">Ask Atlas</span>
      </button>

      {/* ================================================================ */}
      {/* Backdrop (mobile)                                                */}
      {/* ================================================================ */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ================================================================ */}
      {/* Chat Panel                                                       */}
      {/* FIX: Use max-lg: prefix for mobile styles (same as MentorChat)   */}
      {/* Old code used inset-x-0 which bleeds left:0 into desktop.        */}
      {/* ================================================================ */}
      <div
        className={cn(
          'fixed z-50 flex flex-col bg-[var(--surface-raised)] shadow-2xl transition-transform duration-300 ease-out',
          // Desktop: right side panel
          'lg:right-0 lg:top-0 lg:bottom-0 lg:w-[440px] lg:border-l lg:border-[var(--border-default)]',
          // Mobile: slide up sheet (max-lg prevents bleeding into desktop)
          'max-lg:left-0 max-lg:right-0 max-lg:bottom-0 max-lg:rounded-t-2xl max-lg:max-h-[calc(100vh-60px)]',
          // Open/close
          isOpen
            ? 'translate-y-0 lg:translate-x-0'
            : 'translate-y-full lg:translate-y-0 lg:translate-x-full'
        )}
        style={{ minHeight: isOpen ? '50vh' : 0 }}
      >
        {/* ============================================================ */}
        {/* Header                                                       */}
        {/* ============================================================ */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] bg-[var(--surface-subtle)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
              <AtlasIconSmall className="w-4 h-4 text-[var(--text-on-accent)]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Atlas</h2>
              <p className="text-xs text-[var(--text-tertiary)]">Platform Intelligence</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-raised)] transition-colors text-[var(--text-tertiary)]"
            aria-label="Close Atlas"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ============================================================ */}
        {/* Messages                                                     */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[var(--surface-subtle)] flex items-center justify-center mb-4 shadow-lg">
                <AtlasIcon className="w-8 h-8 text-accent-500" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">
                Platform Intelligence
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-xs">
                I have real-time access to all platform data — revenue, tenants, sales, Sunny&#39;s activity, inventory, events, and more. Ask me anything.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="px-3 py-2 text-xs font-medium text-[var(--text-secondary)] bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-full hover:bg-warning-50 hover:border-warning-200 hover:text-warning-600 transition-colors text-left"
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
                    <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-sm text-sm text-[var(--text-on-accent)] bg-accent-500">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 px-1">
                    <div className="w-7 h-7 rounded-lg bg-[var(--surface-subtle)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <AtlasIconSmall className="w-3.5 h-3.5 text-accent-500" />
                    </div>
                    <div className="max-w-[88%]">
                      <div
                        className="bg-[var(--surface-subtle)] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed border border-[var(--border-subtle)]"
                        dangerouslySetInnerHTML={{
                          __html: msg.content
                            ? renderMarkdown(msg.content)
                            : '<span class="text-[var(--text-tertiary)]">...</span>',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {isStreaming && messages[messages.length - 1]?.content === '' && (
            <TypingIndicator />
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ============================================================ */}
        {/* Input                                                        */}
        {/* ============================================================ */}
        <div className="shrink-0 border-t border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about revenue, tenants, Sunny&#39;s gaps, events..."
              rows={1}
              disabled={isStreaming}
              className={cn(
                'flex-1 resize-none rounded-xl border border-[var(--border-default)] bg-[var(--surface-subtle)] px-4 py-2.5',
                'text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]',
                'focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]',
                'disabled:opacity-50',
                'max-h-24'
              )}
              style={{ minHeight: 42 }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 96) + 'px';
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0',
                input.trim() && !isStreaming
                  ? 'bg-accent-500 text-[var(--text-on-accent)] hover:bg-accent-600 active:scale-95'
                  : 'bg-[var(--surface-subtle)] text-[var(--text-tertiary)] cursor-not-allowed'
              )}
              style={{ minHeight: 42, minWidth: 42 }}
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

// ============================================================================
// Icons
// ============================================================================

function AtlasIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
    </svg>
  );
}

function AtlasIconSmall({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.5 2v7.5c0 .828.672 1.5 1.5 1.5h1.5M2.5 2H1.5m1 0h11m0 0h1m-1 0v7.5c0 .828-.672 1.5-1.5 1.5h-1.5m-5 0h5m-5 0l-.667 2m5.667-2l.667 2M6 7.5v1M8 6v2.5m2-4v4" />
    </svg>
  );
}