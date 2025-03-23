// Track tabs with ready content scripts
let readyTabs = new Set();
let pendingRetries = new Map(); // Track retry attempts per tab

// Listen for navigation events
chrome.webNavigation.onCompleted.addListener((details) => {
    // Only care about main frame navigation
    if (details.frameId === 0) {
        console.log('Navigation completed in tab:', details.tabId);
        readyTabs.delete(details.tabId);
        pendingRetries.delete(details.tabId);
    }
});

chrome.runtime.onMessage.addListener((request, sender) => {
    if (request.action === 'contentScriptReady') {
        console.log('Content script ready in tab:', sender.tab.id);
        readyTabs.add(sender.tab.id);
        pendingRetries.delete(sender.tab.id);
    }
});

// Clean up closed tabs
chrome.tabs.onRemoved.addListener((tabId) => {
    console.log('Tab closed, removing from ready set:', tabId);
    readyTabs.delete(tabId);
    pendingRetries.delete(tabId);
});

async function sendToggleCommand(tabId, retryCount = 0) {
    const MAX_RETRIES = 10; // Maximum number of retry attempts
    const INITIAL_RETRY_DELAY = 200; // Start with a shorter delay
    
    console.log(`Attempting to send toggle command to tab: ${tabId} (attempt ${retryCount + 1})`);
    console.log('Is tab ready?', readyTabs.has(tabId));
    
    if (readyTabs.has(tabId)) {
        try {
            const response = await chrome.tabs.sendMessage(tabId, { action: 'toggle' });
            if (response && response.success) {
                chrome.storage.sync.set({ isEnabled: response.state });
                console.log('Toggle command successful, new state:', response.state);
                pendingRetries.delete(tabId);
            }
        } catch (error) {
            console.error('Error sending toggle command:', error);
            handleToggleError(tabId, retryCount);
        }
    } else {
        handleToggleError(tabId, retryCount);
    }
}

function handleToggleError(tabId, retryCount) {
    const MAX_RETRIES = 10;
    const INITIAL_RETRY_DELAY = 200;
    
    if (retryCount < MAX_RETRIES) {
        // Exponential backoff with initial delay of 200ms
        const delay = INITIAL_RETRY_DELAY * Math.pow(1.5, retryCount);
        console.log(`Tab not ready, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
        
        // Only schedule a retry if there isn't already one pending for this tab
        if (!pendingRetries.has(tabId)) {
            pendingRetries.set(tabId, setTimeout(() => {
                pendingRetries.delete(tabId);
                sendToggleCommand(tabId, retryCount + 1);
            }, delay));
        }
    } else {
        console.log(`Max retries (${MAX_RETRIES}) reached for tab ${tabId}`);
        pendingRetries.delete(tabId);
    }
}

// Handle toolbar icon clicks
chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes('youtube.com/watch')) {
        sendToggleCommand(tab.id);
    }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-theater-mode') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (tab && tab.url.includes('youtube.com/watch')) {
                sendToggleCommand(tab.id);
            }
        });
    }
});

// Listen for shortcut changes
chrome.storage.onChanged.addListener((changes) => {
    if (changes.shortcutModifier || changes.shortcutKey) {
        updateShortcut();
    }
});

async function updateShortcut() {
    try {
        const data = await chrome.storage.sync.get(['shortcutModifier', 'shortcutKey']);
        if (data.shortcutModifier && data.shortcutKey) {
            console.log('New shortcut:', `${data.shortcutModifier}+${data.shortcutKey}`);
        }
    } catch (error) {
        console.error('Error updating shortcut:', error);
    }
} 