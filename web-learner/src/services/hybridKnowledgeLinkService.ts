import { SemanticService } from './semanticService';
import { KnowledgeLinkService, getKnowledgeLinkService } from './knowledgeLinkService';
import { VectorCache } from '@/lib/vectorCache';
import type { SectionLink } from '@/types';

interface HybridMatchConfig {
  keywordWeight: number;    // 关键词匹配权重
  semanticWeight: number;   // 语义匹配权重
  qualityThreshold: number; // 质量阈值
  maxResults: number;      // 最大结果数
}

export class HybridKnowledgeLinkService {
  private semanticService: SemanticService;
  private keywordService: KnowledgeLinkService;
  private semanticIndex: Map<string, Float32Array> = new Map();
  private vectorCache: VectorCache;
  private config: HybridMatchConfig;

  constructor(config: HybridMatchConfig = {
    keywordWeight: 0.4,
    semanticWeight: 0.6,
    qualityThreshold: 0.65, // 提高质量阈值
    maxResults: 5
  }) {
    this.semanticService = SemanticService.getInstance();
    this.keywordService = getKnowledgeLinkService();
    this.vectorCache = new VectorCache();
    this.config = config;
  }

  // 初始化语义索引
  async initializeSemanticIndex(sections: Array<{
    id: string;
    title: string;
    contentPreview?: string;
    chapterTitle?: string;
    language: 'python' | 'javascript';
  }>): Promise<void> {
    console.log('开始构建语义索引...');
    
    await this.semanticService.initialize();
    
    // 分批处理，避免内存问题
    const batchSize = 50;
    for (let i = 0; i < sections.length; i += batchSize) {
      const batch = sections.slice(i, i + batchSize);
      await this.processBatch(batch);
      
      // 进度提示
      if (i % 100 === 0) {
        console.log(`语义索引构建进度: ${i}/${sections.length}`);
      }
    }
    
    console.log('语义索引构建完成');
  }

  private async processBatch(sections: Array<{
    id: string;
    title: string;
    contentPreview?: string;
  }>): Promise<void> {
    const texts = sections.map(section => 
      `${section.title} ${section.contentPreview || ''}`
    );

    // 批量生成向量
    const embeddings = await Promise.all(
      texts.map(text => this.embedWithCache(text))
    );

    // 存储向量
    sections.forEach((section, index) => {
      this.semanticIndex.set(section.id, embeddings[index].values);
    });
  }

  // 带缓存的向量化
  private async embedWithCache(text: string) {
    // 检查缓存
    const cached = this.vectorCache.get(text);
    if (cached) {
      return { values: cached, dimension: cached.length };
    }

    // 生成新向量
    const vector = await this.semanticService.embed(text);
    
    // 缓存结果
    this.vectorCache.set(text, vector.values);
    
    return vector;
  }

  // 混合匹配主方法
  async identifyLinks(
    query: string,
    options: {
      language?: 'python' | 'javascript';
      useCache?: boolean;
    } = {}
  ): Promise<SectionLink[]> {
    const { language } = options;

    // 1. 并行执行关键词匹配和语义匹配
    const [keywordResults, semanticResults] = await Promise.all([
      this.keywordService.identifyLinks(query, language),
      this.identifyLinksSemantic(query)
    ]);

    // 2. 结果融合
    const fusedResults = this.fuseResults(keywordResults, semanticResults);

    // 3. 应用质量控制和多样性过滤
    const finalResults = this.applyQualityControl(fusedResults);

    return finalResults.slice(0, this.config.maxResults);
  }

  // 语义匹配
  private async identifyLinksSemantic(query: string): Promise<SectionLink[]> {
    // 生成查询向量
    const queryVector = await this.embedWithCache(query);

    // 计算与所有知识点的相似度
    const similarities: Array<{
      sectionId: string;
      similarity: number;
      metadata: {
      title: string;
      chapterId: string;
      chapterTitle: string;
      language: 'python' | 'javascript';
    };
    }> = [];

    for (const [sectionId, vector] of this.semanticIndex.entries()) {
      const similarity = this.semanticService.cosineSimilarity(
        queryVector.values,
        vector
      );

      if (similarity > 0.3) { // 语义相似度阈值
        similarities.push({
          sectionId,
          similarity,
          metadata: await this.getSectionMetadata(sectionId)
        });
      }
    }

    // 排序并返回
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 20) // 取前20个用于融合
      .map(item => ({
        sectionId: item.sectionId,
        title: item.metadata.title,
        chapterId: item.metadata.chapterId,
        chapterTitle: item.metadata.chapterTitle,
        language: item.metadata.language,
        relevanceScore: item.similarity,
        matchType: 'semantic' as const,
        confidence: this.getConfidenceLevel(item.similarity),
        explanation: `语义相似度: ${(item.similarity * 100).toFixed(1)}%`
      }));
  }

  // 结果融合
  private fuseResults(
    keywordResults: SectionLink[],
    semanticResults: SectionLink[]
  ): SectionLink[] {
    const resultMap = new Map<string, SectionLink>();

    // 处理关键词结果
    keywordResults.forEach(result => {
      resultMap.set(result.sectionId, {
        ...result,
        fusedScore: (result.relevanceScore || 0) * this.config.keywordWeight,
        matchType: 'keyword' as const,
        sourceMatches: ['keyword']
      });
    });

    // 处理语义结果
    semanticResults.forEach(result => {
      const existing = resultMap.get(result.sectionId);
      if (existing) {
        // 融合分数
        existing.fusedScore = (existing.fusedScore || 0) + (result.relevanceScore || 0) * this.config.semanticWeight;
        existing.matchType = 'hybrid' as const;
        existing.sourceMatches = [...(existing.sourceMatches || []), 'semantic'];
        // 更新置信度（取较高的）
        if (result.confidence && this.getConfidenceWeight(result.confidence) > this.getConfidenceWeight(existing.confidence)) {
          existing.confidence = result.confidence;
        }
      } else {
        resultMap.set(result.sectionId, {
          ...result,
          fusedScore: (result.relevanceScore || 0) * this.config.semanticWeight,
          sourceMatches: ['semantic']
        });
      }
    });

    return Array.from(resultMap.values());
  }

  // 质量控制
  private applyQualityControl(results: SectionLink[]): SectionLink[] {
    // 1. 质量阈值过滤
    const filtered = results.filter(
      result => (result.fusedScore || 0) >= this.config.qualityThreshold
    );

    // 2. 多样性控制
    return this.ensureDiversity(filtered);
  }

  // 多样性控制
  private ensureDiversity(results: SectionLink[]): SectionLink[] {
    const diversified: SectionLink[] = [];
    const usedKeywords = new Set<string>();

    for (const result of results) {
      // 检查是否包含新的关键词
      const hasNewContent = this.hasNewContent(result, usedKeywords);
      
      if (hasNewContent || diversified.length < 2) {
        diversified.push(result);
        this.extractKeywords(result).forEach(keyword => 
          usedKeywords.add(keyword)
        );
      }
    }

    return diversified;
  }

  // 获取置信度级别
  private getConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  }

  // 置信度权重（用于比较）
  private getConfidenceWeight(confidence?: 'high' | 'medium' | 'low'): number {
    switch (confidence) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  // 辅助方法
  private async getSectionMetadata(sectionId: string): Promise<{
    title: string;
    chapterId: string;
    chapterTitle: string;
    language: 'python' | 'javascript';
  }> {
    // 从 keywordService 获取章节元数据
    const entry = this.keywordService['knowledgeIndex']?.get(sectionId);
    if (entry) {
      return {
        title: entry.title,
        chapterId: entry.chapterId,
        chapterTitle: entry.chapterTitle,
        language: entry.language
      };
    }
    
    // 如果没有找到，返回默认值
    return {
      title: 'Unknown',
      chapterId: '',
      chapterTitle: '',
      language: 'javascript'
    };
  }

  private hasNewContent(result: SectionLink, usedKeywords: Set<string>): boolean {
    const keywords = this.extractKeywords(result);
    return keywords.some(keyword => !usedKeywords.has(keyword));
  }

  private extractKeywords(result: SectionLink): string[] {
    // 从标题中提取关键词
    return result.title
      .toLowerCase()
      .split(/[\s\u4e00-\u9fa5]+/)
      .filter(word => word.length > 1);
  }

  // 更新配置
  updateConfig(config: Partial<HybridMatchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // 获取统计信息
  getStats() {
    return {
      semanticIndexSize: this.semanticIndex.size,
      vectorCacheSize: this.vectorCache.size,
      config: this.config
    };
  }
}

// 导出单例工厂函数
let hybridServiceInstance: HybridKnowledgeLinkService | null = null;

export function getHybridKnowledgeLinkService(): HybridKnowledgeLinkService {
  if (!hybridServiceInstance) {
    hybridServiceInstance = new HybridKnowledgeLinkService();
  }
  return hybridServiceInstance;
}