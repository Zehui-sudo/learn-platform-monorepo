import { pipeline } from '@xenova/transformers';

export interface SemanticVector {
  values: Float32Array;
  dimension: number;
}

// Type for the transformer pipeline - using unknown to avoid strict typing issues
type EmbedderPipeline = unknown;

export class SemanticService {
  private static instance: SemanticService;
  private embedder: EmbedderPipeline | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): SemanticService {
    if (!SemanticService.instance) {
      SemanticService.instance = new SemanticService();
    }
    return SemanticService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    if (!this.initializationPromise) {
      this.initializationPromise = this.doInitialize();
    }
    
    return this.initializationPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      console.log('正在加载语义模型...');
      
      // 尝试加载 bge-small-zh-v1.5 模型（不使用量化版本）
      this.embedder = await pipeline(
        'feature-extraction',
        'BAAI/bge-small-zh-v1.5',
        {
          quantized: false // 禁用量化，使用原始模型
        }
      );
      
      this.isInitialized = true;
      console.log('语义模型加载完成');
    } catch (error) {
      console.error('bge-small-zh-v1.5 模型加载失败:', error);
      // 降级到通用英文模型
      try {
        console.log('正在加载备用模型...');
        this.embedder = await pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2',
          { 
            quantized: false
          }
        );
        this.isInitialized = true;
        console.log('备用模型加载完成');
      } catch (fallbackError) {
        console.error('语义模型加载完全失败:', fallbackError);
        throw fallbackError;
      }
    }
  }

  async embed(text: string): Promise<SemanticVector> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.embedder) {
      throw new Error('语义模型未初始化');
    }

    // 文本预处理
    const processedText = this.preprocessText(text);
    
    // 生成向量
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (this.embedder as any)(processedText, {
      pooling: 'mean',
      normalize: true
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vector = new Float32Array((result as any).data);
    
    return {
      values: vector,
      dimension: vector.length
    };
  }

  private preprocessText(text: string): string {
    // 中文文本预处理
    return text
      .trim()
      .replace(/\s+/g, ' ') // 合并多余空格
      .slice(0, 512); // 限制长度
  }

  // 计算余弦相似度
  cosineSimilarity(vec1: Float32Array, vec2: Float32Array): number {
    if (vec1.length !== vec2.length) {
      throw new Error('向量维度不一致');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  // 检查是否已初始化
  get isModelReady(): boolean {
    return this.isInitialized;
  }
}