import { NextRequest, NextResponse } from 'next/server';
import { FeatureMatchingService } from '@/services/featureMatchingService';
import { getKnowledgeLinkService } from '@/services/knowledgeLinkService';

/**
 * Enhanced links API endpoint that accepts AST features
 */

interface ASTFeatures {
  syntaxFlags: string[];
  patterns: string[];
  apiSignatures: string[];
  complexity: 'low' | 'medium' | 'high';
  contextHints?: Record<string, boolean>;
}

interface EnhancedLinksRequest {
  code?: string;                // 原始代码（可选，作为fallback）
  language: 'javascript' | 'python' | 'typescript';
  features?: ASTFeatures;        // AST分析结果
  filePath?: string;
  topK?: number;
}

// Initialize services
let featureMatchingService: FeatureMatchingService | null = null;
let knowledgeLinkService: ReturnType<typeof getKnowledgeLinkService> | null = null;

function getServices() {
  if (!featureMatchingService) {
    featureMatchingService = new FeatureMatchingService();
  }
  if (!knowledgeLinkService) {
    knowledgeLinkService = getKnowledgeLinkService();
  }
  return { featureMatchingService, knowledgeLinkService };
}

export async function POST(req: NextRequest) {
  try {
    const body: EnhancedLinksRequest = await req.json();
    const { code, language, features, topK = 5 } = body;

    // Validate request
    if (!language) {
      return NextResponse.json(
        { error: 'Language is required' },
        { status: 400 }
      );
    }

    const { featureMatchingService, knowledgeLinkService } = getServices();

    // Map TypeScript to JavaScript for matching purposes
    const matchingLanguage = language === 'typescript' ? 'javascript' : language;

    // Initialize services if needed
    await featureMatchingService.initialize(matchingLanguage);

    let results;

    // Use feature-based matching if AST features are provided
    if (features && (features.patterns.length > 0 || features.apiSignatures.length > 0)) {
      console.log('Using feature-based matching with AST features:', {
        patterns: features.patterns.length,
        apis: features.apiSignatures.length,
        syntax: features.syntaxFlags.length
      });
      
      results = await featureMatchingService.matchByFeatures(features, matchingLanguage, topK);
    } 
    // Fallback to keyword matching if no features or only code is provided
    else if (code) {
      console.log('Falling back to keyword matching');
      results = knowledgeLinkService.identifyLinks(code, matchingLanguage, topK);
    } 
    else {
      return NextResponse.json(
        { error: 'Either code or features must be provided' },
        { status: 400 }
      );
    }

    // Log matching results for debugging
    console.log(`Found ${results.length} knowledge links for ${matchingLanguage} code`);

    return NextResponse.json({
      success: true,
      data: results,
      matchingMethod: features ? 'feature-based' : 'keyword-based'
    });

  } catch (error) {
    console.error('Error in /api/links:', error);
    return NextResponse.json(
      { 
        error: 'Failed to identify knowledge links',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}