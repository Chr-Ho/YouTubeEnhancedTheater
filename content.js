let isEnhancedMode = false;
const videoPlayer = document.querySelector('.html5-video-player');
let video = document.querySelector('video');

// Store button position as percentages (initially 10px from left, 60px from bottom)
let posLeftPercent = 10 / window.innerWidth * 100; // ~1-2% depending on window width
let posBottomPercent = 60 / window.innerHeight * 100; // ~5-10% depending on window height

function waitForVideoMetadata(callback) {
    if (video && video.videoWidth && video.videoHeight) {
        callback();
    } else {
        video = document.querySelector('video');
        if (video) {
            video.addEventListener('loadedmetadata', callback, { once: true });
        } else {
            setTimeout(() => waitForVideoMetadata(callback), 100);
        }
    }
}

function toggleEnhancedMode() {
    isEnhancedMode = !isEnhancedMode;
    if (isEnhancedMode) {
        waitForVideoMetadata(updateVideoSize);
        document.body.classList.add('enhanced-theater-mode');
        document.querySelector('#secondary')?.style.setProperty('display', 'none');
        document.querySelector('#comments')?.style.setProperty('display', 'none');
    } else {
        document.body.classList.remove('enhanced-theater-mode');
        videoPlayer.style.cssText = '';
        document.querySelector('#secondary')?.style.removeProperty('display');
        document.querySelector('#comments')?.style.removeProperty('display');
    }
}

function updateVideoSize() {
    if (!isEnhancedMode || !video || !video.videoWidth || !video.videoHeight) {
        return;
    }

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const videoAspectRatio = video.videoWidth / video.videoHeight;

    let newWidth = windowWidth;
    let newHeight = newWidth / videoAspectRatio;

    if (newHeight > windowHeight) {
        newHeight = windowHeight;
        newWidth = newHeight * videoAspectRatio;
    }

    videoPlayer.style.cssText = `
        width: ${newWidth}px !important;
        height: ${newHeight}px !important;
        max-width: none !important;
        max-height: none !important;
        position: fixed !important;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
        background: black;
    `;
}

function updateButtonPosition() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const buttonWidth = toggleButton.offsetWidth;
    const buttonHeight = toggleButton.offsetHeight;

    let newLeft = (posLeftPercent / 100) * windowWidth;
    let newBottom = (posBottomPercent / 100) * windowHeight;

    // Ensure button stays within bounds
    const maxLeft = windowWidth - buttonWidth;
    const maxBottom = windowHeight - buttonHeight;
    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newBottom = Math.max(0, Math.min(newBottom, maxBottom));

    toggleButton.style.left = `${newLeft}px`;
    toggleButton.style.bottom = `${newBottom}px`;
    toggleButton.style.top = 'auto';
    toggleButton.style.right = 'auto';
}

const toggleButton = document.createElement('button');
toggleButton.title = 'Click to toggle theater mode (Hold to drag)';
toggleButton.style.cssText = `
    position: fixed;
    z-index: 9999999;
    width: 48px;
    height: 48px;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: url(${chrome.runtime.getURL('icon48.png')}) center/contain no-repeat;
    background-color: rgba(255, 255, 255, 0.9);
    cursor: move;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;
document.body.appendChild(toggleButton);

// Set initial position
updateButtonPosition();

// Replace hover effects
toggleButton.onmouseover = () => {
    toggleButton.style.transform = 'scale(1.1)';
    toggleButton.style.transition = 'transform 0.2s ease';
};
toggleButton.onmouseout = () => {
    toggleButton.style.transform = 'scale(1)';
    toggleButton.style.transition = 'transform 0.2s ease';
};

// Dragging functionality
let isDragging = false;
let mouseDownTimer = null;
let currentX;
let currentY;

toggleButton.onmousedown = (e) => {
    // Clear any existing timers
    if (mouseDownTimer) {
        clearTimeout(mouseDownTimer);
    }

    // Start a timer to detect hold
    mouseDownTimer = setTimeout(() => {
        isDragging = true;
        currentX = e.clientX - parseInt(toggleButton.style.left || '0');
        currentY = e.clientY - (window.innerHeight - parseInt(toggleButton.style.bottom || '0') - toggleButton.offsetHeight);
        toggleButton.style.cursor = 'grabbing';
    }, 200); // 200ms hold to start dragging
};

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const buttonWidth = toggleButton.offsetWidth;
    const buttonHeight = toggleButton.offsetHeight;

    let newLeft = e.clientX - currentX;
    let newTop = e.clientY - currentY;
    let newBottom = windowHeight - newTop - buttonHeight;

    // Constrain within window
    const maxLeft = windowWidth - buttonWidth;
    const maxBottom = windowHeight - buttonHeight;
    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newBottom = Math.max(0, Math.min(newBottom, maxBottom));

    toggleButton.style.left = `${newLeft}px`;
    toggleButton.style.bottom = `${newBottom}px`;
    toggleButton.style.top = 'auto';
    toggleButton.style.right = 'auto';

    // Update percentages
    posLeftPercent = (newLeft / windowWidth) * 100;
    posBottomPercent = (newBottom / windowHeight) * 100;
});

document.addEventListener('mouseup', () => {
    // Clear the mousedown timer
    if (mouseDownTimer) {
        clearTimeout(mouseDownTimer);
        mouseDownTimer = null;
    }

    if (isDragging) {
        isDragging = false;
        toggleButton.style.cursor = 'move';
    }
});

// Toggle mode on click
toggleButton.onclick = (e) => {
    if (!isDragging) {
        toggleEnhancedMode();
    }
};

// Update on window resize
window.addEventListener('resize', () => {
    if (isEnhancedMode) {
        updateVideoSize();
    }
    updateButtonPosition(); // Maintain relative position
});

// Listen for extension icon clicks
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggle') {
        toggleEnhancedMode();
    }
});

waitForVideoMetadata(() => {
    if (isEnhancedMode) updateVideoSize();
});