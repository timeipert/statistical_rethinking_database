import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.16.1';

env.allowLocalModels = false;
env.useBrowserCache = true;

let database = [];
let glossary = [];
let currentSearchMatches = 0;
let fuse;
let savedSegments = JSON.parse(localStorage.getItem('savedSegments')) || [];

// RAG variables
let ragCorpus = [];
let corpusEmbeddings = [];
let embedder = null;
let currentPlaylistFilter = 'all';

// DOM Elements
const globalSearchInput = document.getElementById('global-search');
const openSavedBtn = document.getElementById('open-saved-btn');
const courseOverviewSection = document.getElementById('course-overview');
const overviewGrid = document.getElementById('overview-grid');
const resultsLayout = document.getElementById('results-layout');
const resultsList = document.getElementById('results-list');
const searchStats = document.getElementById('search-stats');
const densityMapContainer = document.getElementById('density-map-container');
const mainVideoSection = document.getElementById('main-video-section');
const videoPlayer = document.getElementById('youtube-player');
const currentVideoTitle = document.getElementById('current-video-title');
const currentVideoPlaylist = document.getElementById('current-video-playlist');

// Modal Elements
const savedModal = document.getElementById('saved-modal');
const closeSavedModal = document.getElementById('close-saved-modal');
const savedList = document.getElementById('saved-list');
const savedCount = document.getElementById('saved-count');

const glossaryModal = document.getElementById('glossary-modal');
const closeGlossaryModal = document.getElementById('close-glossary-modal');
const glossaryTermsContainer = document.getElementById('glossary-terms-container');
const openGlossaryBtn = document.getElementById('open-glossary-btn');

const impressumModal = document.getElementById('impressum-modal');
const closeImpressum = document.getElementById('close-impressum');
const impressumLink = document.getElementById('impressum-link');

// Format seconds into MM:SS
function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Initialization
async function init() {
    try {
        console.log("Loading databases...");
        const dbRes = await fetch('database.json');
        database = await dbRes.json();
        
        const glossRes = await fetch('glossary.json');
        glossary = await glossRes.json();
        
        console.log(`Loaded ${database.length} videos and ${glossary.length} glossary terms.`);
        
        // Initialize Fuse for fuzzy search
        const flatSegments = [];
        database.forEach(video => {
            video.subs.forEach(sub => {
                flatSegments.push({
                    videoId: video.id,
                    videoTitle: video.title,
                    videoPlaylist: video.playlist,
                    start: sub.start,
                    text: sub.text
                });
            });
        });
        
        fuse = new Fuse(flatSegments, {
            keys: ['text'],
            includeMatches: true,
            threshold: 0.4, // Increased fuzzy matching threshold for deeper typos
            minMatchCharLength: 3,
            ignoreLocation: true // Search anywhere in the segment
        });
        
        setupModals();
        renderCourseOverview();
        
        // Init AI Semantic Model in background
        initSemanticAI();
        
        // Event Listeners for Debounced Live Search
        let searchTimeout;
        globalSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const val = e.target.value.trim();
            if (!val) {
                showCourseOverview();
            } else {
                searchTimeout = setTimeout(() => {
                    performSearch(val);
                }, 400); // 400ms debounce
            }
        });
        
        globalSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(searchTimeout);
                const val = e.target.value.trim();
                if (val) performSearch(val);
                else showCourseOverview();
            }
        });
        
    } catch (err) {
        console.error("Failed to load data:", err);
    }
}

async function initSemanticAI() {
    try {
        const statusText = document.getElementById('ai-status-text');
        const statusDiv = document.getElementById('ai-status');
        
        const [corpusRes, embRes] = await Promise.all([
            fetch('search_corpus.json'),
            fetch('corpus_embeddings.json')
        ]);
        ragCorpus = await corpusRes.json();
        corpusEmbeddings = await embRes.json();
        
        statusText.innerText = 'Downloading Xenova/all-MiniLM-L6-v2...';
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
            progress_callback: (x) => {
                if (x.status === 'downloading') {
                    statusText.innerText = `Caching AI Model... ${Math.round(x.progress || 0)}%`;
                }
            }
        });
        
        statusText.innerText = 'Semantic AI Ready! ✨';
        statusDiv.querySelector('.loader-ring').style.display = 'none';
        statusDiv.style.borderColor = 'var(--secondary-accent)';
        statusDiv.style.color = 'var(--secondary-accent)';
        
        setTimeout(() => statusDiv.style.opacity = '0', 4000);
    } catch (e) {
        console.error("AI Error:", e);
        document.getElementById('ai-status-text').innerText = 'AI Initialization Failed (Using standard fuzzy search).';
    }
}

function setupModals() {
    updateSavedCount();
    
    if (openSavedBtn) {
        openSavedBtn.addEventListener('click', () => {
            savedModal.style.display = 'flex';
            renderSaved();
        });
    }
    
    if (closeSavedModal) {
        closeSavedModal.addEventListener('click', () => savedModal.style.display = 'none');
    }

    if (openGlossaryBtn) {
        openGlossaryBtn.addEventListener('click', () => {
            glossaryModal.style.display = 'flex';
            renderGlossaryModal();
        });
    }

    if (closeGlossaryModal) {
        closeGlossaryModal.addEventListener('click', () => glossaryModal.style.display = 'none');
    }
    
    if (impressumLink) {
        impressumLink.addEventListener('click', (e) => {
            e.preventDefault();
            impressumModal.style.display = 'flex';
        });
    }

    if (closeImpressum) {
        closeImpressum.addEventListener('click', () => impressumModal.style.display = 'none');
    }
    
    // Playlist filters
    const filterContainer = document.getElementById('playlist-filters');
    if (filterContainer) {
        filterContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;
            
            // UI Update
            filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Logic Update
            currentPlaylistFilter = btn.getAttribute('data-filter');
            renderCourseOverview();
        });
    }

    // Close on overlay click
    window.addEventListener('click', (e) => {
        if (e.target === savedModal) savedModal.style.display = 'none';
        if (e.target === impressumModal) impressumModal.style.display = 'none';
        if (e.target === glossaryModal) glossaryModal.style.display = 'none';
    });
}

function updateSavedCount() {
    savedCount.innerText = `(${savedSegments.length})`;
}

function handleSaveToggle(vid, title, pl, start, text, btn) {
    const exists = savedSegments.find(s => s.videoId === vid && s.start == start);
    
    if (exists) {
        savedSegments = savedSegments.filter(s => !(s.videoId === vid && s.start == start));
        btn.classList.remove('saved');
        btn.innerText = '☆';
    } else {
        savedSegments.push({
            videoId: vid, videoTitle: title, videoPlaylist: pl, start: parseFloat(start), text: text
        });
        btn.classList.add('saved');
        btn.innerText = '★';
    }
    
    localStorage.setItem('savedSegments', JSON.stringify(savedSegments));
    updateSavedCount();
    
    // If viewing saved list, refresh it
    if (tabSaved.classList.contains('active')) {
        renderSaved();
    }
}

function renderSaved() {
    savedList.innerHTML = '';
    if (savedSegments.length === 0) {
        savedList.innerHTML = `
            <div class="empty-state">
                <p>No saved segments yet. Click the star icon on search results to save them here for quick reference.</p>
            </div>
        `;
        return;
    }
    
    // Group exactly like search results
    const grouped = {};
    savedSegments.forEach(seg => {
        if (!grouped[seg.videoId]) {
            grouped[seg.videoId] = {
                video: { id: seg.videoId, title: seg.videoTitle, playlist: seg.videoPlaylist },
                segments: []
            };
        }
        grouped[seg.videoId].segments.push(seg);
    });
    
    const results = Object.values(grouped);
    
    results.forEach(res => {
        const item = document.createElement('li');
        item.className = 'result-item';
        
        // Render segments immediately for the sidebar (simplified view)
        let segmentsHTML = res.segments.map(seg => `
            <div class="segment" data-vid="${res.video.id}" data-time="${Math.floor(seg.start)}" data-title="${res.video.title}" data-pl="${res.video.playlist}">
                <div class="timestamp">
                    ${formatTime(seg.start)}
                </div>
                <div class="text-snippet" style="font-size: 0.85rem">${seg.text}</div>
                <button class="save-btn saved" title="Remove bookmark" data-vid="${res.video.id}" data-title="${res.video.title}" data-pl="${res.video.playlist}" data-start="${seg.start}" data-text="${encodeURIComponent(seg.text)}">★</button>
            </div>
        `).join('');

        item.innerHTML = `
            <div class="result-header">
                <div class="result-title" style="font-size:0.9rem">${res.video.title}</div>
            </div>
            <div class="result-segments">
                ${segmentsHTML}
            </div>
        `;
        
        savedList.appendChild(item);
    });
    
    bindClickHandlers(savedList);
}

function renderGlossaryModal() {
    if (!glossary || !glossaryTermsContainer) return;

    // Extract unique terms
    const allTerms = new Set();
    glossary.forEach(video => {
        if (video.terms) {
            video.terms.forEach(term => allTerms.add(term));
        }
    });

    const sortedTerms = Array.from(allTerms).sort((a, b) => a.localeCompare(b));
    
    // Group by first letter
    const groups = {};
    sortedTerms.forEach(term => {
        const letter = term[0].toUpperCase();
        if (!groups[letter]) groups[letter] = [];
        groups[letter].push(term);
    });

    let html = '<div class="glossary-grid">';
    Object.keys(groups).sort().forEach(letter => {
        html += `
            <div class="glossary-letter-group">
                <div class="glossary-letter">${letter}</div>
                <div class="glossary-letter-terms">
                    ${groups[letter].map(t => `<div class="glossary-term-link">${t}</div>`).join('')}
                </div>
            </div>
        `;
    });
    html += '</div>';

    glossaryTermsContainer.innerHTML = html;

    // Bind click events
    glossaryTermsContainer.querySelectorAll('.glossary-term-link').forEach(link => {
        link.addEventListener('click', () => {
            const term = link.innerText;
            globalSearchInput.value = term;
            glossaryModal.style.display = 'none';
            performSearch(term);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

function renderCourseOverview() {
    if (!overviewGrid) return;
    overviewGrid.innerHTML = '';
    
    database.forEach((video, index) => {
        // Filter logic
        if (currentPlaylistFilter !== 'all' && !video.playlist.includes(currentPlaylistFilter)) {
            return;
        }

        // Combine glossary terms dynamically into the video card
        let tagsHTML = '';
        if (glossary && glossary[index] && glossary[index].terms) {
            tagsHTML = glossary[index].terms.map(t => `<span class="keyword-pill" data-term="${t}">${t}</span>`).join('');
        }
        
        const card = document.createElement('div');
        card.className = 'overview-card';
        card.innerHTML = `
            <div class="overview-thumb">
                <img src="https://img.youtube.com/vi/${video.id}/mqdefault.jpg" alt="${video.title}">
                <div class="overview-order">#${index + 1}</div>
            </div>
            <div class="overview-info">
                <div class="overview-playlist">${video.playlist}</div>
                <div class="overview-title">${video.title}</div>
                <div class="overview-tags">${tagsHTML}</div>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            // If they clicked a pill, search it
            if (e.target.classList.contains('keyword-pill')) {
                const term = e.target.getAttribute('data-term');
                globalSearchInput.value = term;
                performSearch(term);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            // Else load the video
            loadVideo(video.id, 0, video.title, video.playlist);
        });
        
        overviewGrid.appendChild(card);
    });
}

function showCourseOverview() {
    if (courseOverviewSection) courseOverviewSection.style.display = 'block';
    if (resultsLayout) resultsLayout.style.display = 'none';
}

function showSearchResults() {
    if (courseOverviewSection) courseOverviewSection.style.display = 'none';
    if (resultsLayout) resultsLayout.style.display = 'block';
}

// Ensure async
async function performSearch(query) {
    if (!database.length || !fuse) {
        console.warn("Search attempted before data was loaded.");
        return;
    }
    
    showSearchResults();

    const q = query.toLowerCase().trim();
    const grouped = {};
    let totalSegmentsFound = 0;

    // AI SEMANTIC RAG SEARCH
    if (embedder && corpusEmbeddings) {
        searchStats.innerText = 'Computing semantic space...';
        
        // Compute query embedding
        const output = await embedder(q, { pooling: 'mean', normalize: true });
        const queryEmb = output.data;
        
        // Vector Dot Product
        const scoredChunks = ragCorpus.map((chunk, i) => {
            const docEmb = corpusEmbeddings[i];
            let score = 0;
            for (let j=0; j<384; j++) {
                score += queryEmb[j] * docEmb[j];
            }
            return { chunk, score };
        });
        
        // Sort highest cosine similarity
        scoredChunks.sort((a,b) => b.score - a.score);
        
        // Only take semantic matches > 0.15 threshold
        const topHits = scoredChunks.filter(h => h.score > 0.15).slice(0, 30);
        
        topHits.forEach(res => {
            const seg = res.chunk;
            if (!grouped[seg.videoId]) {
                const vIndex = database.findIndex(v => v.id === seg.videoId);
                grouped[seg.videoId] = {
                    video: { id: seg.videoId, title: seg.videoTitle, playlist: seg.playlist, order: vIndex },
                    segments: [],
                    bestScore: res.score
                };
            } else {
                grouped[seg.videoId].bestScore = Math.max(grouped[seg.videoId].bestScore, res.score); // max is best
            }
            
            // Inject highlights for semantic matches manually
            let text = seg.text;
            const regex = new RegExp(`(${q.split(' ').join('|')})`, 'gi');
            text = text.replace(regex, match => `<mark>${match}</mark>`);
            
            grouped[seg.videoId].segments.push({
                start: seg.start,
                displayTime: formatTime(seg.start),
                text: text
            });
            totalSegmentsFound++;
        });

        // Sort chronological (by video sequence)
        const results = Object.values(grouped);
        
        // Sort segments within each video by time (as requested)
        results.forEach(res => {
            res.segments.sort((a, b) => a.start - b.start);
        });

        results.sort((a,b) => a.video.order - b.video.order);
        
        renderDensityMap(grouped);
        renderResults(results, totalSegmentsFound);
        return;
    }
    
    // --- FALLBACK TO FUSE.JS EXACT SEARCH IF MODEL NOT READY ---
    const fuseResults = fuse.search(q);
    
    fuseResults.forEach(res => {
        const seg = res.item;
        
        if (!grouped[seg.videoId]) {
            const vIndex = database.findIndex(v => v.id === seg.videoId);
            grouped[seg.videoId] = {
                video: { id: seg.videoId, title: seg.videoTitle, playlist: seg.videoPlaylist, order: vIndex },
                segments: [],
                bestScore: res.score !== undefined ? res.score : 1
            };
        } else if (res.score !== undefined) {
            grouped[seg.videoId].bestScore = Math.min(grouped[seg.videoId].bestScore, res.score); // min is best for Fuse
        }
        
        // Highlight matching terms
        let highlightedText = seg.text;
        if (res.matches && res.matches.length > 0) {
            const match = res.matches[0];
            let offset = 0;
            match.indices.forEach(([start, end]) => {
                const s = start + offset;
                const e = end + 1 + offset;
                const orig = highlightedText.substring(s, e);
                const replace = `<mark>${orig}</mark>`;
                highlightedText = highlightedText.substring(0, s) + replace + highlightedText.substring(e);
                offset += 13; // length of <mark></mark>
            });
        }
        
        grouped[seg.videoId].segments.push({
            start: seg.start,
            displayTime: formatTime(seg.start),
            text: highlightedText
        });
        totalSegmentsFound++;
    });

    const results = Object.values(grouped);
    
    // Deduplicate overlapping segments exactly as before
    results.forEach(res => {
        res.segments.sort((a,b) => a.start - b.start);
        const merged = [];
        if (res.segments.length > 0) {
            let current = res.segments[0];
            for (let i = 1; i < res.segments.length; i++) {
                let next = res.segments[i];
                if (next.start - current.start <= 8) {
                    if (current.text !== next.text && !current.text.includes(next.text)) {
                         current.text += " ... " + next.text;
                    }
                } else {
                    merged.push(current);
                    current = next;
                }
            }
            merged.push(current);
        }
        res.segments = merged;
    });
    
    // Sort chronological
    results.sort((a,b) => a.video.order - b.video.order);
    
    renderDensityMap(grouped);
    renderResults(results.slice(0, 50), totalSegmentsFound);
}

function renderDensityMap(resultsMap) {
    const mapContainer = document.getElementById('density-map-container');
    const mapEl = document.getElementById('density-map');
    
    if (Object.keys(resultsMap).length === 0) {
        mapContainer.style.display = 'none';
        return;
    }
    
    mapContainer.style.display = 'block';
    mapEl.innerHTML = '';
    
    database.forEach((video, index) => {
        const box = document.createElement('div');
        box.className = 'video-density-box';
        
        const hitData = resultsMap[video.id];
        const numHits = hitData ? hitData.segments.length : 0;
        
        if (numHits > 0) box.classList.add('has-hits');
        
        box.title = `#${index + 1}: ${video.title}\n(${numHits} matches)`;
        box.innerHTML = `<span>${index + 1}</span>`;
        
        if (numHits > 0) {
            const maxTime = video.subs.length > 0 ? video.subs[video.subs.length-1].start : 3600;
            
            hitData.segments.forEach(seg => {
                const tick = document.createElement('div');
                tick.className = 'density-tick';
                let percent = (seg.start / maxTime) * 100;
                if (percent > 98) percent = 98;
                tick.style.left = `${percent}%`;
                
                box.appendChild(tick);
            });
        }
        
        box.addEventListener('click', () => {
            if (numHits > 0) {
                // Smooth scroll to the detailed result box
                const targetBox = document.getElementById(`result-card-${video.id}`);
                if (targetBox) {
                    targetBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight flash
                    const oldBg = targetBox.style.backgroundColor;
                    targetBox.style.transition = 'background-color 0.8s';
                    targetBox.style.backgroundColor = 'rgba(249, 115, 22, 0.2)'; // Faint orange flash
                    setTimeout(() => {
                        targetBox.style.backgroundColor = oldBg;
                    }, 1200);
                }
            }
        });
        
        mapEl.appendChild(box);
    });
}

function renderResults(results, totalSegments) {
    resultsList.innerHTML = '';
    
    searchStats.innerText = `${totalSegments} matches across ${results.length} videos`;

    if (results.length === 0) {
        resultsList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">🏜️</span>
                <p>No results found for your search.</p>
            </div>
        `;
        return;
    }

    results.forEach((res, index) => {
        const item = document.createElement('li');
        item.className = 'result-item';
        item.id = `result-card-${res.video.id}`; // Crucial hook for timeline scrolling
        
        let segmentsHTML = res.segments.map(seg => {
            const isSaved = savedSegments.some(s => s.videoId === res.video.id && s.start == seg.start);
            return `
            <div class="segment" data-vid="${res.video.id}" data-time="${Math.floor(seg.start)}" data-title="${res.video.title}" data-pl="${res.video.playlist}">
                <div class="timestamp">
                    ${seg.displayTime}
                </div>
                <div class="text-snippet">${seg.text}</div>
                <button class="save-btn ${isSaved ? 'saved' : ''}" title="Bookmark segment" data-vid="${res.video.id}" data-title="${res.video.title}" data-pl="${res.video.playlist}" data-start="${seg.start}" data-text="${encodeURIComponent(seg.text)}">${isSaved ? '★' : '☆'}</button>
            </div>
            `;
        }).join('');

        item.innerHTML = `
            <div class="result-header">
                <div class="result-title"><span style="color:var(--text-muted)">#${index+1} </span>${res.video.title}</div>
                <div class="result-playlist">${res.video.playlist}</div>
            </div>
            <div class="result-segments">
                ${segmentsHTML}
            </div>
        `;
        
        resultsList.appendChild(item);
    });

    bindClickHandlers(resultsList);
}

function bindClickHandlers(container) {
    // Add event listeners for the entire segment block
    container.querySelectorAll('.segment').forEach(segBox => {
        segBox.addEventListener('click', (e) => {
            // Do not trigger jump if clicking the save button specifically
            if (e.target.closest('.save-btn') || e.target.classList.contains('save-btn')) return;
            
            const vid = segBox.getAttribute('data-vid');
            if (!vid) return; // Ignore if no vid (like in the saved list simplified view if missing)
            
            const time = segBox.getAttribute('data-time');
            const title = segBox.getAttribute('data-title');
            const pl = segBox.getAttribute('data-pl');
            
            loadVideo(vid, time, title, pl);
            
            // Highlight row briefly
            segBox.style.backgroundColor = 'rgba(249, 115, 22, 0.2)';
            setTimeout(() => {
                segBox.style.backgroundColor = '';
            }, 1000);
        });
    });
    
    // Add event listeners for save buttons
    container.querySelectorAll('.save-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const vid = btn.getAttribute('data-vid');
            const title = btn.getAttribute('data-title');
            const pl = btn.getAttribute('data-pl');
            const start = btn.getAttribute('data-start');
            const text = decodeURIComponent(btn.getAttribute('data-text'));
            
            handleSaveToggle(vid, title, pl, start, text, btn);
        });
    });
}

function loadVideo(videoId, startTime, title, playlist) {
    console.log(`[DEBUG] Attempting to load video: ${videoId} at ${startTime}s`);
    console.log(`[DEBUG] Title: ${title} | Playlist: ${playlist}`);
    console.log(`[DEBUG] Is mainVideoSection null?`, mainVideoSection === null);
    console.log(`[DEBUG] Is videoPlayer null?`, videoPlayer === null);

    if (!videoId) {
        console.error("[DEBUG] Aborting: videoId is undefined or null");
        return;
    }

    // Show entire video section if available
    if (mainVideoSection) {
        console.log("[DEBUG] mainVideoSection found. Setting display flex.");
        mainVideoSection.style.display = 'flex';
    } else {
        console.warn("[DEBUG] mainVideoSection is NULL! Skipping style block.");
    }
    
    if (videoPlayer) {
        videoPlayer.style.display = 'block';
        const embedUrl = `https://www.youtube.com/embed/${videoId}?start=${startTime}&autoplay=1`;
        videoPlayer.src = embedUrl;
    }
    
    if (currentVideoTitle) currentVideoTitle.innerText = title || "Unknown Title";
    if (currentVideoPlaylist) currentVideoPlaylist.innerText = playlist || "Unknown Playlist";
    
    // Auto scroll to player 
    if (mainVideoSection) {
        mainVideoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        // Fallback for old cached HTML viewers
        const oldSection = document.querySelector('.video-section');
        if (oldSection) oldSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Start app
window.addEventListener('DOMContentLoaded', init);
