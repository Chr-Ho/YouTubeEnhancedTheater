// Handle toolbar icon clicks
chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes('youtube.com/watch')) {
        chrome.tabs.sendMessage(tab.id, { action: 'toggle' })
            .catch(error => {
                console.error('Error handling icon click:', error);
            });
    }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-theater-mode') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (tab && tab.url.includes('youtube.com/watch')) {
                // First, check if content script is ready
                chrome.tabs.sendMessage(tab.id, { action: 'ping' })
                    .then(() => {
                        // Content script is ready, send toggle command
                        return chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
                    })
                    .then(response => {
                        if (response && response.success) {
                            chrome.storage.sync.set({ isEnabled: response.state });
                        }
                    })
                    .catch(() => {
                        // If content script isn't ready, reload the tab and try again
                        chrome.tabs.reload(tab.id, {}, () => {
                            // Wait for page to load before trying again
                            setTimeout(() => {
                                chrome.tabs.sendMessage(tab.id, { action: 'toggle' })
                                    .then(response => {
                                        if (response && response.success) {
                                            chrome.storage.sync.set({ isEnabled: response.state });
                                        }
                                    })
                                    .catch(error => {
                                        console.error('Error after reload:', error);
                                    });
                            }, 2000); // Wait 2 seconds after reload
                        });
                    });
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