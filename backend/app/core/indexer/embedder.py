from sentence_transformers import SentenceTransformer
from diskcache import Cache
import hashlib

class CodeEmbedder:

    def __init__(self, model_name = "microsoft/unixcoder-base"):
        print("Loading embedding model...")
        self.model = SentenceTransformer(model_name)
        print("Model loaded.")
        self.cache = Cache(".embedding_cache")

    def build_text_representation(self, unit, callers = None, callees = None):

        callers = callers or []
        callees = callees or []

        text = f"""
Function: {unit.name}

File: {unit.filepath}

Docstring:
{unit.docstring}

Called By:
{", ".join(callers[:5])}

Calls:
{", ".join(callees[:5])}

Source:
{unit.source[:1000]}
"""
                
        return text.strip()
    

    def embed_text(self, text: str):

        embedding = self.model.encode(
            text,
            normalize_embeddings = True
        )

        return embedding
    
    
    def embed_batch(self, texts, batch_size=32):

        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=True,
            normalize_embeddings=True
        )

        return embeddings
    

    def make_cache_key(self, unit_id, source):

        content = unit_id + source

        return hashlib.sha256(
            content.encode()
        ).hexdigest()
    

    def embed_with_cache(self, unit, text):

        key = self.make_cache_key(unit.id, unit.source)

        if key in self.cache:
            return self.cache[key]
        
        embedding = self.embed_text(text)

        self.cache[key] = embedding

        return embedding