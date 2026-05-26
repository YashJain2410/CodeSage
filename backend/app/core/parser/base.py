from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional, Literal
from abc import ABC, abstractmethod

@dataclass
class CodeUnit:
    id: str                      # unique id → filepath::function_name
    name: str                    # function name
    qualified_name: str          # full name (with class if needed)

    filepath: str
    start_line: int
    end_line: int

    source: str                  # actual code
    node_type: Literal["function", "class", "method"]
    
    is_test: bool

    docstring: Optional[str] = None

    calls: List[str] = field(default_factory = list)        # functions it calls
    decorators: List[str] = field(default_factory=list)

    parent_class: Optional[str] = None


class CodeParser(ABC):

    @abstractmethod
    def parse(self, source: str, filepath: str) -> List[CodeUnit]:
        """
        Parse source code and return list of CodeUnits
        """
        pass