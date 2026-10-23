/**
 * CyberCheckmate Localization (English & Hindi)
 * Simple, natural Hindi appropriate for Indian users.
 */

export const strings = {
  en: {
    // Brand & App Shell
    appName: 'CyberCheckmate',
    tagline: 'Check any message before it checks you.',
    navDashboard: 'Dashboard',
    navCheck: 'Check',
    navHistory: 'History',
    navRadar: 'Radar',
    navSettings: 'Settings',
    navAdmin: 'Admin',
    switchRoleSignOut: 'Switch role / Sign out',
    signOut: 'Sign out',
    demoDataBadge: 'Demo data',
    roleAdminBadge: 'Admin',
    roleUserBadge: 'User',
    statusMock: 'Mock Mode',
    statusConnected: 'Server connected',
    statusOnline: 'Server connected',
    statusOffline: 'Server offline',
    statusChecking: 'Checking Backend…',

    // Footer
    privacyNotice:
      "We don't store your messages unless you report them. Only the detected warning signs are sent to an AI service to write the explanation.",
    disclaimer:
      'Independent student project, not affiliated with any bank, government body or law enforcement.',

    // Login Page
    loginTitle: 'Welcome to CyberCheckmate',
    userCardTitle: 'Continue as User',
    userCardDesc:
      'Scan suspicious SMS, WhatsApp messages, payment links, and screenshots. No account or password needed.',
    userCardBtn: 'Continue as User',
    adminCardTitle: 'Admin Login',
    adminCardDesc: 'Review flagged scam reports, configure rules, and retrain ML models.',
    adminTokenPlaceholder: 'Enter ADMIN_TOKEN',
    adminSignInBtn: 'Sign in',
    adminSigningIn: 'Signing in…',

    // Dashboard
    dashboardTitle: 'User Dashboard',
    dashboardSubtitle: 'Overview of message safety checks and on-device detection activity.',
    checkSuspiciousBtn: 'Check a suspicious message',
    metricTotal: 'Total Scans',
    metricCheckmate: 'Checkmate (Scam)',
    metricCheck: 'Check (Caution)',
    metricSafe: 'Safe',
    recentActivityTitle: 'Recent Activity',
    onDeviceOnly: 'On-device only',
    noActivityYet:
      'No messages scanned yet. When you scan messages or links, privacy-preserving summaries will appear here on this device.',

    // Check Page
    checkTitle: 'Check a Message',
    checkSubtitle:
      'Scan suspicious SMS, WhatsApp forwards, payment requests, or links before you click.',
    messageLabel: 'Message or SMS Text',
    messagePlaceholder:
      'e.g. Dear customer, your SBI YONO account has been suspended due to pending KYC. Click immediately to update: bit.ly/3x...',
    urlLabel: 'Suspicious Link / URL',
    optionalTag: 'optional',
    urlPlaceholder: 'e.g. sbi-kyc-verify.xyz or https://...',
    screenshotLabel: 'Upload Screenshot',
    checkBtn: 'Check Message',
    checkingBtn: 'Analyzing with CyberCheckmate…',
    validationError: 'Please enter a message, suspicious link, or upload a screenshot to check.',
    selectedFile: 'Selected file:',

    // Flag labels (tactic)
    flag_tactic_authority: 'Pretends to be an official or company',
    flag_tactic_fear: 'Uses threats or fear',
    flag_tactic_urgency: 'Pushes you to act fast',
    flag_tactic_payment_credentials: 'Asks for money, OTP, PIN or passwords',
    flag_tactic_isolation: 'Tells you to keep it secret',
    flag_tactic_reward: 'Promises prizes or easy money',
    // Flag labels (url)
    flag_url_brand_lookalike: 'Link imitates a known brand',
    flag_url_suspicious_tld: 'Unusual website ending',
    flag_url_punycode: 'Link uses look-alike characters',
    flag_url_ip_host: 'Link uses a raw IP address',
    flag_url_shortener: 'Shortened link hides the real site',
    flag_url_many_subdomains: 'Link has many sub-parts',

    // Result Page
    resultTitle: 'Analysis Result',
    resultSubtitle: 'Breakdown of detected threat indicators and advice.',
    checkAnotherBtn: 'Check another message',
    verdictLabel: 'Verdict',
    verdictCheckmate: 'Checkmate: likely scam',
    verdictCheck: 'Check: be careful',
    verdictSafe: 'Safe: looks okay',
    riskScoreLabel: 'Risk Score',
    warningSignsTitle: 'Detected Warning Signs',
    noWarningsFound: 'No explicit warning signs identified.',
    actionRecommendedTitle: 'Recommended Action',
    nextStepsTitle: 'Next Steps',
    call1930: 'Call 1930 Helpline',
    cybercrimePortal: 'cybercrime.gov.in',
    aiExplanationNote: 'Explanation written by AI from the detected warning signs',
    templateExplanationNote: 'Explanation based on matched pattern templates',
    recheckExtractedTextTitle: 'Extracted Screenshot Text',
    recheckBtn: 'Re-check',
    emptyResultMsg: 'No result to show. Check a message first.',

    // History Page
    historyTitle: 'Event History',
    historySubtitle:
      'History is saved only on this device and never includes message texts, URLs, or evidence.',
    clearHistoryBtn: 'Clear history',
    clearHistoryConfirm: 'Clear all on-device scan summaries? This action cannot be undone.',
    noHistoryTitle: 'No History Recorded Yet',
    noHistoryDesc:
      'Checked message summaries will appear here on this device. Your actual messages are never stored.',
    reportedBadge: 'Reported',
    storageUnavailable: 'History storage is not available in this browser session.',
  },

  hi: {
    // Brand & App Shell
    appName: 'साइबरचेकमेट',
    tagline: 'किसी भी संदेश की जांच करें, इससे पहले कि वह आपको ठग ले।',
    navDashboard: 'डैशबोर्ड',
    navCheck: 'जांच करें',
    navHistory: 'इतिहास',
    navRadar: 'रडार',
    navSettings: 'सेटिंग्स',
    navAdmin: 'एडमिन',
    switchRoleSignOut: 'भूमिका बदलें / साइन आउट',
    signOut: 'साइन आउट',
    demoDataBadge: 'डेमो डेटा',
    roleAdminBadge: 'एडमिन',
    roleUserBadge: 'उपयोगकर्ता',
    statusMock: 'डेमो मोड',
    statusConnected: 'सर्वर कनेक्टेड',
    statusOnline: 'सर्वर कनेक्टेड',
    statusOffline: 'सर्वर ऑफलाइन',
    statusChecking: 'सर्वर जांच रहे हैं…',

    // Footer
    privacyNotice:
      "We don't store your messages unless you report them. Only the detected warning signs are sent to an AI service to write the explanation.",
    disclaimer:
      'Independent student project, not affiliated with any bank, government body or law enforcement.',

    // Login Page
    loginTitle: 'साइबरचेकमेट में आपका स्वागत है',
    userCardTitle: 'उपयोगकर्ता के रूप में जारी रखें',
    userCardDesc:
      'संदिग्ध एसएमएस, व्हाट्सएप संदेश, भुगतान लिंक और स्क्रीनशॉट की जांच करें। किसी खाते या पासवर्ड की आवश्यकता नहीं है।',
    userCardBtn: 'उपयोगकर्ता के रूप में जारी रखें',
    adminCardTitle: 'एडमिन लॉगिन',
    adminCardDesc: 'रिपोर्ट की गई धोखाधड़ी की समीक्षा करें, नियम बदलें और मॉडल को फिर से प्रशिक्षित करें।',
    adminTokenPlaceholder: 'ADMIN_TOKEN दर्ज करें',
    adminSignInBtn: 'साइन इन करें',
    adminSigningIn: 'जांच जारी है…',

    // Dashboard
    dashboardTitle: 'उपयोगकर्ता डैशबोर्ड',
    dashboardSubtitle: 'संदेश सुरक्षा जांच और डिवाइस पर मौजूद गतिविधियों का विवरण।',
    checkSuspiciousBtn: 'संदिग्ध संदेश की जांच करें',
    metricTotal: 'कुल जांच',
    metricCheckmate: 'चेकमेट (धोखाधड़ी)',
    metricCheck: 'चेक (सावधानी)',
    metricSafe: 'सुरक्षित',
    recentActivityTitle: 'हाल की गतिविधि',
    onDeviceOnly: 'केवल इस डिवाइस पर',
    noActivityYet:
      'अभी तक कोई संदेश स्कैन नहीं किया गया है। जब आप संदेश या लिंक की जांच करेंगे, तो उनके सुरक्षित सारांश यहां दिखाई देंगे।',

    // Check Page
    checkTitle: 'संदेश की जांच करें',
    checkSubtitle:
      'क्लिक करने से पहले संदिग्ध एसएमएस, व्हाट्सएप संदेश, भुगतान अनुरोध या लिंक की जांच करें।',
    messageLabel: 'संदेश या एसएमएस टेक्स्ट',
    messagePlaceholder:
      'उदा. प्रिय ग्राहक, आपका एसबीआई खाता केवाईसी समाप्त हो गया है। निलंबन रोकने के लिए तुरंत अपडेट करें: bit.ly/3x...',
    urlLabel: 'संदिग्ध लिंक / यूआरएल',
    optionalTag: 'वैकल्पिक',
    urlPlaceholder: 'उदा. sbi-kyc-verify.xyz या https://...',
    screenshotLabel: 'स्क्रीनशॉट अपलोड करें',
    checkBtn: 'संदेश जांचें',
    checkingBtn: 'साइबरचेकमेट विश्लेषण कर रहा है…',
    validationError: 'कृपया जांच के लिए संदेश, संदिग्ध लिंक या स्क्रीनशॉट दर्ज करें।',
    selectedFile: 'चुनी गई फ़ाइल:',

    // Flag labels (tactic)
    flag_tactic_authority: 'किसी अधिकारी या कंपनी का नाटक करता है',
    flag_tactic_fear: 'डर या धमकी का इस्तेमाल करता है',
    flag_tactic_urgency: 'जल्दी करने के लिए दबाव डालता है',
    flag_tactic_payment_credentials: 'पैसे, OTP, PIN या पासवर्ड मांगता है',
    flag_tactic_isolation: 'राज रखने के लिए कहता है',
    flag_tactic_reward: 'इनाम या आसान पैसे का लालच देता है',
    // Flag labels (url)
    flag_url_brand_lookalike: 'लिंक किसी जानी-मानी कंपनी की नकल करता है',
    flag_url_suspicious_tld: 'असामान्य वेबसाइट एक्सटेंशन',
    flag_url_punycode: 'लिंक में दिखावटी अक्षर हैं',
    flag_url_ip_host: 'लिंक में IP एड्रेस है',
    flag_url_shortener: 'छोटा किया गया लिंक असली साइट छिपाता है',
    flag_url_many_subdomains: 'लिंक में बहुत सारे भाग हैं',

    // Result Page
    resultTitle: 'विश्लेषण परिणाम',
    resultSubtitle: 'पहचाने गए खतरों और सलाह का विवरण।',
    checkAnotherBtn: 'दूसरा संदेश जांचें',
    verdictLabel: 'निष्कर्ष',
    verdictCheckmate: 'चेकमेट: धोखाधड़ी की पूरी संभावना',
    verdictCheck: 'चेक: सावधान रहें',
    verdictSafe: 'सुरक्षित: कोई खतरा नहीं मिला',
    riskScoreLabel: 'जोखिम स्कोर',
    warningSignsTitle: 'पहचाने गए चेतावनी संकेत',
    noWarningsFound: 'कोई स्पष्ट चेतावनी संकेत नहीं मिला।',
    actionRecommendedTitle: 'सुझाई गई कार्रवाई',
    nextStepsTitle: 'अगले कदम',
    call1930: 'हेल्पलाइन 1930 पर कॉल करें',
    cybercrimePortal: 'cybercrime.gov.in',
    aiExplanationNote: 'पहचाने गए चेतावनी संकेतों के आधार पर एआई द्वारा लिखी गई व्याख्या',
    templateExplanationNote: 'पहचाने गए पैटर्न के आधार पर मानक व्याख्या',
    recheckExtractedTextTitle: 'स्क्रीनशॉट से निकाला गया टेक्स्ट',
    recheckBtn: 'पुनः जांचें',
    emptyResultMsg: 'दिखाने के लिए कोई परिणाम नहीं है। पहले संदेश की जांच करें।',

    // History Page
    historyTitle: 'गतिविधि इतिहास',
    historySubtitle:
      'इतिहास केवल इस डिवाइस पर सुरक्षित रहता है और इसमें कभी भी संदेश, लिंक या साक्ष्य शामिल नहीं होते।',
    clearHistoryBtn: 'इतिहास साफ़ करें',
    clearHistoryConfirm: 'क्या आप इस डिवाइस पर सहेजे गए सभी सारांश हटाना चाहते हैं?',
    noHistoryTitle: 'अभी तक कोई इतिहास नहीं है',
    noHistoryDesc:
      'जांच किए गए संदेशों के सारांश केवल आपके डिवाइस पर दिखाई देंगे। आपके वास्तविक संदेश कभी सहेजे नहीं जाते।',
    reportedBadge: 'रिपोर्ट किया गया',
    storageUnavailable: 'इस ब्राउज़र में स्टोरेज उपलब्ध नहीं है।',
  },
}

/**
 * Reads stored language from localStorage key 'cc_lang'.
 * Defaults to 'en'.
 */
export function getStoredLang() {
  try {
    return localStorage.getItem('cc_lang') || 'en'
  } catch {
    return 'en'
  }
}

/**
 * Persists language choice to localStorage key 'cc_lang'.
 */
export function setStoredLang(lang) {
  try {
    localStorage.setItem('cc_lang', lang === 'hi' ? 'hi' : 'en')
  } catch {
    // storage disabled or unavailable
  }
}

/**
 * Returns localized string for given key.
 */
export function t(key, lang = 'en') {
  const chosen = lang === 'hi' ? 'hi' : 'en'
  return strings[chosen]?.[key] || strings.en[key] || key
}
