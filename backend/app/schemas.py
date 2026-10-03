from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class SearchRequest(BaseModel):
    query: str = Field(max_length=200)


class NodeRef(BaseModel):
    id: str
    type: str
    name: str


class Evidence(BaseModel):
    id: str
    content: str
    sourceUrl: HttpUrl | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)


class Connection(BaseModel):
    edgeId: str
    type: str
    weight: float
    direction: Literal["outgoing", "incoming"]
    neighbor: NodeRef
    evidenceCount: int = Field(ge=0)


class Match(BaseModel):
    node: NodeRef
    connections: list[Connection]
    evidence: list[Evidence]


class SearchResponse(BaseModel):
    status: Literal["unconfigured", "empty", "error", "ok"]
    query: str
    message: str | None = None
    match: Match | None = None
    alsoMatched: list[NodeRef] | None = None


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    environment: str


class ReadinessResponse(BaseModel):
    status: Literal["ready"]
    database: Literal["connected"]
