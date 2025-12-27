// ========================================
// DJHAKK Configuration
// ========================================

// ========================================
// UI Labels (Centralized for easy maintenance)
// ========================================
const LABELS = {
    // Common Actions
    back: 'Back',
    save: 'SAVE',
    edit: 'EDIT',
    create: 'Create',
    add: 'Add',
    cancel: 'Cancel',
    done: 'Done',
    buy: 'Buy',
    apply: 'Apply',
    reserve: 'Reserve',
    share: 'Share',
    confirm: 'Confirm',
    
    // Auth
    logIn: 'Log in',
    logOut: 'LOG OUT',
    newAccount: 'New',
    loginFailed: 'Login failed',
    registrationFailed: 'Registration failed',
    googleLoginFailed: 'Google login failed',
    accountCreated: 'Account created',
    
    // Form Labels
    mailAddress: 'Mail Address',
    password: 'Password',
    name: 'NAME',
    title: 'TITLE',
    
    // Navigation
    home: 'Home',
    event: 'Event',
    production: 'Production',
    place: 'Place',
    profile: 'Profile',
    
    // Event Types
    eventTypes: {
        A: 'TIMETABLE',
        B: 'GUARANTEE(ｷﾞｬﾗ)',
        C: 'FLYER'
    },
    
    // Production Types
    productionTypes: {
        audio: 'DOWNLOAD SALES',
        goods: 'ITEM SALES',
        produce: 'SELF PRODUCE'
    },
    
    // Place Types
    placeTypes: {
        place: 'PLACE',
        agency: 'AGENCY',
        shop: 'SHOP'
    },
    
    // Create Page Type Cards
    createTypes: {
        A: { label: 'TIMETABLE', desc: 'Timetable sales' },
        B: { label: 'GUARANTEE(ｷﾞｬﾗ)', desc: 'Pay guarantee' },
        C: { label: 'FLYER', desc: 'Information' },
        audio: { label: 'DOWNLOAD SALES', desc: 'Download sales' },
        goods: { label: 'ITEM SALES', desc: 'Item sales' },
        produce: { label: 'SELF PRODUCE', desc: 'Self Produce' },
        place: { label: 'PLACE', desc: 'Venue/Club' },
        agency: { label: 'AGENCY', desc: 'Agency/Management' },
        shop: { label: 'SHOP', desc: 'Shop/Store' }
    },
    
    // Area/Region
    area: 'AREA',
    allArea: 'ALL AREA',
    selectArea: 'Select Area',
    
    // Profile
    myProfile: 'MY PROFILE',
    myEvent: 'MY EVENT',
    profilePicture: 'PROFILE PICTURE',
    changeImage: 'Change image',
    bio: 'Bio',
    snsLink: 'SNS LINK',
    dm: 'DM',
    
    // Event/Production Pages
    date: 'DATE',
    location: '@',
    organizer: 'ORGANIZER',
    applicants: 'Applicants',
    
    // Slot
    slot: 'Slot',
    capacity: 'Capacity',
    full: 'FULL',
    free: 'FREE',
    tbd: 'TBD',
    na: 'N/A',
    
    // Days
    days: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
    
    // Time
    startTime: 'Start Time',
    endTime: 'End Time',
    
    // Search
    eventSearch: 'EVENT SEARCH',
    productionSearch: 'PRODUCTION SEARCH',
    placeSearch: 'PLACE SEARCH',
    
    // Filters
    all: 'All',
    type: 'Type',
    
    // Empty States
    noEvents: 'No events',
    noArtists: 'No artists',
    noProductions: 'No productions',
    noPlaces: 'No places',
    noUpcomingEvents: 'No upcoming events',
    noMessages: 'No messages',
    
    // Misc
    you: 'You',
    comingSoon: 'Coming soon',
    urlCopied: 'URL copied',
    failedToStartChat: 'Failed to start chat',
    
    // TimeLine
    timeline: 'TimeLine',
    tweet: 'Tweet',
    tweetPlaceholder: "What's happening?",
    post: 'Post',
    noTweets: 'No posts yet',
    comments: 'Comments',
    addComment: 'Add a comment...',
    send: 'Send',
    liked: 'Liked',
    commented: 'Commented'
};

// ========================================
// App Configuration
// ========================================
const APP_URL = location.origin;

// ========================================
// Currency Configuration
// ========================================
const CURRENCY_CONFIG = {
    jpy: { symbol: '¥', decimal: false, name: '日本円' },
    usd: { symbol: '$', decimal: true, name: '米ドル' },
    eur: { symbol: '€', decimal: true, name: 'ユーロ' },
    gbp: { symbol: '£', decimal: true, name: '英ポンド' },
    krw: { symbol: '₩', decimal: false, name: '韓国ウォン' },
    cny: { symbol: '¥', decimal: true, name: '中国元' },
    hkd: { symbol: 'HK$', decimal: true, name: '香港ドル' },
    thb: { symbol: '฿', decimal: true, name: 'タイバーツ' },
    sgd: { symbol: 'S$', decimal: true, name: 'シンガポールドル' },
    twd: { symbol: 'NT$', decimal: false, name: '台湾ドル' }
};

const REGION_CURRENCY_MAP = {
    'TOKYO': 'jpy', 'OSAKA': 'jpy', 'NAGOYA': 'jpy', 'FUKUOKA': 'jpy', 'OKINAWA': 'jpy',
    'SEOUL': 'krw', 'SHANGHAI': 'cny', 'HONG KONG': 'hkd', 'BANGKOK': 'thb', 'SINGAPORE': 'sgd',
    'NEW YORK': 'usd', 'LOS ANGELES': 'usd', 'MIAMI': 'usd', 'CHICAGO': 'usd', 'LAS VEGAS': 'usd',
    'BERLIN': 'eur', 'LONDON': 'gbp', 'AMSTERDAM': 'eur', 'IBIZA': 'eur', 'PARIS': 'eur', 'BARCELONA': 'eur'
};

// ========================================
// Regions List
// ========================================
const REGIONS = [
    { group: 'JAPAN', cities: ['TOKYO', 'OSAKA', 'NAGOYA', 'FUKUOKA', 'OKINAWA'] },
    { group: 'ASIA', cities: ['SEOUL', 'SHANGHAI', 'HONG KONG', 'BANGKOK', 'SINGAPORE'] },
    { group: 'NORTH AMERICA', cities: ['NEW YORK', 'LOS ANGELES', 'MIAMI', 'CHICAGO', 'LAS VEGAS'] },
    { group: 'EUROPE', cities: ['BERLIN', 'LONDON', 'AMSTERDAM', 'IBIZA', 'PARIS', 'BARCELONA'] }
];

// ========================================
// SNS Platforms (with SVG icons)
// ========================================
const SNS_PLATFORMS = [
    { id: 'twitter', name: 'X (Twitter)', prefix: 'https://x.com/', 
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
    { id: 'instagram', name: 'Instagram', prefix: 'https://instagram.com/', 
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>' },
    { id: 'soundcloud', name: 'SoundCloud', prefix: 'https://soundcloud.com/', 
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 17.939h-1v-8.068c.308-.231.639-.429 1-.566v8.634zm3 0h1v-9.224c-.229.265-.443.548-.621.857l-.379-.184v8.551zm-2 0h1v-8.848c-.508-.079-.623-.05-1-.01v8.858zm-4 0h1v-7.02c-.312.458-.555.971-.692 1.535l-.308-.182v5.667zm-3-5.25c-.606.547-1 1.354-1 2.268 0 .914.394 1.721 1 2.268v-4.536zm18.879-.671c-.204-2.837-2.404-5.079-5.117-5.079-1.022 0-1.964.328-2.762.877v10.123h9.089c1.607 0 2.911-1.393 2.911-3.106 0-1.607-1.134-2.939-2.621-3.103l-1.5.288zm-13.879 5.921h1v-8.801c-.287.181-.564.378-.823.596l-.177-.164v8.369z"/></svg>' },
    { id: 'tiktok', name: 'TikTok', prefix: 'https://tiktok.com/@', 
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>' },
    { id: 'youtube', name: 'YouTube', prefix: 'https://youtube.com/', 
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>' },
    { id: 'facebook', name: 'Facebook', prefix: 'https://facebook.com/', 
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' },
    { id: 'threads', name: 'Threads', prefix: 'https://threads.net/@', 
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.33-3.022.88-.73 2.082-1.168 3.59-1.304 1.253-.114 2.403-.037 3.428.179-.074-.648-.272-1.143-.589-1.47-.387-.4-1.014-.617-1.864-.647-1.652-.06-2.665.593-2.993.893l-1.315-1.58c.716-.593 2.152-1.478 4.398-1.396 1.37.05 2.47.434 3.272 1.142.862.761 1.342 1.833 1.427 3.188 1.044.33 1.946.838 2.664 1.516 1.023.966 1.658 2.236 1.835 3.671.254 2.058-.395 4.203-1.788 5.89-1.72 2.082-4.36 3.272-7.445 3.355z"/><path d="M12.861 14.513c-1.106.1-1.778.379-2.116.632-.299.225-.413.512-.392.829.026.394.237.748.593.997.414.289 1.06.45 1.82.408 1.08-.058 1.876-.471 2.369-1.227.443-.679.66-1.56.669-2.542-.72-.143-1.462-.194-2.184-.16-.298.014-.536.035-.759.063z"/></svg>' },
    { id: 'other', name: 'その他', prefix: '', 
      svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>' }
];

// ========================================
// Slide Up Configuration
// ========================================
const SLIDE_UP_DELAY = 2000; // スライドアップ遅延（2秒）

const SLIDE_UP_CONTAINERS = {
    'user': ['artistList', 'timelineFeed'],
    'production': ['productionList', 'productionsList', 'timelineFeed'],
    'tweet': ['timelineFeed'],
    'event': ['timelineFeed'],
    'place': ['placeList', 'placesList', 'timelineFeed']
};

// ========================================
// Pagination Configuration
// ========================================
const PAGINATION = {
    initialLimit: 30,    // 初期表示件数
    loadMoreLimit: 20,   // 追加読み込み件数
    triggerOffset: 10    // 残り何件でトリガーするか
};
