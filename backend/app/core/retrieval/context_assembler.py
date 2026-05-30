class ContextAssembler:

    def __init__(self, max_tokens = 12000):

        self.max_tokens = max_tokens


    def estimate_tokens(self, text):

        return int(len(text.split()) * 1.3)
    

    def build_block(self, node_data):

        source = (node_data.get("source") or "")
        return f"""
Function:
{node_data.get('qualified_name')}

File:
{node_data.get('filepath')}

Docstring:
{node_data.get('docstring')}

Source:
{source[:2000]}
"""
    

    def assemble(self, ranked_nodes, graph):

        blocks = []
        total_tokens = 0

        for func_id, score in ranked_nodes:

            if func_id not in graph.nodes:
                continue

            node_data = graph.nodes[func_id]

            block = self.build_block(node_data)
            tokens = self.estimate_tokens(block)

            if( total_tokens + tokens > self.max_tokens ):
                break

            blocks.append(block)

            total_tokens += tokens
        
        return "\n\n".join(blocks)