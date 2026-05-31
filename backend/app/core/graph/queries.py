import networkx as nx

class GraphQueries:

    def __init__(self, G: nx.MultiDiGraph):
        self.G = G

    def get_callers(self, func_id: str):
        return list(self.G.predecessors(func_id))
    
    def get_callees(self, func_id: str):
        return list(self.G.successors(func_id))
    
    def get_neighbors(self, func_id: str):
        callers = self.get_callers(func_id)
        callees = self.get_callees(func_id)

        return callers + callees
    
    def get_uncovered_functions(self):
        uncovered = []

        for node in self.G.nodes:

            data = self.G.nodes[node]

            if data.get("is_test"):
                continue

            tested = False

            for pred in self.G.predecessors(node):
                edge_dict = self.G.get_edge_data(pred, node)

                for _, edge_data in edge_dict.items():

                    if edge_data.get("edge_type") == "tests":
                        tested = True
                        break

            if not tested:
                uncovered.append(node)

        return uncovered