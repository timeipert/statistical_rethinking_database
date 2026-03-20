import json
import os
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer, ENGLISH_STOP_WORDS
from sentence_transformers import SentenceTransformer

# Highly curated list of core statistical concepts
CONCEPTS = [
    "Bayesian Inference", "Prior Probability", "Posterior Distribution", "Likelihood", 
    "Markov Chain Monte Carlo", "Hamiltonian Monte Carlo", "DAG", "Causal Inference",
    "Collider Bias", "Confounding", "Overfitting", "Underfitting", "Regularization",
    "Information Criteria", "WAIC", "LOO", "Multilevel Model", "Hierarchical Model",
    "Partial Pooling", "Varying Effects", "Missing Data",
    "Gaussian Distribution", "Binomial Distribution", "Poisson Distribution",
    "Logit Link", "Exponential Regression", "Categorical Variables", "Interactions",
    "Simpson's Paradox", "Instrumental Variables", "Spatial Models", "Gaussian Process",
    "Maximum Entropy", "Generalized Linear Model", "Splines", "Scientific Models",
    "Measurement Error", "Measurement Theory"
]

def generate_hybrid_glossary():
    db_path = 'database.json'
    if not os.path.exists(db_path):
        return

    with open(db_path, 'r', encoding='utf-8') as f:
        database = json.load(f)

    # 1. THEMATIC (TF-IDF) EXTRACTION
    documents = []
    for video in database:
        documents.append(" ".join([sub['text'] for sub in video.get('subs', [])]))

    custom_stops = [
        "so", "um", "uh", "like", "you", "know", "just", "we", "re", "can", "if", "then", "there", 
        "here", "very", "much", "well", "think", "see", "say", "one", "two", "three", "first", "second",
        "going", "gonna", "want", "let", "us", "look", "what", "how", "why", "where", "who", "which",
        "would", "could", "should", "make", "take", "get", "got", "way", "thing", "things", "time", "right",
        "yeah", "yes", "no", "ok", "okay", "stuff", "kind", "sort", "really", "maybe", "probably",
        "mean", "actually", "basically", "literally", "course", "video", "lecture", "chapter", "book",
        "example", "examples", "case", "cases", "point", "part", "people", "person", "lot", "little",
        "bit", "don", "didn", "doesn", "isn", "aren", "wasn", "weren", "ll", "ve", "that", "this", "these",
        "those", "they", "them", "their", "he", "she", "it", "his", "hers", "its", "our", "ours", "my", "mine",
        "model", "models", "data", "parameter", "parameters", "probability", "distribution", "value", "values",
        "variable", "variables", "estimate", "estimates", "question", "questions", "answer", "answers"
    ]
    all_stops = list(ENGLISH_STOP_WORDS) + custom_stops

    # Only single words to prevent "water" and "blue water" duplicates
    vectorizer = TfidfVectorizer(
        stop_words=all_stops,
        ngram_range=(1, 1), 
        min_df=1,
        max_df=0.25, # Strict global penalty (ignore words in >5 videos)
        max_features=2000,
        token_pattern=r'\b[a-zA-Z]{4,}\b' # 4+ letter words only
    )
    X = vectorizer.fit_transform(documents)
    feature_names = vectorizer.get_feature_names_out()

    tf_idf_terms = []
    for i in range(len(database)):
        row = X[i].toarray()[0]
        # Get top 3 thematic distinct words
        top_indices = row.argsort()[-3:][::-1] 
        video_terms = [feature_names[idx].title() for idx in top_indices if row[idx] > 0]
        tf_idf_terms.append(video_terms)

    # 2. STATISTICAL (WASM SEMANTIC) EXTRACTION
    print("Loading AI Model for Statistical Assignments...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    concept_embeddings = model.encode(CONCEPTS, normalize_embeddings=True)

    glossary_timeline = []
    for i, video in enumerate(database):
        print(f"Assigning semantic tags to: {video['title']}")
        subs = video.get('subs', [])
        if not subs:
            continue
            
        full_text = " ".join([s['text'] for s in subs])
        words = full_text.split()
        chunk_size = 300
        video_chunks = [" ".join(words[j:j+chunk_size]) for j in range(0, len(words), chunk_size)]
        if not video_chunks:
            video_chunks = [full_text]
        
        chunk_embeddings = model.encode(video_chunks, normalize_embeddings=True)
        sim_matrix = np.dot(concept_embeddings, chunk_embeddings.T)
        best_sim_per_concept = np.max(sim_matrix, axis=1) # Max sim of a concept to ANY chunk
        
        # Take deeply significant statistical terms (top 4)
        top_stat_indices = best_sim_per_concept.argsort()[-4:][::-1]
        stat_terms = [CONCEPTS[idx] for idx in top_stat_indices]
        
        # Combine Statistical (Mathematical) + Thematic (TF-IDF)
        combined_terms = stat_terms + tf_idf_terms[i]
        
        glossary_timeline.append({
            "video_id": video.get('id'),
            "video_title": video.get('title'),
            "playlist": video.get('playlist'),
            "terms": combined_terms
        })

    out_path = 'glossary.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(glossary_timeline, f, indent=2, ensure_ascii=False)
        
    print(f"Generated HYBRID (Semantic + Thematic) mapping to {out_path}.")

if __name__ == '__main__':
    generate_hybrid_glossary()
