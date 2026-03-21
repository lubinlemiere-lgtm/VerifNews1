from pydantic import BaseModel


class SourceResponse(BaseModel):
    id: int
    name: str
    url: str
    source_type: str
    reliability_tier: int
    country_code: str | None

    model_config = {"from_attributes": True}
