# VESA2: Unified Graph & Ingestion Pipeline Architecture

## 1. Overview
The **VESA2 Unified Graph Architecture** represents a strategic shift from a live-aggregation "Adapter-Registry" model to an **Ingestion-First Knowledge Graph**. By moving computational complexity from the runtime request to a maintenance-phase ingestion pipeline, the system achieves sub-second graph traversals and infinite source-agnostic scalability.

## 2. Motivation: The Architectural Pivot

### Previous Model (Live Aggregator)
The backend attempted to fetch and merge data from multiple external APIs at the moment of the user request.
* **Constraints**: High latency, complex runtime ID mapping, and high maintenance overhead for "Double Mapping" (Standard Type → Legacy Type).

### New Model (Unified Graph Pipeline)
The system enforces a **Universal Data Packet** contract. External sources are ingested, prefixed, and linked into a central ArangoDB Knowledge Graph (**vesa2db**) before they are ever queried.
* **Outcome**: High-performance "Linked Brushing" visualizations and zero-code integration for compliant external sources.

---

## 3. Component Specifications

### 3.1 The Sync Layer (Ingestion Pipeline)
Located within the Core Domain, this layer handles the ETL (Extract, Transform, Load) logic.

* **Sync Service**: Orchestrates automated pull requests to the Harvester API based on user configurations (Batch Size, Total Records).
* **Prefixing Service**: The "Namespace Guard." Intercepts incoming packets and prepends a user-defined `dataset_id` (e.g., `pangaea:`) to all entity identifiers. This guarantees **ID Sovereignty** and prevents node collisions across different external sources.
* **Relation Extractor**: Deconstructs flat JSON payloads into relational components, separating the core dataset from its authors and keywords to prepare them for edge generation.

### 3.2 ArangoDB Knowledge Graph
The unified data store is strictly modeled into five collections to support multi-dimensional filtering and graph traversals.

**Document Collections (Nodes):**
* **Datasets**: Core metadata (Title, DOI, spatial coordinates, temporal coverage).
* **Authors**: Unique human or organizational contributors.
* **Keywords**: Standardized semantic concepts and thematic tags.

**Edge Collections (Relations):**
* **HasAuthor**: Directed edge linking a Dataset to an Author.
* **HasKeyword**: Directed edge linking a Dataset to a Keyword.

### 3.3 VESA Adapter (The Core Reader)
Repurposed from the legacy model, the VESA Adapter serves as the exclusive read interface.

* **Function**: Translates requests from Business Logic Services into optimized AQL (ArangoDB Query Language) queries.
* **Advantage**: Since relations are pre-calculated as edges during ingestion, complex operations (e.g., Chord Diagrams) are executed natively within the database engine.

### 3.4 Initialization UI (The Gatekeeper)
A dedicated frontend configuration screen manages the ingestion lifecycle.

* **Inputs**: Target URL, Target Route, `dataset_id`, Batch Size, and Total Record Limit.
* **The Handshake Validation**: Before committing to a full sync, the system fetches exactly **1 record** from the provided Harvester API to verify strict compliance with the `IDataAdapter` schema.

---

## 4. Lifecycle Execution Flow

### Phase I: Maintenance (Ingestion)
1. **Configuration**: User supplies parameters via Init UI.
2. **Handshake**: Sync Service executes the 1-record validation.
3. **Batching**: Upon success, asynchronous batch fetching begins.
4. **Normalization**: Prefixing Service normalizes IDs (e.g., `author_1` → `pangaea:author_1`).
5. **Relational Mapping**: Relation Extractor generates `HasAuthor` and `HasKeyword` edge profiles.
6. **Commit**: Data is committed via atomic upserts into ArangoDB.

### Phase II: Runtime (Discovery)
1. **Interaction**: User interacts with the VESA Dashboard.
2. **Dispatch**: Frontend sends query parameters to the Express API.
3. **Service Call**: Dataset/Author/Keyword Services invoke the VESA Adapter.
4. **Execution**: The adapter executes local AQL queries against the graph and returns optimized JSON.
5. **Update**: Visualizations instantly reflect the "Linked Brushing" logic.

---

## 5. Contract Compliance (IDataAdapter)
To participate in the VESA ecosystem, external systems must function as standalone APIs that return the **Universal VESA Data Packet**. The backend requires no custom code to integrate new sources—only a valid endpoint that adheres to the contract.