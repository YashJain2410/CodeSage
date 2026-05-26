from typing import Dict, Optional
from tree_sitter import Parser, Language
from tree_sitter_python import language as python_language

class ImportResolver:

    def __init__(self, repo_root: str):
        self.repo_root = repo_root
        self.parser = Parser()
        self.parser.language = Language(python_language())

    def build_namespace(self, filepath: str, source: str) -> Dict[str, str]:
        """
        Build mapping:
        local_name -> resolved_path
        """

        tree = self.parser.parse(bytes(source, "utf8"))
        root = tree.root_node

        namespace = {}

        for node in root.children: 
            
            if node.type == "import_from_statement":

                module_node = node.child_by_field_name("module_name")
                name_node = node.child_by_field_name("name")

                if module_node and name_node:
                    module = source[
                        module_node.start_byte : module_node.end_byte
                    ]

                    name = source[
                        name_node.start_byte : name_node.end_byte
                    ]

                    namespace[name] = f"{module}.py::{name}"

            elif node.type == "import_statement":
                text = source[node.start_byte : node.end_byte]
                parts = text.replace("import", "").strip()
                namespace[parts] = f"stdlib:{parts}"

        return namespace
    
    def resolve_call(self, call_name: str, namespace: Dict[str, str], all_unit_ids: set[str]) -> Optional[str]:

        if call_name in namespace:
            resolved = namespace[call_name]

            for unit_id in all_unit_ids:
                if unit_id.endswith(f"::{call_name}"):
                    return unit_id
                
            return resolved
        
        for unit_id in all_unit_ids:
            if unit_id.endswith(f"::{call_name}"):
                return unit_id

        return None

    def debug_node(node, source, indent=0):
        print("  " * indent, node.type)

        for child in node.children:
            debug_node(child, source, indent + 1)

