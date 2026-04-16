import axios from 'axios';
import { IDataAdapter } from '../contracts/IDataAdapter';

export class HandshakeValidator {
  async validate(url: string): Promise<boolean> {
    try {
      console.log(`\x1b[36m[HandshakeValidator] Requesting 1 record from ${url} for schema validation...\x1b[0m`);
      // Fetch 1 record (assuming the endpoint supports a limit query or returns a valid array/object)
      const response = await axios.get(url, { params: { limit: 1 } });
      const record: IDataAdapter = Array.isArray(response.data) ? response.data[0] : response.data;

      // Basic schema check
      if (!record || !record.dataset || !record.dataset._key || !record.dataset.title) {
        console.warn(`\x1b[33m[HandshakeValidator] Schema check failed: Missing required dataset fields.\x1b[0m`);
        return false;
      }
      
      if (!Array.isArray(record.authors) || !Array.isArray(record.keywords)) {
        console.warn(`\x1b[33m[HandshakeValidator] Schema check failed: Authors or keywords are not arrays.\x1b[0m`);
        return false;
      }

      console.log(`\x1b[32m[HandshakeValidator] \u2714 Source is compliant with the IDataAdapter contract.\x1b[0m`);
      return true;
    } catch (error: any) {
      console.error(`\x1b[31m[HandshakeValidator] \u2718 Request failed: ${error.message}\x1b[0m`);
      return false;
    }
  }
}
