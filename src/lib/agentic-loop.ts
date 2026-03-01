// ============================================================================
// Agentic Loop — src/lib/agentic-loop.ts
// ============================================================================
// Shared utility for Sunny + Atlas agentic tool execution.
// Calls Anthropic with stream: false, executes tools in a loop (max 5),
// then returns the final text + tool status events for simulated SSE.
// ============================================================================

export interface AgenticLoopOptions {
  model: string;
  maxTokens: number;
  systemPrompt: string;
  messages: any[];
  tools: any[];
  executeTool: (name: string, input: any) => Promise<{ result: any; isError?: boolean }>;
  maxIterations?: number;
  getToolStatusLabel: (toolName: string) => string;
}

export interface AgenticLoopResult {
  fullResponseText: string;
  toolStatusEvents: string[];
}

export async function runAgenticLoop(options: AgenticLoopOptions): Promise<AgenticLoopResult> {
  const {
    model,
    maxTokens,
    systemPrompt,
    messages,
    tools,
    executeTool,
    maxIterations = 5,
    getToolStatusLabel,
  } = options;

  const conversationMessages = [...messages];
  const toolStatusEvents: string[] = [];
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: false,
        system: systemPrompt,
        messages: conversationMessages,
        tools,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[AgenticLoop] Anthropic API error:', errText);
      throw new Error('AI service error');
    }

    const result = await response.json();

    if (result.stop_reason === 'tool_use') {
      // Append assistant message with full content (text + tool_use blocks)
      conversationMessages.push({ role: 'assistant', content: result.content });

      // Execute each tool_use block
      const toolResults: any[] = [];
      for (const block of result.content) {
        if (block.type === 'tool_use') {
          const statusLabel = getToolStatusLabel(block.name);
          toolStatusEvents.push(statusLabel);

          try {
            const toolOutput = await executeTool(block.name, block.input);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(toolOutput.result),
              is_error: toolOutput.isError || false,
            });
          } catch (err: any) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({ error: err.message || 'Tool execution failed' }),
              is_error: true,
            });
          }
        }
      }

      // Append tool results as a user message
      conversationMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    // stop_reason === 'end_turn' or anything else — extract final text
    const textBlocks = (result.content || []).filter((b: any) => b.type === 'text');
    const fullResponseText = textBlocks.map((b: any) => b.text).join('');

    return { fullResponseText, toolStatusEvents };
  }

  // Safety cap reached — return whatever we have
  return {
    fullResponseText: "I've been working on your request but hit my processing limit. Could you try rephrasing or breaking it into smaller steps?",
    toolStatusEvents,
  };
}

// ============================================================================
// Simulated SSE stream builder
// ============================================================================
// Builds a ReadableStream that emits toolStatus events first, then chunks
// the final text at ~12 chars per 15ms for a smooth streaming feel.
// ============================================================================

export function buildAgenticSSEStream(
  fullResponseText: string,
  toolStatusEvents: string[]
): ReadableStream {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        // 1. Emit tool status events
        for (const status of toolStatusEvents) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ toolStatus: status })}\n\n`)
          );
        }

        // 2. Stream final text in chunks (~12 chars at 15ms intervals)
        const chunkSize = 12;
        for (let i = 0; i < fullResponseText.length; i += chunkSize) {
          const chunk = fullResponseText.slice(i, i + chunkSize);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
          );
          // Small delay for streaming feel
          await new Promise(resolve => setTimeout(resolve, 15));
        }

        // 3. Done
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (err) {
        console.error('[AgenticSSE] Stream error:', err);
      } finally {
        controller.close();
      }
    },
  });
}
