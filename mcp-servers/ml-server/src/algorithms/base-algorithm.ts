/// <reference types="node" />

/**
 * Base class for all ML algorithms
 */
export abstract class BaseAlgorithm {
  protected name: string;
  protected pythonScriptPath: string;
  protected pythonExecutable: string;

  /**
   * Constructor for the base algorithm
   * @param name Algorithm name
   * @param pythonScriptPath Path to the Python script
   */
  constructor(name: string, pythonScriptPath: string) {
    this.name = name;
    this.pythonScriptPath = pythonScriptPath;
    // Access environment variables via import.meta.env in ESM or process.env
    this.pythonExecutable = process.env.PYTHON_EXECUTABLE || 'python3';
  }

  /**
   * Get the name of the algorithm
   */
  getName(): string {
    return this.name;
  }

  /**
   * Execute a Python script with arguments and return the result
   * @param scriptPath Path to the Python script
   * @param args Arguments to pass to the script
   */
  protected async executePythonScript(scriptPath: string, args: string[] = []): Promise<string> {
    try {
      // Dynamic import for ESM compatibility
      const childProcess = await import('child_process');
      const util = await import('util');
      const execPromise = util.promisify(childProcess.exec);

      const command = `${this.pythonExecutable} ${scriptPath} ${args.join(' ')}`;
      const { stdout, stderr } = await execPromise(command);

      if (stderr) {
        console.error(`Python script error: ${stderr}`);
      }

      return stdout.trim();
    } catch (error) {
      console.error('Error executing Python script:', error);
      throw error;
    }
  }

  /**
   * Save data to a temporary JSON file for Python to read
   * @param data Data to save
   * @param filename Filename for the temporary file
   */
  protected async saveDataToTemp(data: any, filename: string): Promise<string> {
    try {
      // Dynamic import for ESM compatibility
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const tempDir = process.env.ML_TEMP_DIR || './temp';
      const filepath = path.join(tempDir, filename);
      
      // Create temp directory if it doesn't exist
      await fs.mkdir(tempDir, { recursive: true }).catch(() => {});
      
      await fs.writeFile(filepath, JSON.stringify(data), 'utf-8');
      return filepath;
    } catch (error) {
      console.error('Error saving data to temp file:', error);
      throw error;
    }
  }

  /**
   * Read data from a temporary JSON file
   * @param filepath Path to the temporary file
   */
  protected async readDataFromTemp(filepath: string): Promise<any> {
    try {
      // Dynamic import for ESM compatibility
      const fs = await import('fs/promises');
      
      const data = await fs.readFile(filepath, 'utf-8');
      
      // Clean up temporary file
      try {
        await fs.unlink(filepath);
      } catch (error) {
        console.warn(`Could not delete temporary file ${filepath}:`, error);
      }
      
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading data from temp file:', error);
      throw error;
    }
  }
}