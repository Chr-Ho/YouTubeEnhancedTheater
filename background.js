// Handle toolbar icon clicks
chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes('youtube.com/watch')) {
        chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
    }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
    if (command === 'toggle-theater-mode') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0].url.includes('youtube.com/watch')) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' });
            }
        });
    }
}); 