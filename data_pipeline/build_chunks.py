import json
import os

def build_chunks():
    db_path = 'database.json'
    if not os.path.exists(db_path):
        print("database.json not found!")
        return

    with open(db_path, 'r', encoding='utf-8') as f:
        database = json.load(f)

    corpus = []
    chunk_duration = 15 # 15-second blocks for high-precision semantic RAG

    for video in database:
        video_id = video['id']
        video_title = video['title']
        playlist = video['playlist']
        subs = video.get('subs', [])
        
        if not subs:
            continue
            
        current_chunk_text = []
        current_chunk_start = subs[0]['start']
        
        for sub in subs:
            # If we cross a 60-second boundary, save the chunk and start a new one
            if sub['start'] - current_chunk_start >= chunk_duration:
                if current_chunk_text:
                    corpus.append({
                        'videoId': video_id,
                        'videoTitle': video_title,
                        'playlist': playlist,
                        'start': current_chunk_start,
                        'text': " ".join(current_chunk_text)
                    })
                current_chunk_start = sub['start']
                current_chunk_text = [sub['text']]
            else:
                current_chunk_text.append(sub['text'])
                
        # Append the final chunk
        if current_chunk_text:
            corpus.append({
                'videoId': video_id,
                'videoTitle': video_title,
                'playlist': playlist,
                'start': current_chunk_start,
                'text': " ".join(current_chunk_text)
            })

    output_path = 'search_corpus.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(corpus, f, indent=2, ensure_ascii=False)
        
    print(f"Created RAG search corpus with {len(corpus)} aggregated text blocks (1 min intervals).")

if __name__ == '__main__':
    build_chunks()
