from app.core.indexer.embedder import CodeEmbedder

embedder = CodeEmbedder()

text = """
Function: process_payment

Source:
def process_payment():
    validate()
    charge_card()
"""

embedding = embedder.embed_text(text)

print(embedding.shape)