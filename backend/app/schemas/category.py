from pydantic import BaseModel


class CategoryResponse(BaseModel):
    id: int
    slug: str
    name: str
    icon: str | None
    description: str | None

    model_config = {"from_attributes": True}
