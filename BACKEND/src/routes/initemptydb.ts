import { Router, Request, Response } from "express";
import { Database } from "arangojs";
import { CollectionType } from "arangojs/collection";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const dbName = "vesa2db";
  const arangoUrl = process.env.ARANGO_URL || "http://127.0.0.1:8529";
  const username = process.env.ARANGO_USER || "root";
  const password = process.env.ARANGO_PASS || "";
  const docCollections = ["Dataset", "Author", "Keywords"];
  const edgeCollections = ["HasAuthor", "HasKeyword"];

  try {
    const systemDb = new Database({
      url: arangoUrl,
      auth: { username, password },
      databaseName: "_system",
    });
    const databases = await systemDb.listDatabases();
    let databaseCreated = false;
    if (!databases.includes(dbName)) {
      await systemDb.createDatabase(dbName);
      databaseCreated = true;
    }

    const targetDb = new Database({
      url: arangoUrl,
      auth: { username, password },
      databaseName: dbName,
    });

    const created = { documents: [] as string[], edges: [] as string[] };

    for (const name of docCollections) {
      const col = targetDb.collection(name);
      if (!(await col.exists())) {
        await col.create();
        created.documents.push(name);
      }
    }

    for (const name of edgeCollections) {
      const col = targetDb.collection(name);
      if (!(await col.exists())) {
        await col.create({ type: CollectionType.EDGE_COLLECTION });
        created.edges.push(name);
      }
    }

    res.status(200).json({
      status: "success",
      database: dbName,
      databaseCreated,
      created,
      message: databaseCreated
        ? "Database created and collections initialized"
        : "Database already existed; collections ensured",
    });
  } catch (error) {
    console.error("initemptydb failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ status: "error", message });
  }
});

export default router;
