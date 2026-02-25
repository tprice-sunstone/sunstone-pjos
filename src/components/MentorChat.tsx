// src/components/MentorChat.tsx
// Floating "Ask Sunny" button + slide-in chat panel
// Streams responses from the mentor API, renders markdown, displays product cards

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
  products?: Product[];
  isStreaming?: boolean;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  description: string;
  price: string;
  imageUrl: string | null;
  imageAlt: string;
  url: string;
  available: boolean;
}

// ============================================================================
// Suggested prompts
// ============================================================================

const SUGGESTED_PROMPTS = [
  'How do I set up my welder?',
  'What settings for gold fill on Zapp Plus?',
  'My welds keep breaking — help!',
  'How should I price my services?',
  'Help me plan for my first event',
  'What chains should I carry?',
];

// ============================================================================
// Simple markdown renderer (no external dependency)
// ============================================================================

function renderMarkdown(text: string): string {
  // Strip HTML comment markers (knowledge gaps, product search)
  let html = text.replace(/<!--[\s\S]*?-->/g, '');

  // Escape HTML entities
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4 class="font-semibold text-sm mt-3 mb-1">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="font-semibold text-sm mt-3 mb-1">$1</h3>');

  // Numbered lists
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li class="ml-4 list-decimal text-sm leading-relaxed">$2</li>');

  // Bullet lists
  html = html.replace(/^[-•]\s+(.+)$/gm, '<li class="ml-4 list-disc text-sm leading-relaxed">$1</li>');

  // Links: [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-accent-600 underline hover:text-accent-700">$1</a>');

  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p class="text-sm leading-relaxed mb-2">');
  // Single newlines
  html = html.replace(/\n/g, '<br>');

  if (!html.startsWith('<')) {
    html = `<p class="text-sm leading-relaxed mb-2">${html}</p>`;
  }

  return html;
}

// ============================================================================
// Main component
// ============================================================================

export default function MentorChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setHasBeenOpened(true);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Re-focus input after Sunny finishes responding
  useEffect(() => {
    if (!isLoading && isOpen) {
      inputRef.current?.focus();
    }
  }, [isLoading, isOpen]);

  // ============================================================================
  // Send message
  // ============================================================================

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
    };

    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };

    const apiMessages = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    setMessages(prev => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMsg.id
                      ? { ...m, content: fullText, isStreaming: true }
                      : m
                  )
                );
              }
            } catch {
              // Skip
            }
          }
        }
      }

      // Check for product search marker
      const productMatch = fullText.match(/<!--\s*PRODUCT_SEARCH:\s*(.+?)\s*-->/);
      let products: Product[] = [];

      if (productMatch) {
        try {
          const searchQuery = productMatch[1].trim();
          const productRes = await fetch('/api/mentor/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: searchQuery }),
          });
          const productData = await productRes.json();
          products = productData.products || [];
        } catch (err) {
          console.error('[MentorChat] Product search error:', err);
        }
      }

      // Clean markers and finalize
      const cleanText = fullText
        .replace(/<!--\s*PRODUCT_SEARCH:[\s\S]*?-->/g, '')
        .replace(/<!--\s*KNOWLEDGE_GAP:[\s\S]*?-->/g, '')
        .trim();

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: cleanText, isStreaming: false, products: products.length > 0 ? products : undefined }
            : m
        )
      );
    } catch (error) {
      console.error('[MentorChat] Error:', error);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? {
                ...m,
                content: "I'm having trouble connecting right now. Please try again in a moment, or reach out to Sunstone support at 385-999-5240.",
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading]);

  // ============================================================================
  // Keyboard handler
  // ============================================================================

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed z-40 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-200',
          'bg-accent-500 hover:bg-accent-600 text-white',
          'bottom-20 right-4 lg:bottom-6 lg:right-6',
          !hasBeenOpened && 'animate-gentle-pulse',
          isOpen && 'opacity-0 pointer-events-none scale-90'
        )}
        style={{ minHeight: 48, minWidth: 48 }}
        aria-label="Ask Sunny - PJ Mentor"
      >
        <SparkleIcon className="w-5 h-5" />
        <span className="text-sm font-semibold hidden sm:inline">Ask Sunny</span>
      </button>

      {/* ── Backdrop (mobile) ── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── Chat Panel ── */}
      <div
        className={cn(
          'fixed z-50 flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out',
          // Desktop: right side panel
          'lg:right-0 lg:top-0 lg:bottom-0 lg:w-[400px] lg:border-l lg:border-border-default',
          // Mobile: slide up sheet
          'max-lg:left-0 max-lg:right-0 max-lg:bottom-0 max-lg:rounded-t-2xl max-lg:max-h-[calc(100vh-60px)]',
          // Open/close
          isOpen
            ? 'translate-y-0 lg:translate-x-0'
            : 'translate-y-full lg:translate-y-0 lg:translate-x-full'
        )}
        style={{ minHeight: isOpen ? '50vh' : 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
              <SparkleIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2
                className="text-base font-semibold text-text-primary"
                style={{ fontFamily: 'var(--font-display, Fraunces, serif)' }}
              >
                Sunny
              </h2>
              <p className="text-[11px] text-text-secondary leading-none">Your PJ Mentor</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-raised transition-colors text-text-secondary hover:text-text-primary"
            aria-label="Close chat"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.length === 0 ? (
            <EmptyState onSelectPrompt={sendMessage} />
          ) : (
            <>
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isLoading && messages[messages.length - 1]?.content === '' && (
                <TypingIndicator />
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border-default shrink-0 bg-white safe-area-bottom">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about PJ..."
              className="flex-1 resize-none rounded-xl border border-border-default px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-500/30 focus:border-accent-500 transition-all max-h-28"
              rows={1}
              disabled={isLoading}
              style={{ minHeight: 42 }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-xl transition-all shrink-0',
                input.trim() && !isLoading
                  ? 'bg-accent-500 text-white hover:bg-accent-600 shadow-sm'
                  : 'bg-surface-raised text-text-tertiary cursor-not-allowed'
              )}
              aria-label="Send message"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Pulse animation style */}
      <style jsx global>{`
        @keyframes gentle-pulse {
          0%, 100% { box-shadow: 0 4px 14px rgba(0,0,0,0.15); }
          50% { box-shadow: 0 4px 24px rgba(0,0,0,0.25); }
        }
        .animate-gentle-pulse {
          animation: gentle-pulse 2.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}

// ============================================================================
// Empty state
// ============================================================================

function EmptyState({ onSelectPrompt }: { onSelectPrompt: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg">
        <SparkleIcon className="w-8 h-8 text-white" />
      </div>
      <h3
        className="text-lg font-semibold text-text-primary mb-1"
        style={{ fontFamily: 'var(--font-display, Fraunces, serif)' }}
      >
        Hey there! I'm Sunny ✨
      </h3>
      <p className="text-sm text-text-secondary mb-6 max-w-xs">
        Your permanent jewelry mentor. Ask me about welding, business, marketing, pricing — anything PJ!
      </p>
      <div className="flex flex-wrap gap-2 justify-center max-w-sm">
        {SUGGESTED_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => onSelectPrompt(prompt)}
            className="px-3 py-2 rounded-full text-xs font-medium border border-border-default text-text-secondary hover:text-accent-600 hover:border-accent-300 hover:bg-accent-50 transition-all"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Message bubble
// ============================================================================

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className="flex flex-col max-w-[85%] gap-1.5">
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm',
            isUser
              ? 'bg-accent-500 text-white rounded-br-md'
              : 'bg-surface-raised text-text-primary rounded-bl-md border border-border-default'
          )}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div
              className="mentor-markdown"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
            />
          )}
          {message.isStreaming && message.content && (
            <span className="inline-block w-1.5 h-4 bg-accent-500 ml-0.5 animate-pulse rounded-sm" />
          )}
        </div>

        {/* Product cards */}
        {message.products && message.products.length > 0 && (
          <ProductCarousel products={message.products} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Typing indicator
// ============================================================================

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-surface-raised rounded-2xl rounded-bl-md px-4 py-3 border border-border-default">
        <div className="flex gap-1.5 items-center">
          <span className="w-2 h-2 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Product carousel
// ============================================================================

function ProductCarousel({ products }: { products: Product[] }) {
  return (
    <div className="overflow-x-auto pb-1 -mx-1 px-1">
      <div className="flex gap-2" style={{ minWidth: 'min-content' }}>
        {products.map(product => (
          <a
            key={product.id}
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-36 rounded-xl border border-border-default bg-white hover:shadow-md transition-shadow overflow-hidden group"
          >
            {product.imageUrl ? (
              <div className="w-full h-24 bg-surface-raised overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.imageAlt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-full h-24 bg-surface-raised flex items-center justify-center">
                <ShoppingBagIcon className="w-8 h-8 text-text-tertiary" />
              </div>
            )}
            <div className="p-2">
              <p className="text-xs font-medium text-text-primary line-clamp-2 leading-tight mb-1">
                {product.title}
              </p>
              <p className="text-xs font-semibold text-accent-600">{product.price}</p>
              <p className="text-[10px] text-accent-500 mt-1 group-hover:underline">View →</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Icons (inline SVGs)
// ============================================================================

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}