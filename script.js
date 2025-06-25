// 全局变量
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
let currentWord = '';

// 常用单词列表（用于随机功能）
const commonWords = [
    'hello', 'world', 'beautiful', 'knowledge', 'wisdom', 'courage', 'freedom',
    'happiness', 'success', 'adventure', 'creativity', 'inspiration', 'journey',
    'discovery', 'excellence', 'innovation', 'passion', 'determination', 'growth',
    'achievement', 'opportunity', 'challenge', 'experience', 'understanding'
];

// DOM元素
const elements = {
    loading: document.getElementById('loading'),
    wordInput: document.getElementById('wordInput'),
    searchBtn: document.getElementById('searchBtn'),
    clearBtn: document.getElementById('clearBtn'),
    randomBtn: document.getElementById('randomBtn'),
    result: document.getElementById('result'),
    history: document.getElementById('history'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    backToTop: document.getElementById('backToTop'),
    suggestions: document.getElementById('suggestions')
};

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // 隐藏加载动画
    setTimeout(() => {
        elements.loading.classList.add('hidden');
    }, 1000);
    
    // 绑定事件监听器
    bindEventListeners();
    
    // 加载搜索历史
    loadSearchHistory();
    
    // 注册Service Worker
    registerServiceWorker();
    
    // 设置焦点
    elements.wordInput.focus();
}

function bindEventListeners() {
    // 搜索按钮点击
    elements.searchBtn.addEventListener('click', handleSearch);
    
    // 输入框回车
    elements.wordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // 输入框输入事件（搜索建议）
    elements.wordInput.addEventListener('input', handleInputChange);
    
    // 清除按钮
    elements.clearBtn.addEventListener('click', clearSearch);
    
    // 随机单词按钮
    elements.randomBtn.addEventListener('click', searchRandomWord);
    
    // 清空历史按钮
    elements.clearHistoryBtn.addEventListener('click', clearSearchHistory);
    
    // 返回顶部按钮
    elements.backToTop.addEventListener('click', scrollToTop);
    
    // 滚动事件（显示/隐藏返回顶部按钮）
    window.addEventListener('scroll', handleScroll);
    
    // 点击页面其他地方隐藏建议
    document.addEventListener('click', function(e) {
        if (!elements.wordInput.contains(e.target) && !elements.suggestions.contains(e.target)) {
            hideSuggestions();
        }
    });
}

// 处理搜索
async function handleSearch() {
    const word = elements.wordInput.value.trim();
    
    if (!word) {
        showError('请输入要查询的单词');
        return;
    }
    
    // 设置加载状态
    setLoadingState(true);
    hideSuggestions();
    
    try {
        const data = await fetchWordDefinition(word);
        displayWordResult(data);
        addToSearchHistory(word);
        currentWord = word;
    } catch (error) {
        showError(`未找到单词 "${word}" 的释义，请检查拼写或尝试其他单词`);
    } finally {
        setLoadingState(false);
    }
}

// 获取单词定义
async function fetchWordDefinition(word) {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
    
    if (!response.ok) {
        throw new Error('Word not found');
    }
    
    const data = await response.json();
    return data[0];
}

// 重新设计的显示单词结果函数
function displayWordResult(data) {
    const resultHTML = `
        <div class="word-result-container">
            <!-- 主标题卡片 -->
            <div class="word-header-card">
                <div class="word-title-section">
                    <div class="word-icon">📚</div>
                    <div class="word-info">
                        <h1 class="word-title">${data.word.toUpperCase()}</h1>
                        <div class="word-meta">
                            ${generatePhoneticHTML(data.phonetics)}
                            <div class="word-stats">
                                <span class="meaning-count">${data.meanings.length} 个词性</span>
                                <span class="definition-count">${data.meanings.reduce((total, m) => total + m.definitions.length, 0)} 个释义</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- 词义卡片组 -->
            <div class="meanings-grid">
                ${data.meanings.map((meaning, index) => generateMeaningCardHTML(meaning, index)).join('')}
            </div>
            
            <!-- 来源信息 -->
            ${generateSourceCardHTML(data.sourceUrls)}
        </div>
    `;
    
    elements.result.innerHTML = resultHTML;
    
    // 添加动画效果
    setTimeout(() => {
        const cards = document.querySelectorAll('.meaning-card, .word-header-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('animate-in');
            }, index * 100);
        });
    }, 50);
    
    // 滚动到结果区域
    elements.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// 重新设计的发音HTML
function generatePhoneticHTML(phonetics) {
    if (!phonetics || phonetics.length === 0) return '';
    
    const phonetic = phonetics.find(p => p.text) || phonetics[0];
    if (!phonetic.text) return '';
    
    const audioUrl = phonetics.find(p => p.audio)?.audio || '';
    
    return `
        <div class="phonetic-container">
            <div class="phonetic-text">
                <span class="phonetic-symbol">🔊</span>
                <span class="phonetic-notation">${phonetic.text}</span>
            </div>
            ${audioUrl ? `
                <button class="play-audio-btn modern" onclick="playPronunciation('${audioUrl}')" title="播放发音">
                    <span class="play-icon">▶</span>
                    <span class="loading-icon" style="display: none;">⟳</span>
                </button>
            ` : ''}
        </div>
    `;
}

// 重新设计的词义卡片
function generateMeaningCardHTML(meaning, index) {
    const partOfSpeechColors = {
        'noun': '#4F46E5',
        'verb': '#059669',
        'adjective': '#DC2626',
        'adverb': '#7C2D12',
        'pronoun': '#9333EA',
        'preposition': '#0891B2',
        'conjunction': '#EA580C',
        'interjection': '#BE185D'
    };
    
    const color = partOfSpeechColors[meaning.partOfSpeech.toLowerCase()] || '#6B7280';
    
    return `
        <div class="meaning-card" style="--accent-color: ${color}">
            <div class="meaning-header">
                <div class="part-of-speech-badge" style="background: ${color}">
                    ${meaning.partOfSpeech}
                </div>
                <div class="definition-count-badge">
                    ${meaning.definitions.length} 个释义
                </div>
            </div>
            
            <div class="definitions-container">
                ${meaning.definitions.slice(0, 4).map((def, defIndex) => generateDefinitionCardHTML(def, defIndex)).join('')}
            </div>
            
            ${meaning.synonyms && meaning.synonyms.length > 0 ? `
                <div class="synonyms-section">
                    <h4 class="synonyms-title">🔗 同义词</h4>
                    <div class="synonyms-list">
                        ${meaning.synonyms.slice(0, 5).map(syn => `<span class="synonym-tag">${syn}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${meaning.antonyms && meaning.antonyms.length > 0 ? `
                <div class="antonyms-section">
                    <h4 class="antonyms-title">↔️ 反义词</h4>
                    <div class="antonyms-list">
                        ${meaning.antonyms.slice(0, 5).map(ant => `<span class="antonym-tag">${ant}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

// 重新设计的定义卡片
function generateDefinitionCardHTML(definition, index) {
    return `
        <div class="definition-card">
            <div class="definition-number">${index + 1}</div>
            <div class="definition-content">
                <p class="definition-text">${definition.definition}</p>
                ${definition.example ? `
                    <div class="example-container">
                        <div class="example-icon">💭</div>
                        <div class="example-text">"${definition.example}"</div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// 重新设计的来源卡片
function generateSourceCardHTML(sourceUrls) {
    if (!sourceUrls || sourceUrls.length === 0) return '';
    
    return `
        <div class="source-card">
            <div class="source-icon">📖</div>
            <div class="source-content">
                <h4>数据来源</h4>
                <a href="${sourceUrls[0]}" target="_blank" rel="noopener" class="source-link">
                    ${new URL(sourceUrls[0]).hostname}
                    <span class="external-icon">↗</span>
                </a>
            </div>
        </div>
    `;
}

// 显示错误信息
function showError(message) {
    elements.result.innerHTML = `
        <div class="error-message">
            ❌ ${message}
        </div>
    `;
}

// 设置加载状态
function setLoadingState(loading) {
    if (loading) {
        elements.searchBtn.classList.add('loading');
        elements.searchBtn.disabled = true;
        elements.result.innerHTML = `
            <div class="loading-message">
                🔄 正在查询中，请稍候...
            </div>
        `;
    } else {
        elements.searchBtn.classList.remove('loading');
        elements.searchBtn.disabled = false;
    }
}

// 处理输入变化（搜索建议）
function handleInputChange() {
    const value = elements.wordInput.value.trim().toLowerCase();
    
    if (value.length < 2) {
        hideSuggestions();
        return;
    }
    
    // 从历史记录中筛选建议
    const suggestions = searchHistory
        .filter(word => word.toLowerCase().includes(value))
        .slice(0, 5);
    
    if (suggestions.length > 0) {
        showSuggestions(suggestions);
    } else {
        hideSuggestions();
    }
}

// 显示搜索建议
function showSuggestions(suggestions) {
    const suggestionsHTML = suggestions
        .map(word => `<div class="suggestion-item" onclick="selectSuggestion('${word}')">${word}</div>`)
        .join('');
    
    elements.suggestions.innerHTML = suggestionsHTML;
    elements.suggestions.style.display = 'block';
}

// 隐藏搜索建议
function hideSuggestions() {
    elements.suggestions.style.display = 'none';
}

// 选择建议
function selectSuggestion(word) {
    elements.wordInput.value = word;
    hideSuggestions();
    handleSearch();
}

// 清除搜索
function clearSearch() {
    elements.wordInput.value = '';
    elements.result.innerHTML = '';
    currentWord = '';
    hideSuggestions();
    elements.wordInput.focus();
}

// 搜索随机单词
function searchRandomWord() {
    const randomWord = commonWords[Math.floor(Math.random() * commonWords.length)];
    elements.wordInput.value = randomWord;
    handleSearch();
}

// 添加到搜索历史
function addToSearchHistory(word) {
    // 移除重复项
    searchHistory = searchHistory.filter(item => item.toLowerCase() !== word.toLowerCase());
    
    // 添加到开头
    searchHistory.unshift(word);
    
    // 限制历史记录数量
    if (searchHistory.length > 20) {
        searchHistory = searchHistory.slice(0, 20);
    }
    
    // 保存到本地存储
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    
    // 更新显示
    loadSearchHistory();
}

// 加载搜索历史
function loadSearchHistory() {
    if (searchHistory.length === 0) {
        elements.history.innerHTML = '<p style="text-align: center; color: #6c757d;">暂无搜索历史</p>';
        return;
    }
    
    const historyHTML = searchHistory
        .map(word => `<span class="history-item" onclick="searchHistoryWord('${word}')">${word}</span>`)
        .join('');
    
    elements.history.innerHTML = historyHTML;
}

// 搜索历史记录中的单词
function searchHistoryWord(word) {
    elements.wordInput.value = word;
    handleSearch();
}

// 清空搜索历史
function clearSearchHistory() {
    if (confirm('确定要清空所有搜索历史吗？')) {
        searchHistory = [];
        localStorage.removeItem('searchHistory');
        loadSearchHistory();
    }
}

// 滚动到顶部
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 处理滚动事件
function handleScroll() {
    if (window.pageYOffset > 300) {
        elements.backToTop.classList.add('visible');
    } else {
        elements.backToTop.classList.remove('visible');
    }
}

// 注册Service Worker
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('./sw.js')
                .then(function(registration) {
                    console.log('SW registered: ', registration);
                })
                .catch(function(registrationError) {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
}

// 全局函数（供HTML调用）
window.selectSuggestion = selectSuggestion;
window.searchHistoryWord = searchHistoryWord;
