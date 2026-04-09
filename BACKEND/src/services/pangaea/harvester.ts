import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { Database } from "arangojs";

// Utility to create safe ArangoDB keys (replaces slashes and invalid chars)
const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "_")
    .substring(0, 254);

export async function harvestPangaea(db: Database, limit = 10000) {
  console.log(`[INIT] Starting harvest: Target = ${limit} records.`);
  const OAI_BASE = "https://ws.pangaea.de/oai/provider";

  console.log(`[CONFIG] Initializing XML Parser with pan_md array rules.`);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    // Force consistent arrays for tags that can repeat
    isArray: (tagName) =>
      ["record", "md:author", "md:keyword", "md:event"].includes(tagName),
  });

  let harvestedCount = 0;
  let resumptionToken: string | null = null;

  // Collection handles
  console.log(`[DB] Accessing vesa2db collections...`);
  const datasetCol = db.collection("Dataset");
  const authorCol = db.collection("Author");
  const keywordCol = db.collection("Keywords");
  const hasAuthorCol = db.collection("HasAuthor");
  const hasKeywordCol = db.collection("HasKeyword");

  while (harvestedCount < limit) {
    const url = resumptionToken
      ? `${OAI_BASE}?verb=ListRecords&resumptionToken=${resumptionToken}`
      : `${OAI_BASE}?verb=ListRecords&metadataPrefix=pan_md&set=citable`;

    try {
      console.log(`[NETWORK] Fetching batch from: ${url}`);
      const response = await axios.get(url);

      console.log(`[PARSE] Converting XML response to JSON...`);
      const jsonObj = parser.parse(response.data);
      const listRecords = jsonObj["OAI-PMH"]?.ListRecords;

      if (!listRecords || !listRecords.record) {
        console.warn("[WARN] No records found in this batch. Terminating.");
        break;
      }

      const records = listRecords.record;
      console.log(
        `[PROCESS] Batch received. Processing ${records.length} records.`,
      );

      for (const record of records) {
        if (harvestedCount >= limit) break;

        const metadata = record.metadata?.["md:MetaData"];
        if (!metadata) {
          console.log(`[SKIP] Record missing metadata. Skipping.`);
          continue;
        }

        // 1. Extract the numeric PANGAEA ID
        const pangaeaId = record.header.identifier.replace(
          "oai:pangaea.de:doi:10.1594/PANGAEA.",
          "",
        );
        const datasetKey = pangaeaId; // Using numeric ID as the ArangoDB _key

        const citation = metadata["md:citation"] || {};
        const event = metadata["md:event"]?.[0] || {}; // Primary event for geographic data

        // 2. Map to your new specific format
        const datasetDoc = {
          _key: datasetKey,
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
              min_date_time:
                event["md:dateTime"] || citation["md:dateTime"] || null,
              max_date_time:
                event["md:dateTime"] || citation["md:dateTime"] || null,
            },
            elevation: {
              name: "Elevation",
              unit: "m",
              min: parseFloat(event["md:elevation"]) || null,
              max: parseFloat(event["md:elevation"]) || null,
            },
          },
          api_urls: {
            openaire: null, // Set to null as these require external API lookups
            openalex: null,
            eudat: null,
          },
        };

  console.log(`[COMPLETE] Harvesting process finished.`, datasetDoc);


        // 3. Save to ArangoDB
        console.log(`[DB-SAVE] Storing Dataset doc: ${datasetKey}`);
        await datasetCol.save(datasetDoc, { overwriteMode: "update" });

        // 2. Map Authors and Edges
        const authors = citation["md:author"] || [];
        for (const author of authors) {
          const fName = author["md:firstName"] || "";
          const lName = author["md:lastName"] || "";
          const authorKey = slugify(`${lName}_${fName}`);

          if (authorKey) {
            console.log(`[AUTHOR] Saving: ${authorKey}`);
            await authorCol.save(
              { _key: authorKey, first_name: fName, last_name: lName },
              { overwriteMode: "ignore" },
            );

            console.log(`[EDGE] Linking Dataset -> Author: ${authorKey}`);
            await hasAuthorCol.save(
              { _from: `Dataset/${datasetKey}`, _to: `Author/${authorKey}` },
              { overwriteMode: "ignore" },
            );
          }
        }

        // 3. Map Keywords and Edges
        const keywords = metadata["md:keyword"] || [];
        for (const kw of keywords) {
          const kwText = typeof kw === "string" ? kw : kw["#text"];
          if (!kwText) continue;

          const kwKey = slugify(kwText);
          console.log(`[KEYWORD] Saving: ${kwKey}`);
          await keywordCol.save(
            { _key: kwKey, keyword: kwText },
            { overwriteMode: "ignore" },
          );

          console.log(`[EDGE] Linking Dataset -> Keyword: ${kwKey}`);
          await hasKeywordCol.save(
            { _from: `Dataset/${datasetKey}`, _to: `Keywords/${kwKey}` },
            { overwriteMode: "ignore" },
          );
        }
        

        harvestedCount++;
      }

      // Check for Resumption Token (Pagination)
      const rawToken = listRecords.resumptionToken;

      if (rawToken) {
        // Extract the string whether it's a simple string or an object with #text
        resumptionToken =
          typeof rawToken === "object" ? rawToken["#text"] : rawToken;

        console.log(`[PAGINATION] Token extracted: ${resumptionToken}`);
        console.log(`[IDLE] Waiting 1s for rate-limit compliance...`);
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        console.log(`[FINISH] No more tokens. Harvest complete.`);
        resumptionToken = null;
        break;
      }
    } catch (err: any) {
      console.error(
        `[ERROR] Critical failure in harvesting loop: ${err.message}`,
      );
      throw err;
    }
  }
  console.log(`[COMPLETE] Total records indexed: ${harvestedCount}`);
}
