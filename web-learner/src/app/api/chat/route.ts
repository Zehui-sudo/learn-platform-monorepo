import { NextRequest } from 'next/server';
import { createAIProvider } from '@/services/ai';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, provider = 'openai', model, contextReference, language } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const aiProvider = createAIProvider(provider);
    
    const stream = await aiProvider.chat({
      messages,
      model,
      contextReference,
      stream: true,
      language,
    });

    if (!(stream instanceof ReadableStream)) {
      return new Response(JSON.stringify(stream), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Chat API error:', errorMessage, error);

    return new Response(JSON.stringify({
      error: 'Failed to get response from AI provider.',
      details: errorMessage,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}