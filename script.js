let currentPage = -1;
let allTextBlobs = [];
let lastChangeTime = 0;
const fontSizeCache = {};

document.addEventListener('DOMContentLoaded', () => {
    const selector = document.getElementById('fileSelector');
    const modal = document.getElementById('noteSelectModal');
    const loadButton = document.getElementById('loadNotesButton');
    const changeNotesButton = document.getElementById('changeNotesButton');

    fetch('/list-files')
        .then(response => response.json())
        .then(files => {
            selector.innerHTML = ''; // clear old options if needed
            files.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file;
                selector.appendChild(option);
            });

            // Check for previously selected file
            const lastUsed = localStorage.getItem('lastUsedNotesFile');
            if (lastUsed && files.includes(lastUsed)) {
                selector.value = lastUsed;
            }
        });

    loadButton.addEventListener('click', () => {
        const filename = selector.value;
        if (filename) {
            localStorage.setItem('lastUsedNotesFile', filename); // 🔐 Remember selection

            fetch(`/load-file?name=${encodeURIComponent(filename)}`)
                .then(response => response.json())
                .then(data => {
                    allTextBlobs = data;
                    currentPage = -1;
                    Object.keys(fontSizeCache).forEach(key => delete fontSizeCache[key]);
                    const textContent = document.getElementById('textContent');
                    textContent.innerHTML = 'Press Right Arrow or Spacebar to start reading...';
                    textContent.style.display = 'block';
                    adjustFontSize(textContent, currentPage);
                    modal.style.display = 'none';
                });
        }
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

var socket = new WebSocket('ws://localhost:58000');
socket.onmessage = function(event) {
    var message = event.data;
    if (message === 'next') {
        debounceChangePage(1);
    } else if (message === 'previous') {
        debounceChangePage(-1);
    }
};
