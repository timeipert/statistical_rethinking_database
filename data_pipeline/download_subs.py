import subprocess
import os

PLAYLISTS = {
    "2022_Course": "https://www.youtube.com/watch?v=ztbYkBPDOgU&list=PLDcUM9US4XdPMtSV81e1R_4B6NugQBvTP",
    "2023_Course": "https://www.youtube.com/watch?v=jh3RltVrQ-Q&list=PLDcUM9US4XdMD5hEU5uinyBYFFPXMYBfn"
}

def download_playlist(name, url):
    print(f"Downloading metadata and subtitles for {name}...")
    
    # We use playlist_id as a prefix to avoid collisions.
    # --write-info-json: gets the video metadata
    # --write-auto-subs --write-subs: gets both auto and manual subtitles
    # --sub-langs en: only english
    # --sub-format vtt: standard format we can parse
    # --skip-download: ignore the actual video file
    cmd = [
        "yt-dlp",
        "--write-info-json",
        "--write-auto-subs",
        "--write-subs",
        "--sub-langs", "en",
        "--sub-format", "vtt",
        "--skip-download",
        "-o", f"raw_data/{name}_%(playlist_index)02d_%(id)s.%(ext)s",
        url
    ]
    
    # Run the command
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error downloading {name}:")
        print(result.stderr)
    else:
        print(f"Successfully downloaded {name}")
        # print(result.stdout)

if __name__ == "__main__":
    # Ensure raw_data directory exists
    os.makedirs("raw_data", exist_ok=True)
    
    for name, url in PLAYLISTS.items():
        download_playlist(name, url)
