from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams
)
from qdrant_client.models import PointStruct

from qdrant_client.models import (
    Filter,
    FieldCondition,
    MatchValue
)

from qdrant_client.models import ( FilterSelector )

import hashlib

class QdrantCodeStore:

    def __init__(
        self,
        url="http://localhost:6333",
        collection_name="codesage"
    ):

        if url == ":memory:":

            self.client = QdrantClient(
                location=":memory:"
            )

        else:

            self.client = QdrantClient(
                url=url
            )

        self.collection_name = collection_name

    def ensure_collection(self):

        collections = self.client.get_collections()

        existing = [
            c.name
            for c in collections.collections
        ]

        if self.collection_name in existing:
            print("Collection already exists")
            return
        
        self.client.create_collection(
            collection_name=self.collection_name,

            vectors_config=VectorParams(
                size = 768,
                distance = Distance.COSINE
            )
        )

        print("Collection created")

    
    def upsert_units(self, units, embeddings):

        points = []

        for idx, (unit, embedding) in enumerate(
            zip(units, embeddings)
        ):
            
            payload = {
                "func_id": unit.id,
                "name": unit.name,
                "qualified_name": unit.qualified_name,

                "filepath": unit.filepath,

                "start_line": unit.start_line,
                "end_line": unit.end_line,

                "node_type": unit.node_type,

                "is_test": unit.is_test,

                "source": unit.source[:1000],

                "docstring": unit.docstring,
            }

            stable_id = int(
                hashlib.md5(unit.id.encode()).hexdigest(),
                16
            ) % (10**12)

            points.append(
                PointStruct(
                    id = stable_id,

                    vector = embedding.tolist(),

                    payload = payload
                )
            )

        self.client.upsert(
            collection_name = self.collection_name,
            points = points
        )

        print(f"Inserted {len(points)} vectors")


    def search(self, query_embedding, top_k = 5, filepath = None, is_test = None):

        conditions = []

        if filepath:

            conditions.append(
                FieldCondition(
                    key = "filepath",

                    match = MatchValue(
                        value = filepath
                    )
                )
            )

        if is_test is not None:

            conditions.append(
                FieldCondition(
                    key = "is_test",

                    match = MatchValue(
                        value = is_test
                    )
                )
            )

        query_filter = None

        if conditions:
            query_filter = Filter(
                must = conditions
            )
        
        results = self.client.query_points(
            collection_name = self.collection_name,

            query = query_embedding.tolist(),

            query_filter = query_filter,

            limit = top_k
        )

        return results.points
    

    def delete_by_filepath(self, filepath):

        self.client.delete(
            collection_name = self.collection_name,

            points_selector = FilterSelector(
                filter = Filter(
                    must = [
                        FieldCondition(
                            key = "filepath",

                            match = MatchValue(
                                value = filepath
                            )
                        )
                    ]
                )
            )
        )

        print("Deleted vectors")