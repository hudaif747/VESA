<!-- 
This is execution plan plots the gap between adapter-registry-model.md (which we have partially implemented) to the new revised-architecture-model.md (leaner and better after the last discussion)
-->

1. **Introduce a real ingestion domain (new core)** <span style="color:green; font-weight:bold">COMPLETED</span>
   *(Updated recently: Created discrete modular services in `src/ingestion/` including `HandshakeValidator`, `SyncOrchestrator`, `PrefixingService`, `RelationExtractor`, and `GraphWriter`. Completely decoupled from PANGAEA-specific tags.)*
   Create a dedicated ingestion module (or expand existing harvester path) with:
   * `HandshakeValidator` (fetch 1 record, schema check)
   * `SyncOrchestrator` (batch loop, retries, stop/resume)
   * `PrefixingService` (namespace all IDs)
   * `RelationExtractor` (dataset/authors/keywords + edge payloads)
   * `GraphWriter` (atomic upserts + edge upserts)
   Reuse and split logic from `harvestPangaea` in `harvester.ts`.

2. **Define the new ingestion contract explicitly** <span style="color:green; font-weight:bold">COMPLETED</span>
   *(Updated recently: Created `src/ingestion/contracts/IDataAdapter.ts` outlining the standard `IDataset`, `IAuthor`, and `IKeyword` shapes.)*
   Your revised doc says “Universal Data Packet”, but older code centered on `IDataAdapter` (recently renamed to `IVesaReader` to reflect the single local graph reader pivot).
   Add a separate payload contract (e.g., `IDataAdapter`) under `types.ts` or a new ingestion contracts file.

3. **Add ingestion API endpoints for Init UI lifecycle**  *(PENDING: What is left)*
   Current routes are query-centric; add/expand ingestion routes for:
   * `/sync/validate` (1-record handshake)
   * `/sync/start`
   * `/sync/status`
   * `/sync/stop`
   You can extend `pangaeaHarvester.ts` and wire in `index.ts`.

4. **Make graph schema ingestion-first** *(PENDING: What is left)*
   Current DB bootstrap in `initemptydb.ts` creates collections, but you still need:
   * stable naming policy (keep `Dataset`/`Author`/`Keywords` or migrate consistently)
   * unique indexes on normalized IDs
   * edge de-dup constraints for `HasAuthor`/`HasKeyword`

5. **Simplify read-path adapter into “VESA reader”**  <span style="color:green; font-weight:bold">COMPLETED</span>
   Replace multi-source adapter framing with a single local graph reader for runtime queries.
   * Keep current query methods (`search`, `getDatasetById`, keywords/authors APIs)
   * Re-label `VesaAdapter` as the VESA local graph reader
   * Remove/bypass non-essential adapter-registry logic on read path (keep only compatibility wiring if still needed)
   * Treat external sources as ingestion-time concerns only (not runtime read fan-out)

6. **Remove/limit runtime double mapping**
   You currently map adapter-domain models to legacy response models via `toLegacyDataset`, `toLegacyKeyword`, `toLegacyAuthor` in `responseTransformers.ts`.
   Revised model should minimize this layer (or deprecate it behind v1 endpoints).

7. **Re-scope services: query services + ingestion services**
   Keep query services (`DatasetService`, `KeywordService`, `AuthorService`) but add ingestion service wiring in `index.ts` or parallel module.

8. **Decide fate of AdapterRegistry**  <span style="color:green; font-weight:bold">COMPLETED</span>
   AdapterRegistry runtime fan-out is removed for read path.
   Runtime queries now use a single local graph reader (`VesaAdapter`).
   Any remaining registry-era compatibility wiring should be deleted incrementally.

9. **Normalize ID strategy globally** <span style="color:green; font-weight:bold">COMPLETED: Removed idMapper.ts and related files and imports for it</span>
   Current ID conversion utilities (`toAdapterId`, `toLegacyId`) in `idMapper.ts` should move to ingestion boundary + compatibility endpoints only.

10. **Update docs/tests to new truth** *(PENDING: What is left)*
    Replace claims in `adapter-registry-model.md` with ingestion-first flow from `revised-architecture-model.md`.
    Add tests for handshake, batch sync, id-prefixing, edge generation, idempotent upserts (extend `__tests__`).

11. **Implement Standalone PANGAEA Proxy (Sample Adapter API)**
    Create a reference external Express service mimicking `harvester.ts` that serves JSON records compliant with `IDataAdapter`.
    * **Isolate parsing:** Move XML/Mapping logic from `harvester.ts` to the new proxy.
    * **Contract endpoint:** Expose `GET /pangaea/records` to fetch and transform PANGAEA OAI data into `IDataAdapter` arrays.
    * **Pagination & Mocks:** Support `?token=` for batch loops and a static JSON fixture mode for deterministic validation.
    * **Integration:** Ensure `HandshakeValidator` and `SyncOrchestrator` succeed against this new standalone URL.

### Minimal implementation order
* Contract + handshake endpoint <span style="color:green; font-weight:bold">(Partially Done)</span>
* Prefixing + relation extractor + graph writer <span style="color:green; font-weight:bold">(Done)</span>
* Sync orchestration with status tracking <span style="color:green; font-weight:bold">(Done)</span>
* Route wiring + init UI integration *(Remaining)*
* Decommission/reduce legacy transformers and runtime mapping paths *(Remaining)*