let currentPage = -1;
let allTextBlobs = []; // Array to store all text blobs
let lastChangeTime = 0; // Track the last change time

document.addEventListener('DOMContentLoaded', function() {
    fetch('/all-blobs')
        .then(response => response.json())
        .then(data => {
            allTextBlobs = data; // Store fetched text blobs
        })
        .catch(error => console.error('Failed to fetch text blobs:', error));
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') {
        debounceChangePage(1); // Next page
    } else if (e.key === 'ArrowLeft') {
        debounceChangePage(-1); // Previous page
    }
});

function debounceChangePage(direction) {
    const now = Date.now();
    if (now - lastChangeTime > 300) { // Only allow a change if more than 300ms have passed
        lastChangeTime = now; // Update the last change time
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
    adjustFontSize(textContent); // Adjust font size as needed
    precomputeNextPages(pageIndex)
}

function adjustFontSize(element, pageIndex) {
    // Ensure adjustments occur after the browser has had a chance to layout the page
    requestAnimationFrame(() => {
        let fontSize = 72; // Starting font size in pixels
        element.style.fontSize = `${fontSize}px`;
        while (element.scrollHeight > element.offsetHeight || element.scrollWidth > element.offsetWidth) {
            fontSize--;
            element.style.fontSize = `${fontSize}px`;
            if (fontSize <= 10) break; // Prevents too small font size
        }
        fontSizeCache[pageIndex] = fontSize; // Cache the computed font size
    });
}

function precomputeNextPages(currentPageIndex) {
    // Precompute font sizes for the next few pages in the background
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

var socket = new WebSocket('ws://localhost:42069');
socket.onmessage = function(event) {
    var message = event.data;
    if (message === 'next') {
        debounceChangePage(1);
    } else if (message === 'previous') {
        debounceChangePage(-1);
    }
};
