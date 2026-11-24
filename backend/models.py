from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class EventCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    category: Optional[str] = Field(default=None, max_length=50)
    priority: Literal["low", "medium", "high"]
    start_time: datetime
    end_time: datetime

    # https://docs.pydantic.dev/latest/concepts/validators/#model-validators
    @model_validator(mode="after")
    def check_times(self):
        if self.end_time <= self.start_time:
            raise ValueError("End time must be after start time")
        return self


class GroupSpaceCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=100)
    group_type: int = Field(default=0, ge=0, le=1)  # 0 for private, 1 for public


class GroupGoalCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    goal_name: str = Field(min_length=1, max_length=100)
    goal_description: Optional[str] = Field(default=None, max_length=500)
    goal_deadline: Optional[datetime] = None
    goal_scope: Optional[str] = Field(default="EVERYONE", max_length=50)

    @field_validator("goal_deadline", mode="before")
    @classmethod
    def empty_deadline_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

