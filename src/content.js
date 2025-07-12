// Arabic letter mapping - dots removed
const arabicMapping = {
    // Letters with dots above
    'ت': 'ٮ', // teh -> beh without dots
    'ث': 'ٮ', // theh -> beh without dots
    'ن': 'ں', // noon -> noon without dots
    'ي': 'ى', // yeh -> dotless yeh (alef maksura)
    'ی': 'ى', // Farsi yeh -> dotless yeh (alef maksura) ىںعلٯ
    'ة': 'ه', // teh marbuta -> heh

    // Letters with dots below
    'ب': 'ٮ', // beh -> beh without dots
    'ج': 'ح', // jeem -> hah
    'چ': 'ح', // cheh -> hah
    'خ': 'ح', // khah -> hah
    'ذ': 'د', // thal -> dal
    'ز': 'ر', // zain -> reh
    'ژ': 'ر', // zheh -> reh
    'ش': 'س', // sheen -> seen
    'ض': 'ص', // dad -> sad
    'ظ': 'ط', // zah -> tah
    'غ': 'ع', // ghain -> ain
    'ف': 'ڡ', // feh -> feh without dots
    'ڤ': 'ڡ', // veh -> feh without dots
    'ق': 'ٯ', // qaf -> qaf without dots
    'ڨ': 'ٯ', // qaf variant -> qaf without dots

    // Additional forms
    'ئ': 'ی', // yeh with hamza -> yeh without dots
    'ڭ': 'ك', // ng -> kaf
    'ݣ': 'ک', // gaf -> kaf
    'ك': 'ك', // kaf (already without dots)
    'ؤ': 'و', // waw with hamza -> waw
    'أ': 'ا', // alef with hamza above -> alef
    'إ': 'ا', // alef with hamza below -> alef
    'آ': 'ا', // alef with madda -> alef

    // Diacritical marks removal (vowel marks - also later additions)
    'َ': '', // fatha -> removed
    'ِ': '', // kasra -> removed
    'ُ': '', // damma -> removed
    'ً': '', // fathatan -> removed
    'ٍ': '', // kasratan -> removed
    'ٌ': '', // dammatan -> removed
    'ْ': '', // sukun -> removed
    'ّ': '', // shadda -> removed
    'ٰ': '', // alef khanjariyah -> removed
    'ٱ': 'ا', // alef wasla -> alef
    'ٖ': '', // small high seen -> removed
    'ٗ': '', // small high qaf -> removed
    '٘': '', // small high noon -> removed
    'ٙ': '', // small alef -> removed
    'ٚ': '', // small yeh -> removed
    'ٛ': '', // small waw -> removed
    'ٜ': '', // small yeh -> removed
    'ٝ': '', // madda above -> removed
    'ٞ': '', // hamza above -> removed
    'ٟ': '', // hamza below -> removed

    // Arabic punctuation marks removal
    // '؛': '', // Arabic semicolon -> removed
    // ':': '', // Arabic semicolon -> removed
    // '؞': '', // Arabic triple dot punctuation mark -> removed
    // '؟': '', // Arabic question mark -> removed
    // '۔': '', // Arabic full stop -> removed
};

// Character mapping dictionaries for different positions
const contextMappings = {
    beginning: {
        'ن': 'ٮ'
    },
    middle: {
        'ن': 'ٮ'
    },
    end: {
        'ن': 'ں'
    },
    alone: {
        'ن': 'ں'
    }
};

let isEnabled = true;
let originalTexts = new Map();
const browser = chrome || browser;

// Get initial state from background script
browser.runtime.sendMessage({
    action: 'getCurrentDomainState',
    url: window.location.href
}, function (response) {
    if (response) {
        isEnabled = response.enabled;
        if (isEnabled) {
            processAllText();
        }
    }
});

// Function to replace characters contextually
function replaceCharactersContextually(text) {
    // Replace characters standing alone (surrounded by whitespace or at boundaries)
    text = text.replace(/(?<=^|\s|[^\w\u0600-\u06FF])\S(?=\s|[^\w\u0600-\u06FF]|$)/g, char => contextMappings.alone[char] || char);

    // Replace characters at word boundaries (end of words)
    text = text.replace(/\S(?=\s|[^\w\u0600-\u06FF]|$)/g, char => contextMappings.end[char] || char);

    // Replace characters at word boundaries (beginning of words)
    text = text.replace(/(?<=^|\s|[^\w\u0600-\u06FF])\S/g, char => contextMappings.beginning[char] || char);

    // Replace any remaining characters (middle of words)
    text = text.replace(/\S/g, char => contextMappings.middle[char] || char);

    return text;
}

function removeDots(text) {
    return replaceCharactersContextually(text).replace(/\S/g, char => arabicMapping[char] !== undefined ? arabicMapping[char] : char);
}
// Shared check to decide whether a text node should be processed
function shouldProcessTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE || !node.parentElement) return false;

    const parent = node.parentElement;
    const tagName = parent.tagName.toLowerCase();

    if (['script', 'style', 'noscript', 'textarea', 'input'].includes(tagName)) {
        return false;
    }

    if (parent.closest('[contenteditable="true"], textarea, input')) {
        return false;
    }

    if (parent.closest('[aria-live]')) {
        return false;
    }

    const style = window.getComputedStyle(parent);
    if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
    }

    return true;
}

// Use in MutationObserver and TreeWalker
function processTextNode(node) {
    if (!shouldProcessTextNode(node)) return;

    const originalText = node.textContent;
    if (!originalText.trim()) return;

    if (!originalTexts.has(node)) {
        originalTexts.set(node, originalText);
    }

    if (isEnabled) {
        const processedText = removeDots(originalText);
        if (processedText !== originalText) {
            node.textContent = processedText;
        }
    }
}

function processAllText() {
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: shouldProcessTextNode
                ? (node) => shouldProcessTextNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
                : NodeFilter.FILTER_REJECT
        }
    );

    let node;
    while (node = walker.nextNode()) {
        processTextNode(node);
    }
}


function restoreOriginalText() {
    originalTexts.forEach((originalText, node) => {
        if (node.parentNode) {
            node.textContent = originalText;
        }
    });
}

function toggleDotRemoval() {
    if (isEnabled) {
        restoreOriginalText();
        isEnabled = false;
    } else {
        isEnabled = true;
        processAllText();
    }
}

// Initial processing - wait for state from background
// (removed automatic processing since we now get state from background)

// Listen for dynamic content changes
const observer = new MutationObserver(mutations => {
    if (!isEnabled) return;

    mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) {
                    processTextNode(node);
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const walker = document.createTreeWalker(
                        node,
                        NodeFilter.SHOW_TEXT,
                        null,
                        false
                    );
                    let textNode;
                    while (textNode = walker.nextNode()) {
                        processTextNode(textNode);
                    }
                }
            });
        }
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Listen for messages from popup and background script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggle') {
        toggleDotRemoval();
        sendResponse({ enabled: isEnabled });
    } else if (request.action === 'setEnabled') {
        const wasEnabled = isEnabled;
        isEnabled = request.enabled;
        
        if (isEnabled && !wasEnabled) {
            // Enable: process all text
            processAllText();
        } else if (!isEnabled && wasEnabled) {
            // Disable: restore original text
            restoreOriginalText();
        }

        sendResponse({ enabled: isEnabled });
    }
});