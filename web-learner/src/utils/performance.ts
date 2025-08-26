export class PerformanceMonitor {
  static async measure<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    // 上报到监控系统
    if (duration > 1000) {
      console.warn(`Performance warning: ${name} took ${duration}ms`);
    }
    
    return { result, duration };
  }

  static measureSync<T>(
    name: string,
    fn: () => T
  ): { result: T; duration: number } {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    // 上报到监控系统
    if (duration > 1000) {
      console.warn(`Performance warning: ${name} took ${duration}ms`);
    }
    
    return { result, duration };
  }
}