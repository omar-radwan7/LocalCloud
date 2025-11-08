import axios from 'axios';
import FormData from 'form-data';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
const PYTHON_SERVICE_TIMEOUT = 5000; // 5 seconds timeout

interface PythonServiceResponse {
  success: boolean;
  [key: string]: any;
}

class PythonService {
  private baseURL: string;
  private isAvailable: boolean = false;

  constructor() {
    this.baseURL = PYTHON_SERVICE_URL;
    this.checkAvailability();
  }

  private async checkAvailability(): Promise<void> {
    try {
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 2000,
      });
      this.isAvailable = response.data.status === 'healthy';
    } catch (error) {
      this.isAvailable = false;
    }
  }

  async isServiceAvailable(): Promise<boolean> {
    await this.checkAvailability();
    return this.isAvailable;
  }

  async generateThumbnail(
    fileBuffer: Buffer,
    filename: string,
    size: number = 200
  ): Promise<PythonServiceResponse | null> {
    try {
      if (!this.isAvailable) {
        await this.checkAvailability();
        if (!this.isAvailable) return null;
      }

      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(`${this.baseURL}/api/thumbnail?size=${size}`, formData, {
        headers: formData.getHeaders(),
        timeout: PYTHON_SERVICE_TIMEOUT,
      });

      return response.data;
    } catch (error) {
      console.warn('Python service thumbnail generation failed:', error);
      return null;
    }
  }

  async extractMetadata(fileBuffer: Buffer, filename: string): Promise<PythonServiceResponse | null> {
    try {
      if (!this.isAvailable) {
        await this.checkAvailability();
        if (!this.isAvailable) return null;
      }

      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(`${this.baseURL}/api/metadata`, formData, {
        headers: formData.getHeaders(),
        timeout: PYTHON_SERVICE_TIMEOUT,
      });

      return response.data;
    } catch (error) {
      console.warn('Python service metadata extraction failed:', error);
      return null;
    }
  }

  async extractTextFromPDF(fileBuffer: Buffer, filename: string): Promise<PythonServiceResponse | null> {
    try {
      if (!this.isAvailable) {
        await this.checkAvailability();
        if (!this.isAvailable) return null;
      }

      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(`${this.baseURL}/api/extract-text/pdf`, formData, {
        headers: formData.getHeaders(),
        timeout: PYTHON_SERVICE_TIMEOUT * 2, // PDFs might take longer
      });

      return response.data;
    } catch (error) {
      console.warn('Python service PDF text extraction failed:', error);
      return null;
    }
  }

  async extractTextFromDocx(fileBuffer: Buffer, filename: string): Promise<PythonServiceResponse | null> {
    try {
      if (!this.isAvailable) {
        await this.checkAvailability();
        if (!this.isAvailable) return null;
      }

      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(`${this.baseURL}/api/extract-text/docx`, formData, {
        headers: formData.getHeaders(),
        timeout: PYTHON_SERVICE_TIMEOUT * 2,
      });

      return response.data;
    } catch (error) {
      console.warn('Python service DOCX text extraction failed:', error);
      return null;
    }
  }

  async calculateImageHash(fileBuffer: Buffer, filename: string): Promise<PythonServiceResponse | null> {
    try {
      if (!this.isAvailable) {
        await this.checkAvailability();
        if (!this.isAvailable) return null;
      }

      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(`${this.baseURL}/api/image-hash`, formData, {
        headers: formData.getHeaders(),
        timeout: PYTHON_SERVICE_TIMEOUT,
      });

      return response.data;
    } catch (error) {
      console.warn('Python service image hash calculation failed:', error);
      return null;
    }
  }

  async analyzeFile(fileBuffer: Buffer, filename: string): Promise<PythonServiceResponse | null> {
    try {
      if (!this.isAvailable) {
        await this.checkAvailability();
        if (!this.isAvailable) return null;
      }

      const formData = new FormData();
      formData.append('file', fileBuffer, filename);

      const response = await axios.post(`${this.baseURL}/api/analyze-file`, formData, {
        headers: formData.getHeaders(),
        timeout: PYTHON_SERVICE_TIMEOUT * 2,
      });

      return response.data;
    } catch (error) {
      console.warn('Python service file analysis failed:', error);
      return null;
    }
  }
}

export const pythonService = new PythonService();

