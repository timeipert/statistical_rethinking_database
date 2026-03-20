import json
import os
from sentence_transformers import SentenceTransformer

def build_embeddings():
    corpus_path = 'search_corpus.json'
    if not os.path.exists(corpus_path):
        print("search_corpus.json not found!")
        return

    with open(corpus_path, 'r', encoding='utf-8') as f:
        corpus = json.load(f)

    # Use the EXACT model that Transformers.js will use in the browser
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    texts = [item['text'] for item in corpus]
    print(f"Computing embeddings for {len(texts)} chunks...")
    
    # Compute embeddings (normalized for cosine similarity dot-product)
    embeddings = model.encode(texts, show_progress_bar=True, convert_to_numpy=True, normalize_embeddings=True)
    
    # Save as JSON array of floats (rounded to save space)
    embeddings_list = [[round(float(val), 5) for val in row] for row in embeddings]
    
    out_path = 'corpus_embeddings.json'
    with open(out_path, 'w') as f:
        json.dump(embeddings_list, f, separators=(',', ':'))
        
    print(f"Embeddings saved to {out_path}.")

if __name__ == '__main__':
    build_embeddings()
