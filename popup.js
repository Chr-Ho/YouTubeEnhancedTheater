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
            return;
        }

        // Try to initialize connection with content script
        try {
            await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        } catch (error) {
            console.log('Content script not ready yet, reloading tab...');
            await chrome.tabs.reload(tab.id);
            // Wait for page to load
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Load saved settings
        const data = await chrome.storage.sync.get({
            isEnabled: false
        });
        
        // Set initial toggle state
        toggleButton.checked = data.isEnabled;

        // Toggle button handler
        toggleButton.addEventListener('change', async function(e) {
            try {
                await updateToggleState(e.target.checked);
            } catch (error) {
                console.error('Toggle failed:', error);
                // Revert the toggle if it failed
                toggleButton.checked = !e.target.checked;
            }
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
    const MAX_RETRIES = 5; // Reduced max retries
    const INITIAL_RETRY_DELAY = 500; // Increased initial delay

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || !tab.url.includes('youtube.com/watch')) {
            throw new Error('Not a YouTube video page');
        }

        // Try to ping the content script first
        try {
            await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
        } catch (error) {
            if (retryCount >= MAX_RETRIES) {
                throw new Error('Content script not responding after maximum retries');
            }
            
            // Use exponential backoff
            const delay = INITIAL_RETRY_DELAY * Math.pow(1.5, retryCount);
            console.log(`Content script not ready, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return updateToggleState(isEnabled, retryCount + 1);
        }

        // If ping succeeds, update storage and send toggle command
        await chrome.storage.sync.set({ isEnabled });
        const response = await chrome.tabs.sendMessage(tab.id, { 
            action: 'toggle',
            enabled: isEnabled
        });

        if (!response || !response.success) {
            throw new Error('Toggle command failed');
        }

        return response;
    } catch (error) {
        console.error('Error updating toggle state:', error);
        throw error; // Re-throw to handle in the UI
    }
} 