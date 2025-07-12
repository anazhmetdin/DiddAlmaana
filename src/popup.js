document.addEventListener('DOMContentLoaded', function () {
    const browser = chrome || browser;
    const domainBtn = document.getElementById('domainBtn');
    const globalBtn = document.getElementById('globalBtn');
    const removeDomainBtn = document.getElementById('removeDomainBtn');
    const domainInfo = document.getElementById('domainInfo');
    const domainStatus = document.getElementById('domainStatus');
    const globalStatus = document.getElementById('globalStatus');

    let currentState = {
        enabled: true,
        domain: '',
        globalEnabled: true,
        hasCustomSetting: false
    };

    // Get current tab and domain state
    browser.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const currentTab = tabs[0];

        browser.runtime.sendMessage({
            action: 'getCurrentDomainState',
            url: currentTab.url
        }, function (response) {
            if (response) {
                currentState = response;
                updateUI();
            }
        });
    });

    document.getElementById('optionsBtn').addEventListener('click', () => {
        if (browser.runtime.openOptionsPage) {
            browser.runtime.openOptionsPage();
        } else {
            window.open(browser.runtime.getURL('options.html'));
        }
    });

    function updateUI() {
        // Update domain info
        domainInfo.textContent = currentState.domain || 'غير محدد';

        // Update global button
        if (currentState.globalEnabled) {
            globalBtn.textContent = 'إيقاف';
            globalBtn.classList.remove('disabled');
            globalBtn.classList.add('enabled');
            globalStatus.textContent = 'مفعل';
        } else {
            globalBtn.textContent = 'تفعيل';
            globalBtn.classList.remove('enabled');
            globalBtn.classList.add('disabled');
            globalStatus.textContent = 'متوقف';
        }

        // Update domain button
        if (currentState.hasCustomSetting) {
            if (currentState.enabled) {
                domainBtn.textContent = 'إيقاف لهذا الموقع';
                domainBtn.classList.remove('disabled', 'neutral');
                domainBtn.classList.add('enabled');
                domainStatus.textContent = 'مفعل خصيصاً لهذا الموقع';
            } else {
                domainBtn.textContent = 'تفعيل لهذا الموقع';
                domainBtn.classList.remove('enabled', 'neutral');
                domainBtn.classList.add('disabled');
                domainStatus.textContent = 'متوقف خصيصاً لهذا الموقع';
            }
            removeDomainBtn.classList.remove('hidden');
        } else {
            removeDomainBtn.classList.add('hidden');
            domainBtn.textContent = 'تخصيص لهذا الموقع';
            domainBtn.classList.remove('enabled', 'disabled');
            domainBtn.classList.add('neutral');
            domainStatus.textContent = currentState.enabled ?
                'يتبع الإعداد العام (مفعل)' :
                'يتبع الإعداد العام (متوقف)';
        }
    }

    // Handle global button click
    globalBtn.addEventListener('click', function () {
        browser.runtime.sendMessage({ action: 'toggleGlobal' }, function (response) {
            if (response) {
                currentState.globalEnabled = response.enabled;
                if (!currentState.hasCustomSetting) {
                    currentState.enabled = response.enabled;
                }
                updateUI();
            }
        });
    });

    // Handle remove domain button click
    removeDomainBtn.addEventListener('click', function () {
        if (!currentState.domain || !currentState.hasCustomSetting) return;

        browser.runtime.sendMessage({
            action: 'setDomainSetting',
            domain: currentState.domain,
            enabled: null
        }, function (response) {
            if (response && response.success) {
                // Reset custom setting
                currentState.hasCustomSetting = false;
                currentState.enabled = currentState.globalEnabled;
                updateUI();
            }
        });
    });

    // Handle domain button click
    domainBtn.addEventListener('click', function () {
        if (!currentState.domain) return;

        let newSetting;
        if (currentState.hasCustomSetting) {
            // Toggle current domain setting
            newSetting = !currentState.enabled;
        } else {
            // Create new domain setting (opposite of global)
            newSetting = !currentState.globalEnabled;
        }

        browser.runtime.sendMessage({
            action: 'setDomainSetting',
            domain: currentState.domain,
            enabled: newSetting
        }, function (response) {
            if (response && response.success) {
                // Update state                
                currentState.hasCustomSetting = true;
                currentState.enabled = newSetting;
                updateUI();
            }
        });
    });

    // Listen for storage changes and reload settings if relevant keys changed
    browser.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync') {
            const relevantKeys = ['arabicDotRemoverEnabled', 'arabicDomainSettings'];
            const shouldReload = relevantKeys.some(key => changes.hasOwnProperty(key));
            if (shouldReload) {
                updateUI();
            }
        }
    });
});