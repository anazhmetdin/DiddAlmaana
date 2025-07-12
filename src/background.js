let globalEnabled = true;
let domainSettings = {};
chrome = chrome || browser;

function injectAndSend(tab) {
    if (!isSupportedUrl(tab.url)) return;

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
    }, () => {
        if (chrome.runtime.lastError) {
            console.error(`Injection failed for ${tab.url}:`, chrome.runtime.lastError.message);
        } else {
            const domain = getDomainFromUrl(tab.url);
            const enabled = isEnabledForDomain(domain);
            chrome.tabs.sendMessage(tab.id, {
                action: 'setEnabled',
                enabled: enabled
            });
        }
    });
}

chrome.tabs.query({}, (tabs) => {
    tabs.forEach(injectAndSend);
});

// Load saved state on startup
chrome.storage.sync.get(['arabicDotRemoverEnabled', 'arabicDomainSettings'], (result) => {
    globalEnabled = result.arabicDotRemoverEnabled !== undefined ? result.arabicDotRemoverEnabled : true;
    domainSettings = result.arabicDomainSettings || {};
});

// Helper: Extract domain from URL
function getDomainFromUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch (e) {
        return null;
    }
}

// Helper: Determine if enabled for domain
function isEnabledForDomain(domain) {
    if (!domain) return globalEnabled;

    if (domainSettings.hasOwnProperty(domain)) {
        return domainSettings[domain];
    }

    const parts = domain.split('.');
    for (let i = 1; i < parts.length; i++) {
        const parentDomain = parts.slice(i).join('.');
        if (domainSettings.hasOwnProperty(parentDomain)) {
            return domainSettings[parentDomain];
        }
    }

    return globalEnabled;
}

// Helper: Determine if URL is supported
function isSupportedUrl(url) {
    return url &&
        !url.startsWith('chrome://') &&
        !url.startsWith('chrome-extension://') &&
        !url.startsWith('edge://') &&
        !url.startsWith('about://') &&
        !url.startsWith('https://chrome.google') &&
        !url.startsWith('https://chromewebstore.google');
}

// Helper: Update single tab
function updateSingleTab(tabId, url) {
    if (!isSupportedUrl(url)) return;

    const domain = getDomainFromUrl(url);
    const enabled = isEnabledForDomain(domain);

    chrome.tabs.sendMessage(tabId, {
        action: 'setEnabled',
        enabled: enabled
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.warn(`No content script in tab ${url}: ${chrome.runtime.lastError.message}`);
        }
    });
}

// Helper: Update all tabs
function updateAllTabs(filterDomain = null) {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (!isSupportedUrl(tab.url)) return;
            const domain = getDomainFromUrl(tab.url);
            if (!filterDomain || domain === filterDomain) {
                updateSingleTab(tab.id, tab.url);
            }
        });
    });
}

// Click on icon handler
chrome.action.onClicked.addListener((tab) => {
    globalEnabled = !globalEnabled;
    chrome.storage.sync.set({ arabicDotRemoverEnabled: globalEnabled });
    updateAllTabs();
});

// Handle tab updates (like page loads)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && isSupportedUrl(tab.url)) {
        updateSingleTab(tabId, tab.url);
    }
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getGlobalState') {
        sendResponse({ enabled: globalEnabled });

    } else if (request.action === 'getCurrentDomainState') {
        const domain = getDomainFromUrl(request.url);
        const enabled = isEnabledForDomain(domain);
        sendResponse({
            enabled: enabled,
            domain: domain,
            globalEnabled: globalEnabled,
            hasCustomSetting: domainSettings.hasOwnProperty(domain)
        });

    } else if (request.action === 'toggleGlobal') {
        globalEnabled = !globalEnabled;
        chrome.storage.sync.set({ arabicDotRemoverEnabled: globalEnabled });
        updateAllTabs();
        sendResponse({ enabled: globalEnabled });

    } else if (request.action === 'setDomainSetting') {
        const { domain, enabled } = request;
        if (enabled === null) {
            delete domainSettings[domain];
        } else {
            domainSettings[domain] = enabled;
        }
        chrome.storage.sync.set({ arabicDomainSettings: domainSettings });
        updateAllTabs(domain);
        sendResponse({ success: true });
    }

    return true; // To allow async `sendResponse`
});
