import os
import json
import re

def hms_to_seconds(time_str):
    # time_str could be like 00:01:23.450
    parts = time_str.split(':')
    if len(parts) == 3:
        h, m, s = parts
    elif len(parts) == 2:
        h = '0'
        m, s = parts
    else:
        return 0.0
    
    return int(h) * 3600 + int(m) * 60 + float(s)

def parse_vtt(filepath):
    subs = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return []
        
    # Split by double newline to get blocks
    blocks = content.split('\n\n')
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 2: continue
        
        # Look for the line that has '-->'
        time_line_index = -1
        for i, line in enumerate(lines):
            if '-->' in line:
                time_line_index = i
                break
                
        if time_line_index == -1: continue
        
        time_line = lines[time_line_index]
        text_lines = lines[time_line_index+1:]
        
        if not text_lines: continue
        
        # Parse times
        times = time_line.split('-->')
        if len(times) != 2: continue
        
        start_str = times[0].strip()
        end_str = times[1].strip()
        
        start_sec = hms_to_seconds(start_str)
        end_sec = hms_to_seconds(end_str)
        
        # Clean text
        text = " ".join(text_lines)
        # Remove formatting tags like <c.colorE5E5E5> or tags <00:00:01.000>
        text = re.sub(r'<[^>]+>', '', text)
        text = text.replace('\n', ' ').strip()
        
        if not text: continue
        
        subs.append({
            "start": round(start_sec, 2),
            "end": round(end_sec, 2),
            "text": text
        })
        
    return subs

def build_database():
    raw_dir = 'raw_data'
    if not os.path.exists(raw_dir):
        print("raw_data directory not found.")
        return
        
    # Find all info json files
    info_files = [f for f in os.listdir(raw_dir) if f.endswith('.info.json')]
    
    database = []
    
    for info_file in sorted(info_files):
        base_name = info_file[:-10] # remove .info.json
        info_path = os.path.join(raw_dir, info_file)
        
        # Finding the subtitle file. It could be base_name.en.vtt or just base_name.vtt or base_name.en-orig.vtt
        # Auto-subs sometimes do .en.vtt
        vtt_path = None
        for ext in ['.en.vtt', '.en-orig.vtt', '.vtt']:
            candidate = os.path.join(raw_dir, base_name + ext)
            if os.path.exists(candidate):
                vtt_path = candidate
                break
                
        if not vtt_path:
            print(f"No VTT found for {info_file}")
            continue
            
        with open(info_path, 'r', encoding='utf-8') as f:
            try:
                info = json.load(f)
            except Exception as e:
                print(f"Error parsing {info_file}: {e}")
                continue
                
        video_id = info.get('id')
        title = info.get('title')
        playlist = info.get('playlist_title', 'Unknown Playlist')
        if not playlist or playlist == 'Unknown Playlist':
            # Guess from filename prefix if we customized it
            if '2022' in base_name: playlist = 'Statistical Rethinking 2022'
            elif '2023' in base_name: playlist = 'Statistical Rethinking 2023'
        
        subs = parse_vtt(vtt_path)
        
        if not subs:
            print(f"Warning: No subtitles parsed for {title}")
            continue
            
        database.append({
            "id": video_id,
            "title": title,
            "playlist": playlist,
            "subs": subs
        })
        print(f"Processed: {title} ({len(subs)} segments)")
        
    output_path = 'database.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(database, f, indent=2, ensure_ascii=False)
        
    print(f"Database built successfully. Total videos: {len(database)}")

if __name__ == '__main__':
    build_database()
