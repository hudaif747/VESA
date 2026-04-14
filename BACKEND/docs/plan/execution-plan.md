<!-- 
This is execution plan plots the gap between adapter-registry-model.md (which we have partially implemented) to the new revised-architecture-model.md (leaner and better after the last discussion)
-->

1. **Introduce a real ingestion domain (new core)**
   Create a dedicated ingestion module (or expand existing harvester path) with:
   * `HandshakeValidator` (fetch 1 record, schema check)
   * `SyncOrchestrator` (batch loop, retries, stop/resume)
   * `PrefixingService` (namespace all IDs)
   * `RelationExtractor` (dataset/authors/keywords + edge payloads)
   * `GraphWriter` (atomic upserts + edge upserts)
   Reuse and split logic from `harvestPangaea` in `harvester.ts`.

2. **Define the new ingestion contract explicitly**
   Your revised doc says “Universal Data Packet”, but code currently centers on `IDataAdapter`.
   Add a separate payload contract (e.g., `IUniversalDataPacket`) under `types.ts` or a new ingestion contracts file.

3. **Add ingestion API endpoints for Init UI lifecycle**
   Current routes are query-centric; add/expand ingestion routes for:
   * `/sync/validate` (1-record handshake)
   * `/sync/start`
   * `/sync/status`
   * `/sync/stop`
   You can extend `pangaeaHarvester.ts` and wire in `index.ts`.

4. **Make graph schema ingestion-first**
   Current DB bootstrap in `initemptydb.ts` creates collections, but you still need:
   * stable naming policy (keep `Dataset`/`Author`/`Keywords` or migrate consistently)
   * unique indexes on normalized IDs
   * edge de-dup constraints for `HasAuthor`/`HasKeyword`

5. **Simplify read-path adapter into “VESA reader”**
   Current `ArangoAdapter` is still framed as one adapter in a multi-source aggregator.
   In revised architecture, external sources are pre-ingested, so this becomes a single graph reader. Keep query methods, but conceptually make it the local graph adapter.

6. **Remove/limit runtime double mapping**
   You currently map adapter-domain models to legacy response models via `toLegacyDataset`, `toLegacyKeyword`, `toLegacyAuthor` in `responseTransformers.ts`.
   Revised model should minimize this layer (or deprecate it behind v1 endpoints).

7. **Re-scope services: query services + ingestion services**
   Keep query services (`DatasetService`, `KeywordService`, `AuthorService`) but add ingestion service wiring in `index.ts` or parallel module.

8. **Decide fate of AdapterRegistry**
   `AdapterRegistry` and `bootstrapGateway` are useful if you still want pluggable readers.
   If revised model is strictly “one unified graph reader”, keep registry minimal or bypass for runtime reads.

9. **Normalize ID strategy globally**
   Current ID conversion utilities (`toAdapterId`, `toLegacyId`) in `idMapper.ts` should move to ingestion boundary + compatibility endpoints only.

10. **Update docs/tests to new truth**
    Replace claims in `adapter-registry-model.md` with ingestion-first flow from `revised-architecture-model.md`.
    Add tests for handshake, batch sync, id-prefixing, edge generation, idempotent upserts (extend `__tests__`).

### Minimal implementation order
* Contract + handshake endpoint
* Prefixing + relation extractor + graph writer
* Sync orchestration with status tracking
* Route wiring + init UI integration
* Decommission/reduce legacy transformers and runtime mapping paths