import networkx as nx

class GraphQueries:

    def __init__(self, G: nx.DiGraph):
        self.G = G

    def get_callers(self, func_id: str):
        return list(self.G.predecessors(func_id))
    
    def get_callees(self, func_id: str):
        return list(self.G.successors(func_id))
    
    def get_neighbors(self, func_id: str):
        callers = self.get_callers(func_id)
        callees = self.get_callees(func_id)

        return callers + callees