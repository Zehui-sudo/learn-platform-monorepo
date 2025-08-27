import * as vscode from 'vscode';
import { ConfigurationService } from '../services/config/configurationService';
import type { SectionLink, KnowledgeLinkConfig } from '../types/knowledge';

/**
 * Link Renderer for formatting and displaying knowledge links
 */
export class LinkRenderer {
  private static instance: LinkRenderer;
  private config: ConfigurationService;

  private constructor() {
    this.config = ConfigurationService.getInstance();
  }

  public static getInstance(): LinkRenderer {
    if (!LinkRenderer.instance) {
      LinkRenderer.instance = new LinkRenderer();
    }
    return LinkRenderer.instance;
  }

  /**
   * Render knowledge links section
   */
  public renderKnowledgeLinks(links: SectionLink[]): string {
    if (!links || links.length === 0) {
      return this.renderNoLinks();
    }

    const config = this.getConfig();
    const sections: string[] = [];

    sections.push('');
    sections.push('════════════════════════════════════════════════');
    sections.push('📚 相关知识点推荐');
    sections.push('════════════════════════════════════════════════');
    sections.push('');

    links.forEach((link, index) => {
      sections.push(this.renderSingleLink(link, index + 1, config));
      sections.push('');
    });

    sections.push('💡 提示: 点击链接可跳转到学习平台对应章节');
    sections.push('');

    return sections.join('\n');
  }

  /**
   * Render a single knowledge link
   */
  private renderSingleLink(
    link: SectionLink,
    index: number,
    config: KnowledgeLinkConfig
  ): string {
    const lines: string[] = [];
    
    // Title with confidence icon
    const confidenceIcon = this.getConfidenceIcon(link.confidence);
    lines.push(`${index}. 📖 ${link.title} ${confidenceIcon}`);
    
    // Chapter info
    lines.push(`   章节: ${link.chapterTitle} > ${link.title}`);
    
    // Confidence level
    if (link.confidence) {
      const confidenceText = this.getConfidenceText(link.confidence);
      lines.push(`   置信度: ${confidenceText}`);
    }
    
    // Match reason
    if (config.showMatchReason && link.explanation) {
      lines.push(`   ${link.explanation}`);
    }
    
    // Matched keywords if available
    if (link.matchedKeywords && link.matchedKeywords.length > 0) {
      lines.push(`   关键词: ${link.matchedKeywords.join(', ')}`);
    }
    
    // Link
    const url = this.buildPlatformUrl(link.sectionId);
    lines.push(`   [点击学习](${url})`);

    return lines.join('\n');
  }

  /**
   * Render when no links are found
   */
  private renderNoLinks(): string {
    const sections: string[] = [];
    
    sections.push('');
    sections.push('════════════════════════════════════════════════');
    sections.push('📚 相关知识点推荐');
    sections.push('════════════════════════════════════════════════');
    sections.push('');
    sections.push('暂无匹配的知识点推荐');
    sections.push('');
    sections.push('💡 提示: 尝试选择更具代表性的代码片段');
    sections.push('');

    return sections.join('\n');
  }

  /**
   * Get confidence icon
   */
  private getConfidenceIcon(confidence?: 'low' | 'medium' | 'high'): string {
    switch (confidence) {
      case 'high':
        return '🟢';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔴';
      default:
        return '⚪';
    }
  }

  /**
   * Get confidence text
   */
  private getConfidenceText(confidence: 'low' | 'medium' | 'high'): string {
    switch (confidence) {
      case 'high':
        return '高 (强相关)';
      case 'medium':
        return '中 (相关)';
      case 'low':
        return '低 (可能相关)';
      default:
        return '未知';
    }
  }

  /**
   * Build platform URL
   */
  private buildPlatformUrl(sectionId: string): string {
    const platformUrl = vscode.workspace.getConfiguration('learnLinker.platform').get('url', 'http://localhost:3000');
    return `${platformUrl}/learn#${sectionId}`;
  }

  /**
   * Render knowledge links with grouping by confidence
   */
  public renderKnowledgeLinksGrouped(links: SectionLink[]): string {
    if (!links || links.length === 0) {
      return this.renderNoLinks();
    }

    const grouped = this.groupByConfidence(links);
    const sections: string[] = [];

    sections.push('');
    sections.push('════════════════════════════════════════════════');
    sections.push('📚 相关知识点推荐');
    sections.push('════════════════════════════════════════════════');
    sections.push('');

    // Render high confidence first
    if (grouped.high.length > 0) {
      sections.push('🟢 强相关知识点:');
      grouped.high.forEach((link, i) => {
        sections.push(this.renderCompactLink(link, i + 1));
      });
      sections.push('');
    }

    // Medium confidence
    if (grouped.medium.length > 0) {
      sections.push('🟡 相关知识点:');
      grouped.medium.forEach((link, i) => {
        sections.push(this.renderCompactLink(link, i + 1));
      });
      sections.push('');
    }

    // Low confidence
    if (grouped.low.length > 0) {
      sections.push('🔴 可能相关:');
      grouped.low.forEach((link, i) => {
        sections.push(this.renderCompactLink(link, i + 1));
      });
      sections.push('');
    }

    sections.push('💡 提示: 点击链接可跳转到学习平台对应章节');
    sections.push('');

    return sections.join('\n');
  }

  /**
   * Group links by confidence level
   */
  private groupByConfidence(links: SectionLink[]): {
    high: SectionLink[];
    medium: SectionLink[];
    low: SectionLink[];
  } {
    const grouped = {
      high: [] as SectionLink[],
      medium: [] as SectionLink[],
      low: [] as SectionLink[]
    };

    links.forEach(link => {
      const confidence = link.confidence || 'low';
      grouped[confidence].push(link);
    });

    return grouped;
  }

  /**
   * Render compact link format
   */
  private renderCompactLink(link: SectionLink, index: number): string {
    const url = this.buildPlatformUrl(link.sectionId);
    return `   ${index}. [${link.title}](${url}) - ${link.chapterTitle}`;
  }

  /**
   * Generate markdown links for VS Code
   */
  public generateMarkdownLinks(links: SectionLink[]): string {
    return links
      .map(link => {
        const url = this.buildPlatformUrl(link.sectionId);
        return `- [${link.title}](${url})`;
      })
      .join('\n');
  }

  /**
   * Generate hover content for a link
   */
  public generateHoverContent(link: SectionLink): vscode.MarkdownString {
    const content = new vscode.MarkdownString();
    
    content.appendMarkdown(`**${link.title}**\n\n`);
    content.appendMarkdown(`📚 章节: ${link.chapterTitle}\n\n`);
    
    if (link.confidence) {
      const icon = this.getConfidenceIcon(link.confidence);
      const text = this.getConfidenceText(link.confidence);
      content.appendMarkdown(`${icon} 置信度: ${text}\n\n`);
    }
    
    if (link.explanation) {
      content.appendMarkdown(`💡 ${link.explanation}\n\n`);
    }
    
    if (link.matchedKeywords && link.matchedKeywords.length > 0) {
      content.appendMarkdown(`🔑 关键词: ${link.matchedKeywords.join(', ')}\n\n`);
    }
    
    const url = this.buildPlatformUrl(link.sectionId);
    content.appendMarkdown(`[点击学习](${url})`);
    
    content.isTrusted = true;
    return content;
  }

  /**
   * Get configuration
   */
  private getConfig(): KnowledgeLinkConfig {
    const workspace = vscode.workspace;
    return {
      enabled: workspace.getConfiguration('learnLinker.knowledgeLinks').get('enabled', true),
      maxResults: workspace.getConfiguration('learnLinker.knowledgeLinks').get('maxResults', 5),
      minConfidence: workspace.getConfiguration('learnLinker.knowledgeLinks').get('minConfidence', 'low') as 'low' | 'medium' | 'high',
      showMatchReason: workspace.getConfiguration('learnLinker.knowledgeLinks').get('showMatchReason', true),
      autoOpen: workspace.getConfiguration('learnLinker.knowledgeLinks').get('autoOpen', false),
      cacheEnabled: workspace.getConfiguration('learnLinker.knowledgeLinks').get('cacheEnabled', true),
      cacheTTL: workspace.getConfiguration('learnLinker.knowledgeLinks').get('cacheTTL', 300000)
    };
  }
}