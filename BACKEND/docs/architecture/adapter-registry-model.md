# Adapter-Registry Model Implementation

## Overview

This document describes the complete implementation of the **Adapter-Registry Model** in the VESA2 backend. This architectural refactoring decouples the application from direct database dependencies and enables seamless integration of multiple data sources through a unified interface.

## Motivation

### Previous Architecture (Before)

```
┌─────────────────────────────────────────────────────────────────┐
│                         ArangoDB                                │
│  Dataset, STACCollection, Keyword, Author, HasKeyword, HasAuthor│
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Direct AQL Queries
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Express Routes                             │
│  /main, /keywords, /author (tightly coupled to ArangoDB)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      React Frontend                             │
└─────────────────────────────────────────────────────────────────┘
```

**Problems:**
- Routes directly imported and executed AQL queries
- Adding new data sources required modifying existing routes
- No abstraction layer for data access
- Tight coupling between API and database schema

### New Architecture (After)

```
┌─────────────────────────────────────────────────────────────────┐
│                    External Data Sources                        │
│  PANGAEA API, GBIF API, OpenAlex API, STAC API, ArangoDB        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Adapter Layer (Anti-Corruption)                 │
│  ArangoAdapter, (future: GbifAdapter, OpenAlexAdapter, etc.)    │
│  All implement IDataAdapter interface                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Core Domain Layer                            │
│  AdapterRegistry, DatasetService, KeywordService, AuthorService │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Response Transformers                        │
│  toLegacyDataset, toLegacyKeyword, toLegacyAuthor               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Express Routes                             │
│  /main, /keywords, /author (uses services, not direct DB)       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      React Frontend                             │
│  (No changes required - same API contract)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Summary

The implementation was completed in 4 steps:

| Step | Description | Files Created/Modified |
|------|-------------|----------------------|
| 1 | Define Adapter Contract | 5 new files |
| 2 | Build ArangoAdapter | 4 new files |
| 3 | Create Registry & Services | 6 new files |
| 4 | Refactor Routes | 2 new files, 5 modified |

---

## Step 1: Define Adapter Contract

### Purpose
Establish the interface that all data source adapters must implement, creating an Anti-Corruption Layer that isolates the core domain from external API specifics.

### Files Created

```
src/gateway/adapters/contracts/
├── index.ts          # Barrel export
├── types.ts          # IDataset, IKeyword, IAuthor, AdapterDatasetID
├── params.ts         # SearchParams, BoundingBox, DateRange
├── features.ts       # AdapterFeatures capability flags
└── IDataAdapter.ts   # The main interface
```

### Key Types

#### AdapterDatasetID
Source-agnostic ID format: `"{source}:{id}"`

```typescript
type AdapterDatasetID = `${string}:${string}`;

// Examples:
// "pangaea:123" - PANGAEA dataset
// "stac:456"    - STAC collection
// "gbif:789"    - GBIF dataset (future)
```

#### IDataset
Normalized dataset representation:

```typescript
interface IDataset {
  id: AdapterDatasetID;
  location_data: ILocation;
  doi: string | null;
  dataset_publication_date?: string | null;
  temporal_coverage: ITemporalCoverage;
  authors?: string[];
  providers?: string[];
  dataset_title: string | null;
  organization: string;
}
```

#### IDataAdapter
The core interface all adapters must implement:

```typescript
interface IDataAdapter {
  readonly source: string;
  
  search(params: SearchParams): Promise<IDataset[]>;
  getDatasetById(id: string): Promise<IDataset | null>;
  getDatasetsByIds(ids: AdapterDatasetID[]): Promise<IDataset[]>;
  getKeywordsForDatasets(datasetIds: AdapterDatasetID[]): Promise<IKeyword[]>;
  getAllKeywords(): Promise<IKeyword[]>;
  getAuthorsForDatasets(datasetIds: AdapterDatasetID[]): Promise<IAuthor[]>;
  getAllAuthors(): Promise<IAuthor[]>;
  getFeatures(): AdapterFeatures;
  healthCheck(): Promise<boolean>;
}
```

---

## Step 2: Build ArangoAdapter

### Purpose
Wrap the existing ArangoDB queries in an adapter that implements `IDataAdapter`, preserving all existing functionality while conforming to the new interface.

### Files Created

```
src/gateway/adapters/arango/
├── index.ts           # Barrel export
├── ArangoAdapter.ts   # Main adapter class
├── idMapper.ts        # ID format conversions
└── typeMapper.ts      # Result type mappings
```

### ID Mapping

The adapter handles bidirectional conversion between ID formats:

| Internal (Adapter) | Legacy (ArangoDB) |
|-------------------|-------------------|
| `pangaea:123` | `Dataset/123` |
| `stac:456` | `STACCollection/456` |

```typescript
// Convert adapter ID to legacy format
toLegacyId('pangaea:123') // => 'Dataset/123'

// Convert legacy ID to adapter format
toAdapterId('Dataset/123') // => 'pangaea:123'
```

### ArangoAdapter Implementation

The adapter wraps existing AQL queries:

| Method | Underlying Query |
|--------|-----------------|
| `search()` | `initialPageLoadQuery` + `mainQuery` |
| `getDatasetsByIds()` | `mainQuery` |
| `getKeywordsForDatasets()` | `keywordQuery` + TF-IDF processing |
| `getAllKeywords()` | `initialPageLoadQuery` + `keywordQuery` |
| `getAuthorsForDatasets()` | `authorQuery` |
| `getAllAuthors()` | `initialPageLoadQuery` + `authorQuery` |
| `healthCheck()` | `RETURN 1` query |

---

## Step 3: Create Registry & Services

### Purpose
Build the Core Domain layer with:
- `AdapterRegistry` - manages adapter instances
- `DatasetService` - aggregates dataset operations
- `KeywordService` - aggregates keyword operations
- `AuthorService` - aggregates author operations

### Files Created

```
src/gateway/services/
├── index.ts              # Barrel export + factory
├── AdapterRegistry.ts    # Adapter management
├── DatasetService.ts     # Dataset aggregation
├── KeywordService.ts     # Keyword aggregation
└── AuthorService.ts      # Author aggregation

src/gateway/
└── index.ts              # Gateway bootstrap
```

### AdapterRegistry

Central registry for managing adapters:

```typescript
const registry = new AdapterRegistry();
registry.register(new ArangoAdapter());
registry.register(new GbifAdapter());  // future

const adapter = registry.get('arango');
const allAdapters = registry.getAll();
```

### Service Layer

Services aggregate data from all registered adapters:

```typescript
const { datasetService, keywordService, authorService } = getServices();

// Fetches from ALL registered adapters and merges results
const allDatasets = await datasetService.getAll();
const allKeywords = await keywordService.getAllKeywords();
const allAuthors = await authorService.getAllAuthors();
```

### Gateway Bootstrap

Single entry point to initialize the system:

```typescript
import { bootstrapGateway } from './gateway';

// Call once at application startup
bootstrapGateway();
// Output: "Gateway: Initialized with adapters: arango"
```

---

## Step 4: Refactor Routes

### Purpose
Replace direct ArangoDB queries in routes with service calls, while maintaining 100% backward compatibility with the frontend API.

### Files Created

```
src/gateway/transformers/
├── index.ts                    # Barrel export
└── responseTransformers.ts     # Legacy format converters
```

### Files Modified

| File | Changes |
|------|---------|
| `src/index.ts` | Added `bootstrapGateway()` call |
| `src/routes/getDataById.ts` | Uses `DatasetService` |
| `src/routes/getKeywords.ts` | Uses `KeywordService` |
| `src/routes/getAuthorById.ts` | Uses `AuthorService` |
| `src/gateway/index.ts` | Exports transformers |

### Response Transformers

Convert adapter types back to legacy format for API responses:

```typescript
// Adapter format -> Legacy format
toLegacyDataset(dataset)  // id: "pangaea:123" -> "Dataset/123"
toLegacyKeyword(keyword)  // dataset_ids -> dataset_id
toLegacyAuthor(author)    // name -> author, dataset_ids -> datasets
```

### Route Changes Example

**Before:**
```typescript
router.get("/all", async (req, res) => {
  const cursor1 = await database.query(initialPageLoadQuery);
  keys = await cursor1.all();
  const cursor = await database.query(mainQuery, { keys });
  const result = await cursor.all();
  res.status(200).json({ result });
});
```

**After:**
```typescript
router.get("/all", async (req, res) => {
  const { datasetService } = getServices();
  const datasets = await datasetService.getAll();
  const result = toLegacyDatasets(datasets);
  res.status(200).json({ result });
});
```

---

## Final Directory Structure

```
src/gateway/
├── index.ts                        # Gateway bootstrap + all exports
│
├── adapters/
│   ├── contracts/
│   │   ├── index.ts                # Barrel export
│   │   ├── types.ts                # IDataset, IKeyword, IAuthor
│   │   ├── params.ts               # SearchParams, BoundingBox, DateRange
│   │   ├── features.ts             # AdapterFeatures
│   │   └── IDataAdapter.ts         # Main interface
│   │
│   └── arango/
│       ├── index.ts                # Barrel export
│       ├── ArangoAdapter.ts        # IDataAdapter implementation
│       ├── idMapper.ts             # ID format conversions
│       └── typeMapper.ts           # Result type mappings
│
├── services/
│   ├── index.ts                    # Barrel export + factory
│   ├── AdapterRegistry.ts          # Adapter management
│   ├── DatasetService.ts           # Dataset aggregation
│   ├── KeywordService.ts           # Keyword aggregation
│   └── AuthorService.ts            # Author aggregation
│
└── transformers/
    ├── index.ts                    # Barrel export
    └── responseTransformers.ts     # Legacy format converters
```

---

## API Contract Preservation

The refactoring maintains 100% backward compatibility:

| Endpoint | Response Shape | Status |
|----------|---------------|--------|
| `GET /main/all` | `{result: [{id: "Dataset/123", ...}]}` | Unchanged |
| `POST /main` | `{result: [{id: "Dataset/123", ...}]}` | Unchanged |
| `GET /keywords/all` | `{result: [{keyword, count, dataset_id: [...]}]}` | Unchanged |
| `POST /keywords` | `{result: [{keyword, count, dataset_id: [...]}]}` | Unchanged |
| `GET /author/all` | `{result: [{author, datasets: [...]}]}` | Unchanged |
| `POST /author` | `{result: [{author, datasets: [...]}]}` | Unchanged |

**The frontend requires no changes.**

---

## Adding a New Data Source

To add a new data source (e.g., GBIF), create a new adapter:

### 1. Create the Adapter

```typescript
// src/gateway/adapters/gbif/GbifAdapter.ts
import { IDataAdapter } from '../contracts';

export class GbifAdapter implements IDataAdapter {
  readonly source = 'gbif';
  
  async search(params) { /* call GBIF API */ }
  async getDatasetsByIds(ids) { /* call GBIF API */ }
  // ... implement all methods
}
```

### 2. Register the Adapter

```typescript
// src/gateway/index.ts
export function bootstrapGateway(): void {
  if (!registry.has('arango')) {
    registry.register(new ArangoAdapter());
  }
  if (!registry.has('gbif')) {
    registry.register(new GbifAdapter());
  }
}
```

### 3. That's It!

The services automatically aggregate data from all registered adapters. No route changes needed.

---

## Future Enhancements

1. **Redis Caching** - Add caching layer in services for expensive operations
2. **Rate Limiting** - Per-adapter rate limiters for external APIs
3. **Circuit Breaker** - Graceful degradation when adapters fail
4. **Health Dashboard** - Aggregate health status from all adapters
5. **More Adapters** - GBIF, OpenAlex, direct PANGAEA API

---

## Testing

### Unit Testing Adapters

```typescript
describe('ArangoAdapter', () => {
  it('should convert IDs correctly', () => {
    expect(toAdapterId('Dataset/123')).toBe('pangaea:123');
    expect(toLegacyId('pangaea:123')).toBe('Dataset/123');
  });
});
```

### Integration Testing Services

```typescript
describe('DatasetService', () => {
  it('should aggregate from all adapters', async () => {
    const registry = new AdapterRegistry();
    registry.register(new MockAdapter('source1', [dataset1]));
    registry.register(new MockAdapter('source2', [dataset2]));
    
    const service = new DatasetService(registry);
    const results = await service.getAll();
    
    expect(results).toHaveLength(2);
  });
});
```

---

## Conclusion

The Adapter-Registry Model provides:

- **Decoupling** - Routes don't know about databases
- **Extensibility** - Add new sources without changing routes
- **Testability** - Mock adapters for unit testing
- **Maintainability** - Clear separation of concerns
- **Backward Compatibility** - Frontend unchanged

The architecture is now ready to integrate additional data sources like GBIF, OpenAlex, and direct API calls to PANGAEA.
