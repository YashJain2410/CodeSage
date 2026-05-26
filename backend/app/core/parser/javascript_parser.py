from __future__ import annotations

from typing import Generator, List, Optional

from tree_sitter import Language, Node, Parser
from tree_sitter_javascript import language as javascript_language

from app.core.parser.base import CodeParser, CodeUnit


def _walk(node: Node) -> Generator[Node, None, None]:
    yield node

    for child in node.children:
        yield from _walk(child)


def _extract_jsdoc(node: Node, source: str) -> Optional[str]:
    """
    Extract nearest JSDoc comment immediately before node.
    """

    start = node.start_byte

    before = source[:start]

    lines = before.splitlines()

    collected = []

    in_jsdoc = False

    for line in reversed(lines):

        stripped = line.strip()

        if stripped.startswith("/**"):
            collected.append(line)
            in_jsdoc = True
            break

        if stripped.startswith("*") or stripped.startswith("*/"):
            collected.append(line)
            continue

        if stripped == "":
            continue

        break

    if not in_jsdoc:
        return None

    collected.reverse()

    return "\n".join(line.strip() for line in collected)


def _extract_calls(node: Node, source: str) -> List[str]:
    calls: List[str] = []

    def walk(n: Node):

        # Skip nested scopes
        if n != node and n.type in {
            "function_declaration",
            "method_definition",
            "class_declaration",
            "arrow_function",
            "function",
        }:
            return

        if n.type == "call_expression":
            func_node = n.child_by_field_name("function")

            if func_node:
                calls.append(
                    source[func_node.start_byte : func_node.end_byte]
                )

        for child in n.children:
            walk(child)

    walk(node)

    return calls


def _get_name(node: Node, source: str) -> Optional[str]:
    name_node = node.child_by_field_name("name")

    if name_node is None:
        return None

    return source[name_node.start_byte : name_node.end_byte]


def _is_test(name: str) -> bool:
    return (
        name.startswith("test")
        or name.endswith("test")
        or name.endswith("spec")
    )


class JavaScriptParser(CodeParser):

    def __init__(self) -> None:
        self._parser = Parser()
        self._parser.language = Language(javascript_language())


    def parse(self, source: str, filepath: str) -> List[CodeUnit]:

        tree = self._parser.parse(bytes(source, "utf-8"))

        root = tree.root_node

        code_units: List[CodeUnit] = []

        method_nodes: set[int] = set()


        # ==========================================
        # PASS 1 - Classes + Methods
        # ==========================================

        for node in _walk(root):

            if node.type != "class_declaration":
                continue

            class_name = _get_name(node, source)

            if class_name is None:
                continue

            code_units.append(
                CodeUnit(
                    id=f"{filepath}::{class_name}",
                    name=class_name,
                    qualified_name=class_name,
                    filepath=filepath,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    source=source[node.start_byte : node.end_byte],
                    node_type="class",
                    is_test=_is_test(class_name),
                    docstring=_extract_jsdoc(node, source),
                    calls=[],
                )
            )


            # Extract methods
            body = node.child_by_field_name("body")

            if body is None:
                continue

            for child in body.children:

                if child.type != "method_definition":
                    continue

                method_nodes.add(child.id)

                method_name = _get_name(child, source)

                if method_name is None:
                    continue

                qualified_name = f"{class_name}.{method_name}"

                code_units.append(
                    CodeUnit(
                        id=f"{filepath}::{qualified_name}",
                        name=method_name,
                        qualified_name=qualified_name,
                        filepath=filepath,
                        start_line=child.start_point[0] + 1,
                        end_line=child.end_point[0] + 1,
                        source=source[child.start_byte : child.end_byte],
                        node_type="method",
                        is_test=_is_test(method_name),
                        docstring=_extract_jsdoc(child, source),
                        calls=_extract_calls(child, source),
                        parent_class=class_name,
                    )
                )


        # ==========================================
        # PASS 2 - Top-level functions
        # ==========================================

        for node in _walk(root):

            if node.type != "function_declaration":
                continue


            # Skip nested functions
            parent = node.parent

            if parent and parent.type in {
                "statement_block",
                "class_body",
            }:
                grandparent = parent.parent

                if grandparent and grandparent.type in {
                    "function_declaration",
                    "method_definition",
                }:
                    continue


            if node.id in method_nodes:
                continue


            name = _get_name(node, source)

            if name is None:
                continue

            code_units.append(
                CodeUnit(
                    id=f"{filepath}::{name}",
                    name=name,
                    qualified_name=name,
                    filepath=filepath,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    source=source[node.start_byte : node.end_byte],
                    node_type="function",
                    is_test=_is_test(name),
                    docstring=_extract_jsdoc(node, source),
                    calls=_extract_calls(node, source),
                )
            )


        return code_units