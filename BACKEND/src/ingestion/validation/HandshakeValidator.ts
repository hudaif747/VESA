import axios from 'axios';
import { IDataAdapter } from '../contracts/IDataAdapter';

export class HandshakeValidator {
  async validate(url: string): Promise<boolean> {
    try {
      // Fetch 1 record (assuming the endpoint supports a limit query or returns a valid array/object)
      const response = await axios.get(url, { params: { limit: 1 } });
      const record: IDataAdapter = Array.isArray(response.data) ? response.data[0] : response.data;

      // Basic schema check
      if (!record || !record.dataset || !record.dataset.id || !record.dataset.title) {
        return false;
      }
      
      if (!Array.isArray(record.authors) || !Array.isArray(record.keywords)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error(`[HandshakeValidator] Failed to validate URL: ${url}`, error);
      return false;
    }
  }
}
