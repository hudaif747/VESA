import express, { Request, Response } from 'express';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { IDataAdapter, IDataset, IAuthor, IKeyword } from '../ingestion/contracts/IDataAdapter';

export const pangaeaProxyRouter = express.Router();

const OAI_BASE = "https://ws.pangaea.de/oai/provider";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  isArray: (tag) => ["record", "md:author", "md:techKeyword", "md:event"].includes(tag),
});

const slugify = (text: string) => text.toLowerCase().trim().replace(/[^a-z0-9]/g, "_").substring(0, 254);

// --- Mappers to the IDataAdapter Contract ---

const MapDataset = (record: any, metadata: any): IDataset => {
  const identifier = typeof record.header.identifier === 'object' ? record.header.identifier['#text'] : record.header.identifier;
  const pangaeaId = (identifier || "").replace("oai:pangaea.de:doi:10.1594/PANGAEA.", "");
  const citation = metadata["md:citation"] || {};
  const event = metadata["md:event"]?.[0] || {};

  return {
    _key: pangaeaId,
    pangaea_id: pangaeaId,
    title: citation["md:title"] || "Untitled",
    text_abstract: metadata["md:abstract"] || null,
    publication_date: citation["md:dateTime"] || null,
    uri: `https://doi.org/10.1594/PANGAEA.${pangaeaId}`,
    extent: {
      geographic: {
        west_bound_longitude: parseFloat(event["md:longitude"]) || null,
        east_bound_longitude: parseFloat(event["md:longitude"]) || null,
        south_bound_latitude: parseFloat(event["md:latitude"]) || null,
        north_bound_latitude: parseFloat(event["md:latitude"]) || null,
        mean_longitude: parseFloat(event["md:longitude"]) || null,
        mean_latitude: parseFloat(event["md:latitude"]) || null,
      },
      temporal: {
        min_date_time: event["md:dateTime"] || citation["md:dateTime"] || null,
        max_date_time: event["md:dateTime"] || citation["md:dateTime"] || null,
      },
      elevation: {
        name: "Elevation",
        unit: "m",
        min: parseFloat(event["md:elevation"]) || null,
        max: parseFloat(event["md:elevation"]) || null,
      },
    },
    api_urls: { openaire: null, openalex: null, eudat: null },
  };
};

const MapAuthors = (citation: any): IAuthor[] => {
  const authors = citation["md:author"] || [];
  const list = Array.isArray(authors) ? authors : [authors];
  return list.map((a: any) => ({
    _key: slugify(`${a["md:lastName"]}_${a["md:firstName"]}`),
    display_name: `${a["md:firstName"] || ""} ${a["md:lastName"] || ""}`.trim(),
    first_name: a["md:firstName"] || "",
    last_name: a["md:lastName"] || "",
    e_mail: a["md:eMail"] || null,
    uri: a["md:URI"] || null,
    orcid: a["md:orcid"] || null,
  }));
};

const MapKeywords = (metadata: any): IKeyword[] => {
  const techKeywords = metadata["md:keywords"]?.["md:techKeyword"] || [];
  const list = Array.isArray(techKeywords) ? techKeywords : [techKeywords];
  const noise = /^(param|method|author|basis|campaign|event|inst|journal|license|project|ref|term|geocode)/;

  return list
    .map((k: any) => k["#text"]?.trim())
    .filter((txt: string) => txt && !noise.test(txt))
    .map((txt: string) => ({
      _key: slugify(txt),
      display_name: txt,
      name: txt.toLowerCase(),
    }));
};

// --- Mock Fixture ---
const MOCK_FIXTURE: IDataAdapter = {
  dataset: {
    _key: "mock_999999",
    pangaea_id: "mock-999999",
    title: "Static Mock Dataset for Handshake Verification",
    text_abstract: "This is a deterministic mock used strictly for testing the HandshakeValidator.",
    publication_date: null,
    uri: "https://doi.org/10.1594/PANGAEA.mock-999999",
    extent: {
      geographic: {
        west_bound_longitude: null, east_bound_longitude: null,
        south_bound_latitude: null, north_bound_latitude: null,
        mean_longitude: null, mean_latitude: null
      },
      temporal: { min_date_time: null, max_date_time: null },
      elevation: { name: "Elevation", unit: "m", min: null, max: null }
    },
    api_urls: { openaire: null, openalex: null, eudat: null }
  },
  authors: [{ 
    _key: "mock_author", display_name: "Mock Author", first_name: "Mock", last_name: "Author", e_mail: null, uri: null, orcid: null 
  }],
  keywords: [{ 
    _key: "mock_keyword", display_name: "mock keyword", name: "mock keyword" 
  }]
};

// --- GET Endpoint for Records ---
pangaeaProxyRouter.get('/records', async (req: Request, res: Response): Promise<void> => {
  try {
    const isMock = req.query.mock === 'true';
    if (isMock) {
      res.json([MOCK_FIXTURE]); // Return array to support batching/limit logic
      return;
    }

    const token = req.query.token as string | undefined;
    const url = token
      ? `${OAI_BASE}?verb=ListRecords&resumptionToken=${encodeURIComponent(token)}`
      : `${OAI_BASE}?verb=ListRecords&metadataPrefix=pan_md&set=citable`;

    const { data } = await axios.get(url);
    const jsonObj = parser.parse(data);
    const listRecords = jsonObj["OAI-PMH"]?.ListRecords;

    if (!listRecords || !listRecords.record) {
      res.json([]);
      return;
    }

    const output: IDataAdapter[] = [];
    
    // Normalize to array, XML Parser might return single object if only one record exists
    const records = Array.isArray(listRecords.record) ? listRecords.record : [listRecords.record];

    for (const record of records) {
      const metadata = record.metadata?.["md:MetaData"];
      if (!metadata) continue;

      output.push({
        dataset: MapDataset(record, metadata),
        authors: MapAuthors(metadata["md:citation"] || {}),
        keywords: MapKeywords(metadata)
      });
    }

    // Attach next token in headers or root object for the Orchestrator to use if needed
    const rawToken = listRecords.resumptionToken;
    const nextToken = rawToken ? (typeof rawToken === "object" ? rawToken["#text"] : rawToken) : null;
    
    if (nextToken) {
      res.set('X-Next-Token', nextToken);
    }

    res.json(output);
  } catch (error: any) {
    console.error(`[PangaeaProxy] Error fetching OAI subset:`, error.message);
    res.status(500).json({ error: error.message });
  }
});
