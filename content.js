let isEnhancedMode = false;
let isInitialized = false;
const videoPlayer = document.querySelector('.html5-video-player');
let video = document.querySelector('video');

function initializeExtension() {
    if (isInitialized) return;
    
    // Load saved state
    chrome.storage.sync.get(['isEnabled'], function(data) {
        isEnhancedMode = !!data.isEnabled;
        if (isEnhancedMode) {
            waitForVideoMetadata(() => {
                toggleEnhancedMode();
            });
        }
    });
    
    isInitialized = true;
}

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
    
    // Get all relevant elements
    const ytdWatch = document.querySelector('ytd-watch-flexy');
    const playerContainer = document.querySelector('#player-container');
    const moviePlayer = document.querySelector('#movie_player');
    const videoContainer = document.querySelector('.html5-video-container');
    const video = document.querySelector('video');

    if (isEnhancedMode) {
        // Force theater mode first
        if (ytdWatch && !ytdWatch.hasAttribute('theater')) {
            document.querySelector('.ytp-size-button')?.click();
        }

        document.body.classList.add('enhanced-theater-mode');
        
        // Hide elements
        document.querySelector('#masthead-container')?.style.setProperty('display', 'none');
        document.querySelector('#secondary')?.style.setProperty('display', 'none');
        document.querySelector('#comments')?.style.setProperty('display', 'none');
        document.querySelector('#below')?.style.setProperty('display', 'none');

        // Apply fullscreen styles
        if (moviePlayer) {
            moviePlayer.style.cssText = `
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                max-width: none !important;
                max-height: none !important;
                z-index: 2147483647 !important;
            `;
        }

        if (videoContainer) {
            videoContainer.style.cssText = `
                width: 100% !important;
                height: 100% !important;
                transform: none !important;
            `;
        }

        if (video) {
            video.style.cssText = `
                width: 100% !important;
                height: 100% !important;
                max-width: 100vw !important;
                max-height: 100vh !important;
                object-fit: contain !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
            `;
        }
    } else {
        // Reset everything
        document.body.classList.remove('enhanced-theater-mode');
        
        [moviePlayer, videoContainer, video].forEach(element => {
            if (element) {
                element.style.cssText = '';
            }
        });

        // Show elements
        ['#masthead-container', '#secondary', '#comments', '#below'].forEach(selector => {
            document.querySelector(selector)?.style.removeProperty('display');
        });

        // Force a player resize by toggling theater mode
        if (ytdWatch) {
            const isTheater = ytdWatch.hasAttribute('theater');
            document.querySelector('.ytp-size-button')?.click();
            if (isTheater) {
                setTimeout(() => document.querySelector('.ytp-size-button')?.click(), 50);
            }
        }
    }
}

// Debounced resize handler
let resizeTimeout;
window.addEventListener('resize', () => {
    if (!isEnhancedMode) return;
    
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const video = document.querySelector('video');
        if (video) {
            video.style.maxWidth = '100vw';
            video.style.maxHeight = '100vh';
        }
    }, 100);
});

// Enhanced message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (request.action === 'ping') {
            // Respond to ping to confirm content script is ready
            sendResponse({ success: true });
            return true;
        }
        
        if (request.action === 'toggle') {
            if (!isInitialized) {
                initializeExtension();
            }
            
            // If enabled state is provided, sync with it
            if (typeof request.enabled !== 'undefined') {
                isEnhancedMode = !request.enabled;
            }
            
            toggleEnhancedMode();
            sendResponse({ success: true, state: isEnhancedMode });
            return true;
        }
    } catch (error) {
        console.error('Error in message listener:', error);
        sendResponse({ success: false, error: error.message });
    }
    return true;
});

// Initialize on load
document.addEventListener('DOMContentLoaded', initializeExtension);
// Backup initialization for cases where DOMContentLoaded has already fired
if (document.readyState === 'complete') {
    initializeExtension();
}