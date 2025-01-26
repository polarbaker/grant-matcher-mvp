from pydantic import BaseModel
from typing import List

class DeckAnalysis(BaseModel):
    """Model for pitch deck analysis results."""
    topics: List[str]
    key_sentences: List[str]
    summary: str
