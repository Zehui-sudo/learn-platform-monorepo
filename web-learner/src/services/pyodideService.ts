interface PyodideInterface {
  runPython: (code: string) => unknown;
  globals: Record<string, unknown>;
  FS: {
    writeFile: (path: string, data: string | Uint8Array) => void;
    readFile: (path: string) => Uint8Array;
    unlink: (path: string) => void;
  };
  version: string;
}

declare global {
  interface Window {
    loadPyodide: (config?: { indexURL?: string }) => Promise<PyodideInterface>;
  }
}

class PyodideService {
  private static instance: PyodideService;
  private pyodide: PyodideInterface | null = null;
  private loadingPromise: Promise<PyodideInterface> | null = null;
  private outputBuffer: string[] = [];

  private constructor() {}

  static getInstance(): PyodideService {
    if (!PyodideService.instance) {
      PyodideService.instance = new PyodideService();
    }
    return PyodideService.instance;
  }

  async loadPyodide(): Promise<void> {
    if (this.pyodide) {
      return;
    }

    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }

    this.loadingPromise = this.doLoadPyodide();
    await this.loadingPromise;
  }

  private async doLoadPyodide(): Promise<PyodideInterface> {
    try {
      // Load Pyodide script
      await this.loadScript('https://fastly.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');

      // Initialize Pyodide
      this.pyodide = await window.loadPyodide({
        indexURL: 'https://fastly.jsdelivr.net/pyodide/v0.26.4/full/',
      });

      // Set up Python environment
      await this.setupPythonEnvironment();

      return this.pyodide;
    } catch (error) {
      this.loadingPromise = null;
      throw new Error(`Failed to load Pyodide: ${error}`);
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  private async setupPythonEnvironment(): Promise<void> {
    if (!this.pyodide) return;

    // Override print to capture output
    this.pyodide.runPython(`
import sys
from io import StringIO
import builtins

class OutputCapture:
    def __init__(self):
        self.output = []
    
    def write(self, text):
        self.output.append(text)
    
    def flush(self):
        pass
    
    def get_output(self):
        return ''.join(self.output)
    
    def clear(self):
        self.output = []

_stdout_capture = OutputCapture()
_stderr_capture = OutputCapture()

sys.stdout = _stdout_capture
sys.stderr = _stderr_capture

# Store original print for internal use
_original_print = print

def captured_print(*args, **kwargs):
    output = StringIO()
    _original_print(*args, **kwargs, file=output)
    _stdout_capture.write(output.getvalue())

builtins.print = captured_print
    `);
  }

  async runPython(code: string): Promise<{ output: string; error: string | null }> {
    if (!this.pyodide) {
      throw new Error('Pyodide is not loaded');
    }

    try {
      // Clear previous output
      this.pyodide.runPython('_stdout_capture.clear()');
      this.pyodide.runPython('_stderr_capture.clear()');

      // Run the user code
      const result = await this.pyodide.runPython(code);

      // Capture output
      const stdout = this.pyodide.runPython('_stdout_capture.get_output()');
      const stderr = this.pyodide.runPython('_stderr_capture.get_output()');

      // Format result if it's not None
      let output = String(stdout || '');
      if (result !== undefined && result !== null && output === '') {
        output = String(result);
      }

      return {
        output,
        error: stderr ? String(stderr) : null,
      };
    } catch (error) {
      // Parse Python error
      const errorMessage = this.formatPythonError(error);
      return {
        output: '',
        error: errorMessage,
      };
    }
  }

  private formatPythonError(error: unknown): string {
    if (error instanceof Error) {
      // Extract relevant Python error information
      const message = error.message;
      
      // Try to extract Python traceback
      if (message.includes('Traceback')) {
        const lines = message.split('\n');
        const relevantLines = lines.filter(line => 
          !line.includes('pyodide.js') && 
          !line.includes('pyodide.asm')
        );
        return relevantLines.join('\n');
      }
      
      return message;
    }
    
    return String(error);
  }

  isLoaded(): boolean {
    return this.pyodide !== null;
  }

  getLoadingPromise(): Promise<PyodideInterface> | null {
    return this.loadingPromise;
  }

  destroy(): void {
    this.pyodide = null;
    this.loadingPromise = null;
    this.outputBuffer = [];
  }
}

export const pyodideService = PyodideService.getInstance();