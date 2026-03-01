// ============================================================================
// Agentic Loop — src/lib/agentic-loop.ts
// ============================================================================
// Shared utility for Sunny + Atlas agentic tool execution.
// Calls Anthropic with stream: false, executes tools in a loop (max 8),
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
    console.log(`[AgenticLoop] Iteration ${iterations}/${maxIterations}, messages: ${conversationMessages.length}`);

    let response;
    try {
      const requestBody = {
        model,
        max_tokens: maxTokens,
        stream: false,
        system: systemPrompt,
        messages: conversationMessages,
        tools,
      };

      console.log(`[AgenticLoop] Calling Anthropic API (model: ${model}, messages: ${conversationMessages.length}, tools: ${tools.length})`);

      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });
    } catch (fetchErr: any) {
      console.error('[AgenticLoop] Fetch error:', fetchErr?.message, fetchErr?.stack);
      throw new Error(`AI service error: network failure — ${fetchErr?.message || 'unknown'}`);
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AgenticLoop] Anthropic API error (iteration ${iterations}):`, response.status, errText);
      throw new Error(`AI service error: ${response.status} — ${errText.slice(0, 200)}`);
    }

    let result;
    try {
      result = await response.json();
    } catch (parseErr: any) {
      console.error('[AgenticLoop] JSON parse error:', parseErr?.message);
      throw new Error('AI service error: invalid JSON response');
    }

    console.log(`[AgenticLoop] Response: stop_reason=${result.stop_reason}, content_blocks=${result.content?.length || 0}`);

    if (result.stop_reason === 'tool_use') {
      // Log tool_use blocks
      const toolUseBlocks = (result.content || []).filter((b: any) => b.type === 'tool_use');
      for (const tu of toolUseBlocks) {
        console.log(`[AgenticLoop] Tool call: ${tu.name} (id: ${tu.id})`, JSON.stringify(tu.input).slice(0, 500));
      }

      // Append assistant message with full content (text + tool_use blocks)
      conversationMessages.push({ role: 'assistant', content: result.content });

      // Execute each tool_use block
      const toolResults: any[] = [];
      for (const block of result.content) {
        if (block.type === 'tool_use') {
          const statusLabel = getToolStatusLabel(block.name);
          toolStatusEvents.push(statusLabel);

          try {
            console.log(`[AgenticLoop] Executing tool: ${block.name}`);
            const toolOutput = await executeTool(block.name, block.input);
            console.log(`[AgenticLoop] Tool "${block.name}" succeeded:`, JSON.stringify(toolOutput.result).slice(0, 300));

            const toolResult: any = {
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(toolOutput.result),
            };
            // Only include is_error when true (omit for successful results)
            if (toolOutput.isError) {
              toolResult.is_error = true;
            }
            toolResults.push(toolResult);
          } catch (err: any) {
            console.error(`[AgenticLoop] Tool "${block.name}" threw:`, {
              toolName: block.name,
              toolInput: JSON.stringify(block.input).slice(0, 500),
              error: err?.message,
              stack: err?.stack,
            });
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify({
                error: `Tool error in ${block.name}: ${err.message || 'Unknown error'}. The tool failed — please tell the user what happened and suggest an alternative.`,
              }),
              is_error: true,
            });
          }
        }
      }

      console.log(`[AgenticLoop] Sending ${toolResults.length} tool result(s) back to API`);

      // Append tool results as a user message
      conversationMessages.push({ role: 'user', content: toolResults });
      continue;
    }

    // stop_reason === 'end_turn' or anything else — extract final text
    const textBlocks = (result.content || []).filter((b: any) => b.type === 'text');
    const fullResponseText = textBlocks.map((b: any) => b.text).join('');

    console.log(`[AgenticLoop] Done after ${iterations} iteration(s), response length: ${fullResponseText.length}`);
    return { fullResponseText, toolStatusEvents };
  }

  // Safety cap reached — return whatever we have
  console.warn(`[AgenticLoop] Safety cap reached after ${maxIterations} iterations`);
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
