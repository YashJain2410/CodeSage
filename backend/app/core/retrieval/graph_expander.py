from collections import deque

import networkx as nx

from app.core.retrieval.intent import QueryIntent
from app.observability.metrics import GRAPH_EXPANSION_SIZE


class GraphExpander:

    def __init__(self, graph: nx.MultiDiGraph):
        self.graph = graph


    def expand_explain(self, func_id: str):

        expanded = {func_id}
        expanded.update(self.graph.predecessors(func_id))
        expanded.update(self.graph.successors(func_id))

        return expanded
    

    def expand_bug(
            self,
            func_id: str,
            depth: int = 2
    ):
        visited = {func_id}

        queue = deque([(func_id, 0)])

        while queue:

            node, level = queue.popleft()

            if level >= depth:
                continue

            neighbors = (
                list(self.graph.predecessors(node)) + list(self.graph.successors(node))
            )

            for neighbor in neighbors:

                if neighbor in visited:
                    continue

                visited.add(neighbor)

                queue.append(
                    (
                        neighbor,
                        level + 1
                    )
                )

        return visited
        

    def expand_impact(self, func_id: str):

        expanded = {func_id}
        stack = [func_id]

        while stack:

            node = stack.pop()

            for caller in self.graph.predecessors(node):

                if caller in expanded:
                    continue

                expanded.add(caller)
                stack.append(caller)

        return expanded
    

    def expand_test(self, func_id: str):

        expanded = {func_id}

        for pred in self.graph.predecessors(func_id):

            edge_data = self.graph.get_edge_data(pred, func_id)

            if edge_data:

                for edge in edge_data.values():

                    if edge.get("edge_type") == "tests":
                        expanded.add(pred)
                        break

        return expanded


    def expand_onboard(self, func_id: str):

        return self.expand_bug(func_id, depth=3)
    

    def expand(self, func_id: str, intent: QueryIntent):

        if intent == QueryIntent.BUG:
            return self.expand_bug(func_id)

        if intent == QueryIntent.IMPACT:
            return self.expand_impact(func_id)

        if intent == QueryIntent.TEST:
            return self.expand_test(func_id)

        if intent == QueryIntent.ONBOARD:
            return self.expand_onboard(func_id)
        
        expanded = self.expand_explain(func_id)
        
        GRAPH_EXPANSION_SIZE.observe(
            len(expanded)
        )

        return expanded