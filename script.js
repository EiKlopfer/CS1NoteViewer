const NOTES_PATH = 'notes';
const MANIFEST_PATH = `${NOTES_PATH}/manifest.json`;

let currentPage = -1;
let allTextBlobs = [];
let lastChangeTime = 0;
const fontSizeCache = {};
let useLocalServer = false;

// Mirrors the markdown_to_html() in server.py
function markdownToHtml(text) {
    text = text.replace(/^###### (.*)/gm, '<h6>$1</h6>');
    text = text.replace(/^##### (.*)/gm, '<h5>$1</h5>');
    text = text.replace(/^#### (.*)/gm, '<h4>$1</h4>');
    text = text.replace(/^### (.*)/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.*)/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.*)/gm, '<h1>$1</h1>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/(<\/h[1-6]>)[\r\n\s]+/g, '$1');
    return text;
}

// Try the Python server's /list-files endpoint. If it responds with a JSON
// array, we're running locally — use the server endpoints. Otherwise fall
// back to fetching the static manifest.json (GitHub Pages mode).
async function listFiles() {
    try {
        const resp = await fetch('/list-files');
        if (resp.ok) {
            const ct = resp.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                const data = await resp.json();
                if (Array.isArray(data)) {
                    useLocalServer = true;
                    return data;
                }
            }
        }
    } catch (_) {
        // Network/CORS error — fall through to static manifest
    }

    useLocalServer = false;
    const resp = await fetch(MANIFEST_PATH);
    if (!resp.ok) throw new Error(`Failed to load manifest: ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data)) throw new Error('manifest.json must be a JSON array of filenames');
    return data.filter(name => typeof name === 'string' && name.endsWith('.txt'));
}

async function loadFile(filename) {
    if (useLocalServer) {
        const resp = await fetch(`/load-file?name=${encodeURIComponent(filename)}`);
        return await resp.json();
    }
    // Static mode: fetch the raw file relative to the page and parse client-side
    const resp = await fetch(`${NOTES_PATH}/${encodeURIComponent(filename)}`);
    if (!resp.ok) throw new Error(`Failed to load ${filename}: ${resp.status}`);
    const text = await resp.text();
    return text.split('[PAGE]').map(blob => markdownToHtml(blob.trim()));
}

document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('fileSelector');
    const modal = document.getElementById('noteSelectModal');
    const loadButton = document.getElementById('loadNotesButton');
    const changeNotesButton = document.getElementById('changeNotesButton');

    listFiles()
        .then(files => {
            selector.innerHTML = '';
            files.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file;
                selector.appendChild(option);
            });

            const lastUsed = localStorage.getItem('lastUsedNotesFile');
            if (lastUsed && files.includes(lastUsed)) {
                selector.value = lastUsed;
            }
        })
        .catch(err => {
            console.error('Failed to list note files:', err);
            selector.innerHTML = '<option>Error loading file list</option>';
        });

    loadButton.addEventListener('click', () => {
        const filename = selector.value;
        if (!filename) return;
        localStorage.setItem('lastUsedNotesFile', filename);

        loadFile(filename)
            .then(data => {
                allTextBlobs = data;
                currentPage = -1;
                Object.keys(fontSizeCache).forEach(key => delete fontSizeCache[key]);
                const textContent = document.getElementById('textContent');
                textContent.innerHTML = 'Press Right Arrow or Spacebar to start reading...';
                textContent.style.display = 'block';
                adjustFontSize(textContent, currentPage);
                modal.style.display = 'none';
            })
            .catch(err => {
                console.error('Failed to load file:', err);
                alert(`Failed to load ${filename}: ${err.message}`);
            });
    });

    changeNotesButton.addEventListener('click', () => {
        document.getElementById('textContent').style.display = 'none';
        modal.style.display = 'flex';
    });
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') {
        debounceChangePage(1);
    } else if (e.key === 'ArrowLeft') {
        debounceChangePage(-1);
    }
});

function debounceChangePage(direction) {
    const now = Date.now();
    if (now - lastChangeTime > 300) {
        lastChangeTime = now;
        changePage(direction);
    }
}

function changePage(direction) {
    const newIndex = currentPage + direction;
    if (newIndex >= 0 && newIndex < allTextBlobs.length) {
        currentPage = newIndex;
        displayPage(currentPage);
    }
}

function displayPage(pageIndex) {
    const textContent = document.getElementById('textContent');
    textContent.innerHTML = allTextBlobs[pageIndex] || 'No more content.';
    adjustFontSize(textContent, pageIndex);
    precomputeNextPages(pageIndex);
}

function adjustFontSize(element, pageIndex) {
    requestAnimationFrame(() => {
        let fontSize = 72;
        element.style.fontSize = `${fontSize}px`;
        while (element.scrollHeight > element.offsetHeight || element.scrollWidth > element.offsetWidth) {
            fontSize--;
            element.style.fontSize = `${fontSize}px`;
            if (fontSize <= 10) break;
        }
        fontSizeCache[pageIndex] = fontSize;
    });
}

function precomputeNextPages(currentPageIndex) {
    for (let i = 1; i <= 10; i++) {
        const nextPageIndex = currentPageIndex + i;
        if (nextPageIndex in fontSizeCache || nextPageIndex >= allTextBlobs.length) continue;

        const text = allTextBlobs[nextPageIndex];
        if (text) {
            const offscreenElement = document.createElement('div');
            offscreenElement.style.visibility = 'hidden';
            offscreenElement.style.position = 'absolute';
            offscreenElement.style.left = '-9999px';
            offscreenElement.innerHTML = text;
            document.body.appendChild(offscreenElement);
            adjustFontSize(offscreenElement, nextPageIndex);
            document.body.removeChild(offscreenElement);
        } else {
            fontSizeCache[nextPageIndex] = null;
        }
    }
}

window.addEventListener('resize', () => {
    const textContent = document.getElementById('textContent');
    if (textContent.innerHTML) adjustFontSize(textContent, currentPage);
});

// WebSocket only matters when running locally with the Python server.
// Wrap in try/catch so the static (Pages) deployment doesn't error.
try {
    const socket = new WebSocket('ws://localhost:58000');
    socket.onmessage = function(event) {
        const message = event.data;
        if (message === 'next') {
            debounceChangePage(1);
        } else if (message === 'previous') {
            debounceChangePage(-1);
        }
    };
    socket.onerror = function() { /* expected on static hosting */ };
} catch (_) {
    // No local WebSocket available — fine, keyboard nav still works.
}