import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import * as vscode from 'vscode';
import { Logger } from '../../utils/logger';
import { ErrorHandler, ErrorCode, LearnLinkerError } from '../../utils/errors';
import { 
  ApiClientConfig, 
  ChatRequest, 
  LinksRequest, 
  SectionLink, 
  SaveSnippetRequest, 
  SaveSnippetResponse,
  ApiResponse,
  AIProvider
} from './types';

export class ApiClient {
  private static instance: ApiClient;
  private client: AxiosInstance;
  private logger: Logger;
  private errorHandler: ErrorHandler;
  private config: ApiClientConfig;

  private constructor(config: ApiClientConfig) {
    this.config = config;
    this.logger = Logger.getInstance();
    this.errorHandler = ErrorHandler.getInstance();
    
    // Create axios instance with basic config
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000
    });
    
    // Set headers using Axios's methods to avoid type issues
    if (config.authToken) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${config.authToken}`;
    }
    this.client.defaults.headers.common['Content-Type'] = 'application/json';

    this.setupInterceptors();
  }

  public static getInstance(config?: ApiClientConfig): ApiClient {
    if (!ApiClient.instance) {
      if (!config) {
        throw new Error('ApiClient must be initialized with config on first use');
      }
      ApiClient.instance = new ApiClient(config);
    }
    return ApiClient.instance;
  }

  public updateConfig(config: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update axios instance with new config
    this.client.defaults.baseURL = this.config.baseUrl;
    this.client.defaults.timeout = this.config.timeout || 30000;
    // Clear existing headers and set new ones
    this.client.defaults.headers.common = {};
    
    // Set headers using Axios's methods to avoid type issues
    if (this.config.authToken) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.config.authToken}`;
    }
    this.client.defaults.headers.common['Content-Type'] = 'application/json';
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: any) => {
        this.logger.debug('API Request:', config.method?.toUpperCase(), config.url);
        return config;
      },
      (error: any) => {
        this.logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        this.logger.debug('API Response:', response.status, response.config.url);
        return response;
      },
      (error: AxiosError) => {
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleApiError(error: AxiosError): void {
    let errorCode = ErrorCode.API_ERROR;
    let errorMessage = 'API request failed';
    
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as any;
      
      if (status === 401) {
        errorCode = ErrorCode.AUTH_ERROR;
        errorMessage = 'Authentication failed. Please check your Personal Access Token.';
      } else if (status === 403) {
        errorCode = ErrorCode.AUTH_ERROR;
        errorMessage = 'Access denied. You do not have permission to access this resource.';
      } else if (status === 404) {
        errorMessage = 'The requested resource was not found.';
      } else if (status >= 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (data && data.message) {
        errorMessage = data.message;
      }
    } else if (error.request) {
      // Request was made but no response received
      errorCode = ErrorCode.NETWORK_ERROR;
      errorMessage = 'Network error occurred. Please check your internet connection.';
    } else {
      // Something else happened
      errorMessage = error.message || 'An unknown error occurred';
    }

    const learnLinkerError = new LearnLinkerError(errorMessage, errorCode, {
      originalError: error,
      config: error.config,
      response: error.response?.data
    });

    this.errorHandler.handleError(learnLinkerError, 'ApiClient');
  }

  // Chat API with SSE support
  public async chat(request: ChatRequest): Promise<ReadableStream<string>> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.authToken && { Authorization: `Bearer ${this.config.authToken}` })
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      return new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                controller.close();
                break;
              }
              const chunk = decoder.decode(value, { stream: true });
              controller.enqueue(chunk);
            }
          } catch (error) {
            controller.error(error);
          }
        }
      });
    } catch (error) {
      this.logger.error('Chat API Error:', error);
      throw error;
    }
  }

  // Get knowledge links
  public async getLinks(request: LinksRequest): Promise<SectionLink[]> {
    try {
      const response = await this.client.post<ApiResponse<SectionLink[]>>('/api/links', request);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new LearnLinkerError('Failed to get knowledge links', ErrorCode.API_ERROR, response.data.error);
    } catch (error) {
      this.logger.error('Get Links API Error:', error);
      throw error;
    }
  }

  // Save snippet
  public async saveSnippet(request: SaveSnippetRequest): Promise<SaveSnippetResponse> {
    try {
      const response = await this.client.post<ApiResponse<SaveSnippetResponse>>('/api/snippets', request);
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      throw new LearnLinkerError('Failed to save snippet', ErrorCode.API_ERROR, response.data.error);
    } catch (error) {
      this.logger.error('Save Snippet API Error:', error);
      throw error;
    }
  }

  // Health check
  public async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Health Check Error:', error);
      return false;
    }
  }

  // Test connection
  public async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/test');
      return response.status === 200;
    } catch (error) {
      this.logger.error('Test Connection Error:', error);
      return false;
    }
  }
}