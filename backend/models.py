from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator


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
    description: Optional[str] = Field(default="", max_length=500)


class GroupTaskCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(default="", max_length=2000)


class GroupEventCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default="", max_length=500)
    category: Optional[str] = Field(default="", max_length=50)
    priority: Literal["low", "medium", "high"]
    start_time: datetime
    end_time: datetime

    @model_validator(mode="after")
    def check_times(self):
        if self.end_time <= self.start_time:
            raise ValueError("End time must be after start time")
        return self


class GroupMemberAdd(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    username: str = Field(min_length=1, max_length=100)
    role: Literal["admin", "member"] = "member"

