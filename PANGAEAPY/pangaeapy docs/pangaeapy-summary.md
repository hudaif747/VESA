# pangaeapy quick reference

## Typical usage
- Import: `from pangaeapy import PanDataSet`
- Instantiate with caching: `PanDataSet(<id_or_doi>, enable_cache=True, cachedir="/path", auth_token="<token_optional>")`
- Download binaries: `ds.download(indices=[<row_indices>], columns=["Binary" or other column names])`
- Download all binaries (auth required for protected data): `ds.download()`
- Custom cache dir: set `cachedir` when creating `PanDataSet`.

## Key PanDataSet options
- `id`: int or DOI; `setID(id)` to set later.
- `enable_cache`, `cachedir`, `cache_expiry_days`: control pickle cache.
- `include_data`: skip data table if False.
- `expand_terms`: expand ontology hierarchy terms.
- `deleteFlag`: exclude data by quality flag.
- `auth_token`: bearer token from https://www.pangaea.de/user/.

## Core PanDataSet methods
- `check_pickle(expirydays)`: refresh cache when stale.
- `download(indices=None, columns=None)`: binary download or CSV fallback.
- `setData(addEventColumns=True)`: populate dataframe; can auto-add event columns.
- `setMetadata()`: load metadata from XML.
- `getEventsAsFrame()`: events as DataFrame.
- `getGeometry()`: derive geometry from x/y/z/t.
- `getParamDict()`: parameters as dict.
- `info()`: basic dataset info.
- Converters: `to_dwca(save=True)`, `to_frictionless(filelocation=None, save=True)`, `to_netcdf(filelocation=None, save=True, type="sdn")`, `to_pickle()`.
- Load from cache: `from_pickle()`.

## Important attributes
- Identifiers: `id`, `uri`, `doi`
- Descriptives: `title`, `abstract`, `year`, `citation`, `keywords`
- Collections: `authors`, `params`, `parameters`, `events`, `projects`, `collection_members`
- Extents: `mintimeextent`, `maxtimeextent`
- Dataframe: `data`
- Access/status: `loginstatus`, `isCollection`, `moratorium`, `datastatus`, `registrystatus`, `licence`, `auth_token`
- Cache: `cache_expiry_days`, `cachedir`

## PanQuery
- Instantiate: `PanQuery(query, bbox=None, limit=10, offset=0)`
- Attributes: `totalcount`, `error`, `query`, `result`
- Method: `get_dois()` → list of DOIs from results.
