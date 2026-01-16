// Supabase 配置 (使用 anon key，安全地暴露在前端)
const SUPABASE_URL = 'https://veiwysofwfwxnbkpgckq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlaXd5c29md2Z3eG5ia3BnY2txIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNDQyMDEsImV4cCI6MjA4MjkyMDIwMX0.oZYT44zNe3EHqkUlIHppq92I4xUYvWgaXCnKGU3xUQ0';

// 默认价格（备用）
const defaultPrices = {
    cny: { monthly: 18, quarterly: 48, yearly: 98, lifetime: 198 },
    usd: { monthly: 4.99, quarterly: 12.99, yearly: 39.99, lifetime: 59.99 },
    jpy: { monthly: 750, quarterly: 1950, yearly: 6000, lifetime: 9000 },
    krw: { monthly: 6900, quarterly: 17900, yearly: 55000, lifetime: 85000 }
};

// 货币符号映射
const currencySymbols = {
    cny: '¥',
    usd: '$',
    jpy: '¥',
    krw: '₩'
};

// 根据语言获取货币
function getCurrencyByLang(lang) {
    const currencyMap = {
        'zh': 'cny',
        'en': 'usd',
        'ja': 'jpy',
        'ko': 'krw'
    };
    return currencyMap[lang] || 'usd';
}

// 从 Supabase 获取价格
async function fetchPricesFromSupabase() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?select=key,value`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch prices');
        }

        const data = await response.json();
        const prices = { cny: {}, usd: {}, jpy: {}, krw: {} };

        data.forEach(item => {
            // 解析价格键值，如 pro_monthly_price_cny
            const match = item.key.match(/^pro_(\w+)_price_(\w+)$/);
            if (match) {
                const [, plan, currency] = match;
                if (prices[currency]) {
                    prices[currency][plan] = parseFloat(item.value);
                }
            }
        });

        return prices;
    } catch (error) {
        console.error('Failed to fetch prices from Supabase:', error);
        return null;
    }
}

// 格式化价格金额（不含符号）
function formatAmount(amount, currency) {
    if (currency === 'jpy' || currency === 'krw') {
        return Math.round(amount).toString();
    }
    return amount.toFixed(2);
}

// 更新页面上的价格
function updatePricesOnPage(prices, currency) {
    const currencyPrices = prices[currency] || defaultPrices[currency];
    if (!currencyPrices) return;

    const symbol = currencySymbols[currency] || '$';

    // 更新首页的价格 (index.html) - 通过 ID
    const homePageUpdates = [
        { amountId: 'home-monthly-amount', currencyId: 'home-monthly-currency', plan: 'monthly' },
        { amountId: 'home-quarterly-amount', currencyId: 'home-quarterly-currency', plan: 'quarterly' },
        { amountId: 'home-yearly-amount', currencyId: 'home-yearly-currency', plan: 'yearly' }
    ];

    homePageUpdates.forEach(({ amountId, currencyId, plan }) => {
        const amountEl = document.getElementById(amountId);
        const currencyEl = document.getElementById(currencyId);
        if (amountEl && currencyPrices[plan] !== undefined) {
            amountEl.textContent = formatAmount(currencyPrices[plan], currency);
        }
        if (currencyEl) {
            currencyEl.textContent = symbol;
        }
    });

    // 更新 pricing.html 页面的价格
    updatePricingPagePrices(currencyPrices, currency);
}

// 更新 pricing.html 页面的价格
function updatePricingPagePrices(prices, currency) {
    const symbol = currencySymbols[currency] || '$';

    // 更新价格卡片中的金额 (.plan-card 是 pricing.html 使用的类)
    const planCards = document.querySelectorAll('.plan-card');
    planCards.forEach(card => {
        const planName = card.querySelector('h3');
        if (!planName) return;

        const amountEl = card.querySelector('.amount');
        const currencyEl = card.querySelector('.currency');

        if (!amountEl) return;

        let planType = '';
        const i18nKey = planName.getAttribute('data-i18n') || '';

        if (i18nKey.includes('monthly')) {
            planType = 'monthly';
        } else if (i18nKey.includes('quarterly')) {
            planType = 'quarterly';
        } else if (i18nKey.includes('yearly')) {
            planType = 'yearly';
        } else if (i18nKey.includes('lifetime')) {
            planType = 'lifetime';
        }

        if (planType && prices[planType] !== undefined) {
            amountEl.textContent = formatAmount(prices[planType], currency);
            if (currencyEl) {
                currencyEl.textContent = symbol;
            }
        }
    });
}

// 初始化价格加载
async function initializePricing() {
    // 获取当前语言
    const currentLang = localStorage.getItem('echoLang') || 'en';
    const currency = getCurrencyByLang(currentLang);

    // 从 Supabase 获取价格
    const prices = await fetchPricesFromSupabase();

    // 使用获取的价格或默认价格
    const finalPrices = prices || defaultPrices;

    // 更新页面价格
    updatePricesOnPage(finalPrices, currency);

    // 监听语言切换事件
    window.addEventListener('languageChanged', (e) => {
        const newCurrency = getCurrencyByLang(e.detail.lang);
        updatePricesOnPage(finalPrices, newCurrency);
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initializePricing);

// 导出供其他脚本使用
window.EchoPricing = {
    fetchPrices: fetchPricesFromSupabase,
    updatePrices: updatePricesOnPage,
    getCurrency: getCurrencyByLang
};
