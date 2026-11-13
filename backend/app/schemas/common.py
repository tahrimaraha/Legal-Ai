"""Base schema shared by every router: JSON keys are camelCase to match the
frontend API contract; Python attributes stay snake_case."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class OkResponse(CamelModel):
    ok: bool = True
