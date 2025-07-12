// Options page JavaScript
document.addEventListener('DOMContentLoaded', function () {
    const browser = chrome || browser;
    const globalToggle = document.getElementById('globalToggle');
    const globalStatus = document.getElementById('globalStatus');
    const domainInput = document.getElementById('domainInput');
    const addDomainBtn = document.getElementById('addDomainBtn');
    const domainList = document.getElementById('domainList');
    const emptyState = document.getElementById('emptyState');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    const resetBtn = document.getElementById('resetBtn');
    const notification = document.getElementById('notification');

    // Statistics elements
    const totalDomains = document.getElementById('totalDomains');
    const enabledDomains = document.getElementById('enabledDomains');
    const disabledDomains = document.getElementById('disabledDomains');

    let globalEnabled = true;
    let domainSettings = {};

    // Initialize page
    loadSettings();

    // Load settings from storage
    function loadSettings() {
        browser.storage.sync.get(['arabicDotRemoverEnabled', 'arabicDomainSettings'], function (result) {
            globalEnabled = result.arabicDotRemoverEnabled !== undefined ? result.arabicDotRemoverEnabled : true;
            domainSettings = result.arabicDomainSettings || {};

            updateGlobalUI();
            updateDomainList();
            updateStats();
        });
    }

    // Update global toggle UI
    function updateGlobalUI() {
        if (globalEnabled) {
            globalToggle.textContent = 'إيقاف لجميع المواقع';
            globalToggle.classList.remove('disabled');
            globalStatus.textContent = 'مفعل افتراضياً لجميع المواقع';
        } else {
            globalToggle.textContent = 'تفعيل لجميع المواقع';
            globalToggle.classList.add('disabled');
            globalStatus.textContent = 'معطل افتراضياً لجميع المواقع';
        }
    }

    // Update domain list display
    function updateDomainList() {
        domainList.innerHTML = '';

        const domains = Object.keys(domainSettings);

        if (domains.length === 0) {
            domainList.appendChild(emptyState);
            return;
        }

        domains.sort().forEach(domain => {
            const enabled = domainSettings[domain];
            const domainItem = createDomainItem(domain, enabled);
            domainList.appendChild(domainItem);
        });
    }

    // Create domain item element
    function createDomainItem(domain, enabled) {
        const item = document.createElement('div');
        item.className = 'domain-item';

        const domainName = document.createElement('div');
        domainName.className = 'domain-name';
        domainName.textContent = domain;

        const status = document.createElement('div');
        status.className = 'domain-status';
        status.textContent = enabled ? 'مفعل' : 'معطل';

        const controls = document.createElement('div');
        controls.className = 'domain-controls';

        // Enable button
        const enableBtn = document.createElement('button');
        enableBtn.className = 'small-btn enable-btn';
        enableBtn.textContent = 'تفعيل';
        enableBtn.onclick = () => updateDomainSetting(domain, true);

        // Disable button
        const disableBtn = document.createElement('button');
        disableBtn.className = 'small-btn disable-btn';
        disableBtn.textContent = 'إيقاف';
        disableBtn.onclick = () => updateDomainSetting(domain, false);

        // Remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'small-btn remove-btn';
        removeBtn.textContent = 'حذف';
        removeBtn.onclick = () => removeDomain(domain);

        controls.appendChild(enableBtn);
        controls.appendChild(disableBtn);
        controls.appendChild(removeBtn);

        item.appendChild(domainName);
        item.appendChild(status);
        item.appendChild(controls);

        return item;
    }

    // Update statistics
    function updateStats() {
        const domains = Object.keys(domainSettings);
        const enabled = domains.filter(domain => domainSettings[domain]).length;
        const disabled = domains.length - enabled;

        totalDomains.textContent = domains.length;
        enabledDomains.textContent = enabled;
        disabledDomains.textContent = disabled;
    }

    // Show notification
    function showNotification(message, isError = false) {
        notification.textContent = message;
        notification.className = 'notification' + (isError ? ' error' : '');
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Validate domain format
    function isValidDomain(domain) {
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        return domainRegex.test(domain);
    }

    // Add new domain
    function addDomain() {
        const domain = domainInput.value.trim().toLowerCase();

        if (!domain) {
            showNotification('يرجى إدخال اسم الموقع', true);
            return;
        }

        if (!isValidDomain(domain)) {
            showNotification('اسم الموقع غير صحيح', true);
            return;
        }

        if (domainSettings.hasOwnProperty(domain)) {
            showNotification('هذا الموقع موجود بالفعل', true);
            return;
        }

        // Add with opposite of global setting
        const enabled = !globalEnabled;
        updateDomainSetting(domain, enabled);

        domainInput.value = '';
        showNotification(`تم إضافة الموقع: ${domain}`);
    }

    // Update domain setting
    function updateDomainSetting(domain, enabled) {
        domainSettings[domain] = enabled;

        // Save to storage
        browser.storage.sync.set({ arabicDomainSettings: domainSettings });

        // Send message to background script
        browser.runtime.sendMessage({
            action: 'setDomainSetting',
            domain: domain,
            enabled: enabled
        });

        updateDomainList();
        updateStats();
    }

    // Remove domain
    function removeDomain(domain) {
        if (confirm(`هل تريد حذف الموقع: ${domain}؟`)) {
            delete domainSettings[domain];

            // Save to storage
            browser.storage.sync.set({ arabicDomainSettings: domainSettings });

            // Send message to background script
            browser.runtime.sendMessage({
                action: 'setDomainSetting',
                domain: domain,
                enabled: null
            });

            updateDomainList();
            updateStats();
            showNotification(`تم حذف الموقع: ${domain}`);
        }
    }

    // Toggle global setting
    function toggleGlobal() {
        globalEnabled = !globalEnabled;

        // Save to storage
        browser.storage.sync.set({ arabicDotRemoverEnabled: globalEnabled });

        // Send message to background script
        browser.runtime.sendMessage({ action: 'toggleGlobal' });

        updateGlobalUI();
        showNotification(globalEnabled ? 'تم تفعيل الإعداد العام' : 'تم إيقاف الإعداد العام');
    }

    // Export settings
    function exportSettings() {
        const settings = {
            globalEnabled: globalEnabled,
            domainSettings: domainSettings,
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'arabic-dot-remover-settings.json';
        link.click();

        showNotification('تم تصدير الإعدادات');
    }

    // Import settings
    function importSettings() {
        importFile.click();
    }

    // Handle file import
    function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const settings = JSON.parse(e.target.result);

                if (settings.globalEnabled !== undefined && settings.domainSettings !== undefined) {
                    globalEnabled = settings.globalEnabled;
                    domainSettings = settings.domainSettings;

                    // Save to storage
                    browser.storage.sync.set({
                        arabicDotRemoverEnabled: globalEnabled,
                        arabicDomainSettings: domainSettings
                    });

                    // Update UI
                    updateGlobalUI();
                    updateDomainList();
                    updateStats();

                    showNotification('تم استيراد الإعدادات بنجاح');
                } else {
                    showNotification('ملف الإعدادات غير صحيح', true);
                }
            } catch (error) {
                showNotification('خطأ في قراءة الملف', true);
            }
        };

        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    }

    // Reset all settings
    function resetSettings() {
        if (confirm('هل تريد حذف جميع الإعدادات؟ لا يمكن التراجع عن هذا الإجراء.')) {
            globalEnabled = true;
            domainSettings = {};

            // Clear storage
            browser.storage.sync.clear();

            // Set default global setting
            browser.storage.sync.set({ arabicDotRemoverEnabled: true });

            // Update UI
            updateGlobalUI();
            updateDomainList();
            updateStats();

            showNotification('تم إعادة تعيين جميع الإعدادات');
        }
    }

    // Event listeners
    globalToggle.addEventListener('click', toggleGlobal);
    addDomainBtn.addEventListener('click', addDomain);
    domainInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addDomain();
        }
    });
    exportBtn.addEventListener('click', exportSettings);
    importBtn.addEventListener('click', importSettings);
    importFile.addEventListener('change', handleFileImport);
    resetBtn.addEventListener('click', resetSettings);

    // Listen for storage changes and reload settings if relevant keys changed
    browser.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync') {
            const relevantKeys = ['arabicDotRemoverEnabled', 'arabicDomainSettings'];
            const shouldReload = relevantKeys.some(key => changes.hasOwnProperty(key));
            if (shouldReload) {
                loadSettings();
            }
        }
    });
});