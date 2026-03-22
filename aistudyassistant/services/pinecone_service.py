import os
from pinecone import Pinecone, ServerlessSpec
from sentence_transformers import SentenceTransformer

class PineconeService:
    def __init__(self):
        api_key = os.getenv("PINECONE_API_KEY")
        
        if not api_key:
            raise ValueError("PINECONE_API_KEY not set")
        
        self.pc = Pinecone(api_key=api_key)
        self.index_name = "studybuddy-notes"
        
        # Connect to existing index
        self.index = self.pc.Index(self.index_name)
        
        # Load lightweight embedding model (384 dimensions)
        # Note: Your Pinecone index is 1536 dimensions, so we need to use a model that matches
        # For now, we'll use a smaller model and pad or use OpenAI embeddings later
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def _pad_embedding(self, embedding):
        """Pad embedding to 1536 dimensions to match Pinecone index"""
        current_dim = len(embedding)
        target_dim = 1536
        
        if current_dim < target_dim:
            # Pad with zeros
            padding = [0.0] * (target_dim - current_dim)
            return embedding + padding
        else:
            # Truncate if somehow larger
            return embedding[:target_dim]
    
    def add_note(self, note_id, content, metadata):
        """Add note to Pinecone for semantic search"""
        try:
            # Generate embedding
            embedding = self.model.encode(content).tolist()
            
            # Pad to 1536 dimensions
            embedding = self._pad_embedding(embedding)
            
            # Upsert to Pinecone
            self.index.upsert(vectors=[{
                "id": str(note_id),
                "values": embedding,
                "metadata": metadata
            }])
            
            print(f"Added note {note_id} to Pinecone")
            return True
        except Exception as e:
            print(f"Pinecone add error: {e}")
            return False
    
    def search_notes(self, query, user_id, top_k=5):
        """Search notes semantically"""
        try:
            # Generate query embedding
            query_embedding = self.model.encode(query).tolist()
            
            # Pad to 1536 dimensions
            query_embedding = self._pad_embedding(query_embedding)
            
            # Search Pinecone
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                filter={"user_id": str(user_id)},
                include_metadata=True
            )
            
            print(f"Pinecone search returned {len(results.matches)} results")
            return results.matches
        except Exception as e:
            print(f"Pinecone search error: {e}")
            return []
    
    def delete_note(self, note_id):
        """Delete note from Pinecone"""
        try:
            self.index.delete(ids=[str(note_id)])
            print(f"Deleted note {note_id} from Pinecone")
            return True
        except Exception as e:
            print(f"Pinecone delete error: {e}")
            return False