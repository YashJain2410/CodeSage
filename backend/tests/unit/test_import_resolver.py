from app.core.parser.import_resolver import ImportResolver

resolver = ImportResolver(".")

code = """
from payments.validators import validate_card
import os
"""

namespace = {
    "validate_card":
    "payments.validators.py::validate_card"
}

all_units = {
    "payments/validators.py::validate_card"
}

print(
    resolver.resolve_call(
        "validate_card",
        namespace,
        all_units
    )
)