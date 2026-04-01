from fastapi import FastAPI

app = FastAPI(title="PANGAEAPY API Endpoint for VESA", version="0.1.0")

AVAILABLE_DATAPOINT_FIELDS = [
    "id",
    "uri",
    "doi",
    "title",
    "abstract",
    "year",
    "authors",
    "citation",
    "params",
    "parameters",
    "events",
    "projects",
    "mintimeextent",
    "maxtimeextent",
    "data",
    "loginstatus",
    "isCollection",
    "collection_members",
    "moratorium",
    "datastatus",
    "registrystatus",
    "licence",
    "auth_token",
    "cache_expiry_days",
    "cachedir",
    "keywords",
]

@app.get("/", summary="Health check")
def read_root():
    return {"status": "ok"}

@app.get("/datapoints", summary="List PanDataSet data fields")
def list_datapoints():
    return {
        "description": "PanDataSet data attributes available in pangaeapy",
        "count": len(AVAILABLE_DATAPOINT_FIELDS),
        "fields": AVAILABLE_DATAPOINT_FIELDS,
    }
