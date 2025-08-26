import { Logger } from '../../utils/logger';
import { ErrorHandler, ErrorCode, LearnLinkerError } from '../../utils/errors';
import { SSEChunk } from './types';

export interface SSEHandlerOptions {
  onMessage?: (chunk: SSEChunk) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  onConnectionOpen?: () => void;
}

export class SSEHandler {
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private eventSource: EventSource | null = null;
  private options: SSEHandlerOptions;
  private isConnected: boolean = false;

  constructor(options: SSEHandlerOptions = {}) {
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    this.options = options;
  }

  public connect(url: string, headers?: Record<string, string>): void {
    try {
      this.logger.debug('Connecting to SSE endpoint:', url);
      
      // Note: EventSource doesn't support custom headers in the browser
      // For VS Code extension, we might need to use a different approach
      // This is a limitation of the EventSource API
      if (headers && Object.keys(headers).length > 0) {
        this.logger.warn('Custom headers are not supported by EventSource API');
      }

      this.eventSource = new EventSource(url);
      this.isConnected = true;

      this.eventSource.onopen = () => {
        this.logger.info('SSE connection opened');
        this.isConnected = true;
        this.options.onConnectionOpen?.();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const chunk = this.parseSSEMessage(event.data);
          this.options.onMessage?.(chunk);
        } catch (error) {
          this.logger.error('Failed to parse SSE message:', error);
          this.options.onError?.(error as Error);
        }
      };

      this.eventSource.onerror = (event) => {
        this.logger.error('SSE connection error:', event);
        this.isConnected = false;
        
        const error = new LearnLinkerError(
          'SSE connection error',
          ErrorCode.NETWORK_ERROR,
          { event }
        );
        
        this.options.onError?.(error);
        this.close();
      };

    } catch (error) {
      this.logger.error('Failed to create SSE connection:', error);
      this.isConnected = false;
      
      const learnLinkerError = LearnLinkerError.fromError(error);
      this.options.onError?.(learnLinkerError);
    }
  }

  public close(): void {
    if (this.eventSource) {
      this.logger.debug('Closing SSE connection');
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
    }
  }

  public get connected(): boolean {
    return this.isConnected;
  }

  private parseSSEMessage(data: string): SSEChunk {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(data);
      
      // Validate the parsed object
      if (typeof parsed.type !== 'string') {
        throw new Error('Invalid SSE message: missing type');
      }

      const chunk: SSEChunk = {
        type: parsed.type
      };

      if (parsed.type === 'content' && typeof parsed.content === 'string') {
        chunk.content = parsed.content;
      } else if (parsed.type === 'error' && typeof parsed.error === 'string') {
        chunk.error = parsed.error;
      }

      return chunk;
    } catch (error) {
      // If JSON parsing fails, treat as plain content
      this.logger.debug('Failed to parse SSE message as JSON, treating as plain content');
      return {
        type: 'content',
        content: data
      };
    }
  }

  // Alternative method for fetching SSE with custom headers (using fetch)
  public static async fetchSSE(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
      onMessage?: (chunk: SSEChunk) => void;
      onError?: (error: Error) => void;
      onComplete?: () => void;
    } = {}
  ): Promise<void> {
    const logger = Logger.getInstance();
    const errorHandler = ErrorHandler.getInstance();

    try {
      const response = await fetch(url, {
        method: options.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        body: options.body
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          options.onComplete?.();
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = SSEHandler.parseSSELine(line);
              options.onMessage?.(chunk);
            } catch (error) {
              logger.error('Failed to parse SSE line:', error);
              options.onError?.(error as Error);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to fetch SSE:', error);
      const learnLinkerError = LearnLinkerError.fromError(error);
      options.onError?.(learnLinkerError);
    }
  }

  private static parseSSELine(line: string): SSEChunk {
    // Remove "data: " prefix if present
    const data = line.startsWith('data: ') ? line.substring(6) : line;
    
    try {
      const parsed = JSON.parse(data);
      
      if (typeof parsed.type !== 'string') {
        throw new Error('Invalid SSE message: missing type');
      }

      const chunk: SSEChunk = {
        type: parsed.type
      };

      if (parsed.type === 'content' && typeof parsed.content === 'string') {
        chunk.content = parsed.content;
      } else if (parsed.type === 'error' && typeof parsed.error === 'string') {
        chunk.error = parsed.error;
      }

      return chunk;
    } catch (error) {
      // If JSON parsing fails, treat as plain content
      return {
        type: 'content',
        content: data
      };
    }
  }
}