/**
 * Dynamic PR Loading for News Page and Homepage
 */

// Load PRs from GitHub via API
async function loadPressReleases(containerId, limit = 10) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Show loading state
    container.innerHTML = `
        <div class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p class="mt-2 text-gray-500">Loading press releases...</p>
        </div>
    `;

    try {
        // Fetch from our API
        const response = await fetch(`/api/list-prs?limit=${limit}`);

        if (!response.ok) {
            throw new Error('Failed to fetch press releases');
        }

        const data = await response.json();
        const prs = data.prs || [];

        if (prs.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>No press releases found.</p>
                </div>
            `;
            return;
        }

        // Render PRs
        container.innerHTML = prs.map(pr => createPRCard(pr)).join('');

    } catch (error) {
        console.error('Error loading press releases:', error);

        // Fallback to static sample data
        container.innerHTML = createSamplePRs();
    }
}

// Create PR card HTML
function createPRCard(pr) {
    // For homepage (3-column grid)
    if (document.getElementById('homepage-prs')) {
        return `
            <div class="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow">
                <div class="mb-4">
                    <span class="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                        VERIFIED
                    </span>
                    <span class="text-sm text-gray-500 ml-2">${pr.timeAgo || pr.date}</span>
                </div>
                <h3 class="font-semibold mb-2 line-clamp-2">
                    ${pr.title || extractTitleFromFilename(pr.filename)}
                </h3>
                <p class="text-gray-600 text-sm mb-4 line-clamp-3">
                    ${pr.summary || 'Click to read the full press release announcement.'}
                </p>
                <div class="flex items-center text-xs text-gray-500 mb-4">
                    <span>✓ Verified via ${pr.domain || pr.company || 'company domain'}</span>
                    ${pr.croNumber ? `<span class="ml-2">• CRO: ${pr.croNumber}</span>` : ''}
                </div>
                <a href="${pr.url}" class="text-sm font-medium text-black hover:underline">
                    Read more →
                </a>
            </div>
        `;
    }

    // For news page (list view)
    return `
        <article class="bg-white rounded-lg border p-6 hover:shadow-lg transition-shadow">
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center space-x-3">
                    <span class="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                        VERIFIED
                    </span>
                    ${pr.industry ? `<span class="text-xs font-medium text-gray-500 uppercase">${pr.industry}</span>` : ''}
                    <span class="text-sm text-gray-500">${pr.timeAgo || pr.date}</span>
                </div>
            </div>

            <h2 class="text-xl font-bold mb-3">
                <a href="${pr.url}" class="hover:text-blue-600">
                    ${pr.title || extractTitleFromFilename(pr.filename)}
                </a>
            </h2>

            <p class="text-gray-600 mb-4 line-clamp-2">
                ${pr.summary || 'Read the full press release for more details.'}
            </p>

            <div class="flex items-center justify-between">
                <div class="flex items-center text-sm text-gray-500">
                    <span>✓ ${pr.company || 'Verified Company'}</span>
                    ${pr.domain ? `<span class="ml-3">• ${pr.domain}</span>` : ''}
                </div>
                <a href="${pr.url}" class="text-sm font-medium text-black hover:underline">
                    Read more →
                </a>
            </div>
        </article>
    `;
}

// Extract title from filename
function extractTitleFromFilename(filename) {
    if (!filename) return 'Press Release';

    // Remove timestamp and extension
    let title = filename
        .replace(/\d{13}\.html$/, '')
        .replace(/\.html$/, '')
        .replace(/[-_]/g, ' ');

    // Capitalize words
    return title
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Create sample PRs for fallback
function createSamplePRs() {
    const samples = [
        {
            title: 'TechCorp Ireland Announces €5M Expansion',
            company: 'TechCorp Ireland',
            domain: 'techcorp.ie',
            timeAgo: '2 hours ago',
            summary: 'Leading software company creates 50 new jobs in Dublin tech hub.',
            url: '/news/sample-techcorp.html',
            industry: 'technology'
        },
        {
            title: 'GreenEnergy Solutions Wins EU Grant',
            company: 'GreenEnergy Solutions',
            domain: 'greenenergy.ie',
            timeAgo: '4 hours ago',
            summary: 'Cork-based renewable energy firm secures €2M for innovative solar project.',
            url: '/news/sample-greenenergy.html',
            industry: 'renewable'
        },
        {
            title: 'FinTech Startup Raises €10M Series A',
            company: 'FinTech Startup',
            domain: 'fintech.ie',
            timeAgo: 'Yesterday',
            summary: 'Dublin fintech revolutionizing payments for SMEs across Europe.',
            url: '/news/sample-fintech.html',
            industry: 'finance'
        }
    ];

    return samples.map(pr => createPRCard(pr)).join('');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the news page
    const newsGrid = document.getElementById('news-grid');
    if (newsGrid) {
        loadPressReleases('news-grid', 20);
    }

    // Check if we're on the homepage
    const homepagePRs = document.getElementById('homepage-prs');
    if (homepagePRs) {
        loadPressReleases('homepage-prs', 3);
    }
});

// Search functionality for news page
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const articles = document.querySelectorAll('#news-grid article');

        articles.forEach(article => {
            const text = article.textContent.toLowerCase();
            article.style.display = text.includes(query) ? 'block' : 'none';
        });
    });
}

// Setup filters
function setupFilters() {
    const industryFilter = document.getElementById('industryFilter');
    const typeFilter = document.getElementById('typeFilter');

    if (industryFilter) {
        industryFilter.addEventListener('change', filterPRs);
    }

    if (typeFilter) {
        typeFilter.addEventListener('change', filterPRs);
    }
}

function filterPRs() {
    const industry = document.getElementById('industryFilter')?.value || '';
    const type = document.getElementById('typeFilter')?.value || '';

    const articles = document.querySelectorAll('#news-grid article');

    articles.forEach(article => {
        let show = true;

        if (industry && !article.textContent.toLowerCase().includes(industry.toLowerCase())) {
            show = false;
        }

        if (type && !article.textContent.toLowerCase().includes(type.toLowerCase())) {
            show = false;
        }

        article.style.display = show ? 'block' : 'none';
    });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    setupSearch();
    setupFilters();
});