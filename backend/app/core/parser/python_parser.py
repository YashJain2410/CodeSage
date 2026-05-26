from __future__ import annotations

from typing import Generator, List, Optional

from tree_sitter import Language, Node, Parser
from tree_sitter_python import language as python_language

from app.core.parser.base import CodeParser, CodeUnit


def _walk(node : Node) -> Generator[Node, None, None]:
    """Depth-first traversal of a tree sitter node tree"""

    yield node

    for child in node.children:
        yield from _walk(child)


def _extract_docstring(node: Node, source: str) -> Optional[str]:
    """
    Return the raw docstring text if the first statement in the body is a string literal, otherwise None. 
    """

    for child in node.children:
        if child.type == "block":
            # Skip blank / comment children to find the first real statement
            for stmt in child.children:
                if stmt.type == "expression_statement" and stmt.children:
                    first = stmt.children[0]
                    if first.type == "string":
                        return source[first.start_byte : first.end_byte]
                    
                    return None
    return None


def _get_decorators(node: Node, source: str) -> List[str]:
    """
    tree-sitter wraps decorated definitions like this:
 
        decorated_definition
            decorator       ← @app.route("/")
            function_definition / class_definition
 
    So decorators are siblings of `node` inside a `decorated_definition`
    parent — NOT children of the function/class node itself.
    This function handles both cases (decorated and plain).
    """
    parent = node.parent
    if parent is not None and parent.type == "decorated_definition":
        return [
            source[child.start_byte : child.end_byte]
            for child in parent.children
            if child.type == "decorator"
        ]
    return []


def _extract_calls(node: Node, source: str) -> List[str]:
    """
    Recursively collect every function call expression inside node.
    Returns the text of the callee (e.g. "print",  "os.path.join").
    """

    calls: List[str] = []

    def walk(n: Node):
        # Skip nested scopes
        if n != node and n.type in {
            "function_definition",
            "class_definition",
        }:
            return

        if n.type == "call":
            func_node = n.child_by_field_name("function")
            if func_node:
                calls.append(
                    source[func_node.start_byte : func_node.end_byte]
                )

        for child in n.children:
            walk(child)
    
    walk(node)
    return calls


def _is_test(name: str, decorators: List[str]) -> bool:
    if name.startswith("test_"):
        return True
    
    return any("pytest.mark" in d for d in decorators)


class PythonParser(CodeParser):

    def __init__(self) -> None:
        self._parser = Parser()
        self._parser.language = Language(python_language())

    def parse(self, source: str, filepath: str) -> List[CodeUnit]:
        tree = self._parser.parse(bytes(source, "utf-8"))
        root = tree.root_node

        code_units: List[CodeUnit] = []

        method_nodes: set[int] = set()

        # Pass 1 : Classes and their methods
        for node in _walk(root):
            if node.type != "class_definition":
                continue

            class_name_node = node.child_by_field_name("name")
            if class_name_node is None:
                continue

            class_name = source[class_name_node.start_byte : class_name_node.end_byte]

            decorators = _get_decorators(node, source)

            code_units.append(CodeUnit(
                id=f"{filepath}::{class_name}",
                name=class_name,
                qualified_name=class_name,
                filepath=filepath,
                start_line=node.start_point[0] + 1,
                end_line=node.end_point[0] + 1,
                source=source[node.start_byte:node.end_byte],
                docstring=_extract_docstring(node, source),
                calls=[],
                decorators=decorators,
                is_test=_is_test(class_name, decorators),
                node_type="class",
            ))

            # Emit each method
            for child in node.children:
                if child.type != "block":
                    continue

                for sub in child.children:
                    if sub.type == "decorated_definition":
                        fn_node = next(
                            (c for c in sub.children if c.type == "function_definition"),
                            None,
                        )
                    elif sub.type == "function_definition":
                        fn_node = sub
                    else:
                        continue

                    if fn_node is None:
                        continue

                    method_nodes.add(fn_node.id)
                    method_name_node = fn_node.child_by_field_name("name")

                    if method_name_node is None:
                        continue

                    method_name = source[method_name_node.start_byte : method_name_node.end_byte]
                    qualified_name = f"{class_name}.{method_name}"

                    decorators = _get_decorators(fn_node, source)
                    code_units.append(CodeUnit(
                        id=f"{filepath}::{qualified_name}",
                        name=method_name,
                        qualified_name=qualified_name,
                        filepath=filepath,
                        start_line=fn_node.start_point[0] + 1,
                        end_line=fn_node.end_point[0] + 1,
                        source=source[fn_node.start_byte:fn_node.end_byte],
                        docstring=_extract_docstring(fn_node, source),
                        calls=_extract_calls(fn_node, source),
                        decorators=decorators,
                        is_test=_is_test(method_name, decorators),
                        node_type="method",
                        parent_class=class_name,
                    ))
        
        # Pass 2 - Top level functions (not methods)
        for node in _walk(root):
            if node.type != "function_definition":
                continue

            parent = node.parent
            if parent and parent.type == "block":
                grandparent = parent.parent

                if grandparent and grandparent.type == "function_definition":
                    continue

            if node.id in method_nodes:
                continue

            name_node = node.child_by_field_name("name")
            if name_node is None:
                continue

            name = source[name_node.start_byte : name_node.end_byte]

            decorators = _get_decorators(node, source)
            code_units.append(CodeUnit(
                id=f"{filepath}::{name}",
                name=name,
                qualified_name=name,
                filepath=filepath,
                start_line=node.start_point[0] + 1,
                end_line=node.end_point[0] + 1,
                source=source[node.start_byte:node.end_byte],
                docstring=_extract_docstring(node, source),
                calls=_extract_calls(node, source),
                decorators=decorators,
                is_test=_is_test(name, decorators),
                node_type="function",
            ))

        return code_units
