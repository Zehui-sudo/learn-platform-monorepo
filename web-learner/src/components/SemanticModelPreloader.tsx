'use client';

import { useEffect } from 'react';
import { useLearningStore } from '@/store/learningStore';
import { SemanticService } from '@/services/semanticService';

export function SemanticModelPreloader() {
  const { hybridServiceInitialized, initializeHybridService } = useLearningStore();

  useEffect(() => {
    // 在应用空闲时预加载语义模型
    const preloadModel = async () => {
      try {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(async () => {
            await SemanticService.getInstance().initialize();
          });
        } else {
          // 降级方案
          setTimeout(async () => {
            await SemanticService.getInstance().initialize();
          }, 3000);
        }
      } catch (error) {
        console.warn('语义模型预加载失败:', error);
      }
    };

    preloadModel();

    // 如果混合服务未初始化且已有学习路径，则初始化混合服务
    if (!hybridServiceInitialized) {
      const checkAndInitialize = setInterval(() => {
        const { loadedPaths } = useLearningStore.getState();
        const hasPaths = Object.keys(loadedPaths).length > 0;
        
        if (hasPaths) {
          initializeHybridService();
          clearInterval(checkAndInitialize);
        }
      }, 1000);

      // 清理定时器
      return () => clearInterval(checkAndInitialize);
    }
  }, [hybridServiceInitialized, initializeHybridService]);

  return null;
}