export class VectorCache {
  private cache: Map<string, Float32Array> = new Map();
  private readonly CACHE_PREFIX = 'vector_';
  private readonly CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7天

  get(text: string): Float32Array | null {
    const key = this.CACHE_PREFIX + this.hashText(text);
    const cached = localStorage.getItem(key);
    
    if (!cached) return null;
    
    try {
      const { timestamp, vector } = JSON.parse(cached);
      
      // 检查过期时间
      if (Date.now() - timestamp > this.CACHE_EXPIRY) {
        localStorage.removeItem(key);
        return null;
      }
      
      return new Float32Array(vector);
    } catch (error) {
      console.warn('向量缓存解析失败:', error);
      localStorage.removeItem(key);
      return null;
    }
  }

  set(text: string, vector: Float32Array): void {
    const key = this.CACHE_PREFIX + this.hashText(text);
    const data = {
      timestamp: Date.now(),
      vector: Array.from(vector)
    };
    
    try {
      localStorage.setItem(key, JSON.stringify(data));
      
      // 清理过期缓存
      this.cleanupExpiredCache();
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('LocalStorage 配额不足，清理缓存');
        this.clearAll();
        this.set(text, vector);
      } else {
        console.error('向量缓存设置失败:', error);
      }
    }
  }

  private hashText(text: string): string {
    // 简单的哈希函数
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const { timestamp } = JSON.parse(cached);
            if (now - timestamp > this.CACHE_EXPIRY) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  clearAll(): void {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  get size(): number {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.CACHE_PREFIX)) {
        count++;
      }
    }
    return count;
  }
}