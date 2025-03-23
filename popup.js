document.addEventListener('DOMContentLoaded', async () => {
    let currentTab = null;

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        currentTab = tab;
        const isYouTubeVideo = tab.url.includes('youtube.com/watch');
        const toggleButton = document.getElementById('theaterToggle');
        
        toggleButton.disabled = !isYouTubeVideo;
        if (!isYouTubeVideo) {
            toggleButton.title = 'Only available on YouTube video pages';
        }

        // Load saved settings
        const data = await chrome.storage.sync.get({
            isEnabled: false
        });
        
        // Set initial toggle state
        toggleButton.checked = data.isEnabled;

        // Toggle button handler
        toggleButton.addEventListener('change', async function(e) {
            await updateToggleState(e.target.checked);
        });

        // Listen for state changes from keyboard shortcuts
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.isEnabled) {
                toggleButton.checked = changes.isEnabled.newValue;
            }
        });

    } catch (error) {
        console.error('Error initializing popup:', error);
    }
});

async function updateToggleState(isEnabled, retryCount = 0) {
    const MAX_RETRIES = 10;
    const INITIAL_RETRY_DELAY = 200;

    try {
        await chrome.storage.sync.set({ isEnabled });
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.url.includes('youtube.com/watch')) {
            try {
                // First try to ping the content script
                await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                
                // If ping succeeds, send the toggle command
                await chrome.tabs.sendMessage(tab.id, { 
                    action: 'toggle',
                    enabled: isEnabled
                });
            } catch (error) {
                if (retryCount < MAX_RETRIES) {
                    // Use exponential backoff
                    const delay = INITIAL_RETRY_DELAY * Math.pow(1.5, retryCount);
                    console.log(`Content script not ready, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
                    
                    setTimeout(() => {
                        updateToggleState(isEnabled, retryCount + 1);
                    }, delay);
                } else {
                    console.error('Max retries reached, content script may not be loaded');
                    throw error;
                }
            }
        }
    } catch (error) {
        console.error('Error updating toggle state:', error);
    }
} 