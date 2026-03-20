# Statistical Rethinking - Semantic Course Search 🦉

Some AI Experiment from that could be helpful. See [Richard McElreath's Youtube Page](https://www.youtube.com/@rmcelreath) for the actual lectures.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-success?style=for-the-badge)](https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPOSITORY_NAME/docs)

A entirely offline **Retrieval-Augmented Generation (RAG)** search engine and digital register for Richard McElreath's brilliant *Statistical Rethinking* courses (2026). 

This tool allows you to search across 20 hours of dense lectures and instantly locate highly specific concepts, formulas, or thematic examples (e.g. *Collider Bias*, *MCMC*, or *Waffle House*). The application runs entirely in your browser using **WebAssembly (WASM)**, requiring zero servers or backend infrastructure.

---

### ✨ Core Features

1. **WebAssembly Semantic RAG Search**
   - The frontend loads a native Neural Network (`all-MiniLM-L6-v2`) via HuggingFace's Transformers.js directly into the browser. 
   - When you search for a concept, it mathematically embeds your query and performs a lightning-fast Cosine Similarity matrix calculation against thousands of pre-computed 15-second vectors from the course subtitle transcripts.
   
2. **Global Density Timeline**
   - Above your detailed search results is a chronological heatmap sparkline of the entire 20-video course. 
   - It visually graphs exactly *where* and *when* concepts gather or cluster throughout the lectures, and clicking a graph segment smooth-scrolls you directly to that lecture's embedded video.

3. **Hybrid AI Glossary Engine**
   - Features a meticulously generated concept registry for every video.
   - Built using a hybrid extraction algorithm: 
     - **SentenceTransformers** identify the top core statistical and mathematical structures governing the video.
     - **Strict TF-IDF Extraction** (with devastating cross-document frequency penalties) isolates the distinct, newly-learned thematic nouns (e.g. *foxes*, *golems*).

4. **Fuzzy String Fallback**
   - An exact-match fallback engine powered by `Fuse.js` handles typos gracefully (e.g. "distribushion" naturally finds "distribution").

---

### 🚀 Running Locally

Because the architecture requires zero backend, you can run the entire semantic engine purely from a local static file server!

1. Clone the repository.
2. Navigate to the root folder:
   ```bash
   cd mcelreath
   ```
3. Start a basic HTTP server:
   ```bash
   python3 -m http.server 8000
   ```
4. Open `http://localhost:8000/docs/` in your browser.

---

### 🌐 Deploying to GitHub Pages

This tool is designed to be hosted for free on GitHub Pages!

1. Push this repository to GitHub.
2. Go to **Settings** > **Pages**.
3. Under "Build and deployment", set the source to **Deploy from a branch**.
4. Select the `main` branch, and change the folder dropdown to **`/docs`**.
5. Save, and within a few minutes, your RAG engine will be live globally! Just update the badge at the top of this README with your link.

---

### 🛠️ The Python Data Pipeline

The `/data_pipeline` directory contains the tools used to synthesize the massive mathematical corpora that power the website:
- `download_subs.py`: Pulls WebVTT transcripts using `yt-dlp`.
- `build_database.py`: Structures the raw subtitle timestamps into monolithic JSON arrays.
- `build_chunks.py`: Densely packs raw text into overlapping 15-second contextual blocks.
- `build_embeddings.py`: Generates the massive `sentence-transformers` vector matrix mapping.
- `generate_nlp_glossary.py`: The Hybrid TF-IDF + Zero-Shot AI script that calibrates the sidebar UI tags.

---

### 📝 Credits & Impressum

- **Concept & Lecture Data:** Professor Richard McElreath
- **Engineering & ML Infrastructure:** Gemini AI & Antigravity Assistant
