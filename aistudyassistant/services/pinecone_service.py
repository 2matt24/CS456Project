import os
import google.generativeai as genai
from pinecone import Pinecone


class PineconeService:
    def __init__(self):
        pinecone_api_key = os.getenv("PINECONE_API_KEY")
        gemini_api_key   = os.getenv("GEMINI_API_KEY")

        if not pinecone_api_key:
            raise ValueError("PINECONE_API_KEY not set")

        if not gemini_api_key:
            raise ValueError("GEMINI_API_KEY not set")

        genai.configure(api_key=gemini_api_key)

        self.pc         = Pinecone(api_key=pinecone_api_key)
        self.index_name = "studybuddy-notes"
        self.index      = self.pc.Index(self.index_name)

    def _get_embedding(self, text: str):
        """Generate embedding using Gemini text-embedding-004 (768 dims)."""
        try:
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document",
            )
            return result["embedding"]
        except Exception as e:
            print(f"Gemini embedding error: {e}")
            return None

    def add_note(self, note_id, content, metadata):
        """Add note to Pinecone for semantic search."""
        try:
            embedding = self._get_embedding(content)
            if embedding is None:
                return False

            self.index.upsert(vectors=[{
                "id":       str(note_id),
                "values":   embedding,
                "metadata": metadata,
            }])
            print(f"Added note {note_id} to Pinecone")
            return True
        except Exception as e:
            print(f"Pinecone add error: {e}")
            return False

    def search_notes(self, query, user_id, top_k=5):
        """Search notes semantically."""
        try:
            query_embedding = self._get_embedding(query)
            if query_embedding is None:
                return []

            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                filter={"user_id": str(user_id)},
                include_metadata=True,
            )
            print(f"Pinecone search returned {len(results.matches)} results")
            return results.matches
        except Exception as e:
            print(f"Pinecone search error: {e}")
            return []

    def delete_note(self, note_id):
        """Delete note from Pinecone."""
        try:
            self.index.delete(ids=[str(note_id)])
            print(f"Deleted note {note_id} from Pinecone")
            return True
        except Exception as e:
            print(f"Pinecone delete error: {e}")
            return False
