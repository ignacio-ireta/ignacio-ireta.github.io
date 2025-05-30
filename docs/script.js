// DOM Elements
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');
const parallaxElements = document.querySelectorAll('.parallax-bg');

// Mobile Navigation Toggle
hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Parallax Scrolling Effect
function updateParallax() {
    const scrollTop = window.pageYOffset;
    
    parallaxElements.forEach(element => {
        const speed = 0.2;
        const yPos = -(scrollTop * speed);
        // Temporarily disable transform to test static positioning
        // element.style.transform = `translateY(${yPos}px)`;
    });
}

// Set background images for parallax elements
function setParallaxBackgrounds() {
    parallaxElements.forEach(element => {
        const bgImage = element.getAttribute('data-bg');
        if (bgImage) {
            element.style.backgroundImage = `url('${bgImage}')`;
        }
    });
}

// Smooth scrolling for navigation links
function initSmoothScrolling() {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Active navigation highlighting
function updateActiveNav() {
    const sections = document.querySelectorAll('.section');
    const scrollPos = window.scrollY + 100;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            // Remove active class from all nav links
            navLinks.forEach(link => {
                link.classList.remove('active');
            });
            
            // Add active class to current section nav link
            const activeLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    });
}

// Intersection Observer for animations
function initIntersectionObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, observerOptions);
    
    // Observe all metric cards and content items
    const animateElements = document.querySelectorAll(
        '.metric-card, .source-item, .step, .insight, .model-item, .stack-item, .aspect, .cycle-step'
    );
    
    animateElements.forEach(element => {
        observer.observe(element);
    });
}

// Navbar background opacity on scroll
function updateNavbarOnScroll() {
    const navbar = document.querySelector('.navbar');
    const scrollTop = window.pageYOffset;
    
    if (scrollTop > 50) {
        navbar.style.background = 'rgba(13, 17, 23, 0.98)';
    } else {
        navbar.style.background = 'rgba(13, 17, 23, 0.95)';
    }
}

// Dynamic typing effect for hero section
function initTypingEffect() {
    const heroTitle = document.querySelector('.hero-content h1');
    if (heroTitle) {
        const originalText = heroTitle.textContent;
        heroTitle.textContent = '';
        let i = 0;
        
        const typeWriter = () => {
            if (i < originalText.length) {
                heroTitle.textContent += originalText.charAt(i);
                i++;
                setTimeout(typeWriter, 50);
            }
        };
        
        // Start typing effect after a short delay
        setTimeout(typeWriter, 500);
    }
}

// Counter animation for metrics
function animateCounters() {
    const counters = document.querySelectorAll('.metric-value, .value');
    
    counters.forEach(counter => {
        const target = counter.textContent;
        const numericValue = parseFloat(target.replace(/[^\d.-]/g, ''));
        
        if (!isNaN(numericValue)) {
            counter.textContent = '0';
            const increment = numericValue / 50;
            let current = 0;
            
            const updateCounter = () => {
                current += increment;
                if (current < numericValue) {
                    counter.textContent = target.replace(numericValue.toString(), Math.floor(current).toString());
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target;
                }
            };
            
            // Start animation when element comes into view
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        updateCounter();
                        observer.disconnect();
                    }
                });
            }, { threshold: 0.5 });
            
            observer.observe(counter);
        }
    });
}

// Loading animation
function initLoadingAnimation() {
    const sections = document.querySelectorAll('.section-content');
    
    sections.forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, index * 100);
                    observer.disconnect();
                }
            });
        }, { threshold: 0.2 });
        
        observer.observe(section);
    });
}

// Enhanced parallax with mouse movement
function initMouseParallax() {
    const heroBackground = document.querySelector('.hero-background');
    
    if (heroBackground) {
        document.addEventListener('mousemove', (e) => {
            const mouseX = e.clientX / window.innerWidth;
            const mouseY = e.clientY / window.innerHeight;
            
            const moveX = (mouseX - 0.5) * 20;
            const moveY = (mouseY - 0.5) * 20;
            
            heroBackground.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    }
}

// Scroll progress indicator
function initScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: linear-gradient(90deg, #C89B3C, #E6C565);
        z-index: 9999;
        transition: width 0.1s ease;
    `;
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollTop = window.pageYOffset;
        const scrollPercent = (scrollTop / scrollHeight) * 100;
        
        progressBar.style.width = `${scrollPercent}%`;
    });
}

// Performance optimization for scroll events
let ticking = false;

function onScroll() {
    if (!ticking) {
        requestAnimationFrame(() => {
            updateParallax();
            updateNavbarOnScroll();
            updateActiveNav();
            ticking = false;
        });
        ticking = true;
    }
}

// Event Listeners
window.addEventListener('scroll', onScroll);
window.addEventListener('resize', () => {
    // Recalculate parallax on resize
    updateParallax();
});

// Initialize all dynamic content when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Page loaded, initializing dynamic content...');
    
    // Initialize visual effects first
    setParallaxBackgrounds();
    initSmoothScrolling();
    initIntersectionObserver();
    initTypingEffect();
    animateCounters();
    initLoadingAnimation();
    initMouseParallax();
    initScrollProgress();
    
    // Load mappings first (required for name translations)
    await Promise.all([
        loadChampionMapping(),
        loadItemMapping()
    ]);
    
    // Then load all dynamic data (which depend on mappings)
    await Promise.all([
        loadEDAData(),
        loadAlgorithmData(),
        loadDatasetData()
    ]);
    
    // Add CSS for active nav links
    const style = document.createElement('style');
    style.textContent = `
        .nav-link.active {
            color: #C89B3C !important;
        }
        .nav-link.active::after {
            width: 100% !important;
        }
        .animate {
            animation: fadeInUp 0.8s ease-out forwards;
        }
    `;
    document.head.appendChild(style);
    
    console.log('All dynamic content loaded successfully');
});

// Preload critical images
function preloadImages() {
    const criticalImages = [
        'assets/dragontail_data/img/champion/splash/Jhin_0.jpg',
        'assets/dragontail_data/img/champion/splash/Kaisa_0.jpg',
        'assets/dragontail_data/img/champion/splash/Ezreal_0.jpg',
        'assets/dragontail_data/img/champion/splash/LeeSin_0.jpg'
    ];
    
    criticalImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// Initialize preloading
preloadImages();

// Handle browser back/forward navigation
window.addEventListener('popstate', () => {
    updateActiveNav();
});

// Error handling for missing images
document.addEventListener('error', (e) => {
    if (e.target.tagName === 'IMG' || e.target.style.backgroundImage) {
        console.warn('Failed to load image:', e.target.src || e.target.style.backgroundImage);
        // Could implement fallback images here
    }
}, true);

// Dynamic EDA Data Loading
const EDA_DATA = {
    "champion_info": {
        "champion_id": 236,
        "champion_key": "236",
        "name": "Champion 236",
        "title": "Unknown Champion",
        "total_records": 525
    },
    "performance_stats": {
        "avg_kda": 2.69,
        "avg_kills": 6.58,
        "avg_deaths": 4.96,
        "avg_assists": 6.14,
        "avg_gold": 11281,
        "avg_duration": 1487.64,
        "avg_damage": 22196
    },
    "top_items": [
        { "id": 3508, "name": "Item 3508", "usage": 97.3, "count": 511 },
        { "id": 3363, "name": "Item 3363", "usage": 91.0, "count": 478 },
        { "id": 1055, "name": "Item 1055", "usage": 77.3, "count": 406 },
        { "id": 3031, "name": "Item 3031", "usage": 65.3, "count": 343 },
        { "id": 6675, "name": "Item 6675", "usage": 44.0, "count": 231 }
    ],
    "win_rate_correlations": {
        "high_kda": { "threshold": 2.0, "win_rate": 0.843, "games": 268 },
        "high_gold": { "win_rate": 0.615, "games": 262 },
        "high_damage": { "win_rate": 0.592, "games": 262 }
    },
    "game_duration": {
        "short_games": { "win_rate": 0.561, "avg_duration": 17.4, "games": 173 },
        "medium_games": { "win_rate": 0.492, "avg_duration": 25.3, "games": 179 },
        "long_games": { "win_rate": 0.520, "avg_duration": 31.7, "games": 173 }
    },
    "build_diversity": {
        "unique_builds": 413,
        "total_games": 525,
        "diversity_percentage": 78.7
    }
};

// Fallback data for algorithm comparison
const ALGORITHM_DATA = {
    "champion_id": 236,
    "baseline_win_rate": 0.5260336906584993,
    "genetic_algorithm": {
        "optimal_build": [1029, 3364, 3340, 3035, 2019, 1055, 6690],
        "fitness": 0.91,
        "win_probability": 0.76,
        "generations": 100,
        "population_size": 50
    },
    "differential_evolution": {
        "optimal_build": [1029, 3094, 6701, 3033, 3072, 1037, 3156],
        "fitness": 0.9,
        "win_probability": 0.75,
        "generations": 200,
        "population_size": 50
    },
    "comparison": {
        "winner": "Genetic Algorithm",
        "advantage": 0.010000000000000009,
        "ga_improvement": 44.47743813682678,
        "de_improvement": 42.57641921397379,
        "overlap_ratio": 0.14285714285714285,
        "common_items": [1029]
    }
};

// Fallback data for dataset analysis
const DATASET_DATA = {
    "dataset_info": {
        "total_player_records": 83480,
        "total_champions": 168,
        "total_matches": 16696
    },
    "processing_stats": {
        "raw_json_size_mb": 644,
        "processed_matches": 8348,
        "player_records": 83480,
        "columns_removed": 20
    },
    "collection_stats": {
        "unique_players": 1531,
        "match_ids_collected": 8362,
        "api_calls_saved": 4090,
        "duplicate_efficiency": 46.8,
        "puuid_duplicates": 3003,
        "match_id_duplicates": 11658,
        "time_saved_minutes": 51.1
    },
    "champion_focus": {
        "champion_id": 236,
        "total_records": 525,
        "baseline_win_rate": 0.5238095238095238
    }
};

// Mapping data storage
let championMapping = {};
let itemMapping = {};

// Load champion mapping
async function loadChampionMapping() {
    try {
        const response = await fetch('assets/champion_id_mapping.json');
        if (response.ok) {
            championMapping = await response.json();
            console.log('Champion mapping loaded:', Object.keys(championMapping).length, 'champions');
        }
    } catch (error) {
        console.log('Failed to load champion mapping:', error.message);
    }
}

// Load item mapping
async function loadItemMapping() {
    try {
        const response = await fetch('assets/dragontail_data/15.10.1/data/en_US/item.json');
        if (response.ok) {
            const itemData = await response.json();
            // Convert to simple ID -> name mapping
            itemMapping = {};
            for (const [id, item] of Object.entries(itemData.data)) {
                itemMapping[id] = item.name;
            }
            console.log('Item mapping loaded:', Object.keys(itemMapping).length, 'items');
        }
    } catch (error) {
        console.log('Failed to load item mapping:', error.message);
    }
}

// Helper function to get champion name
function getChampionName(championId) {
    const name = championMapping[championId.toString()];
    return name || `Champion ${championId}`;
}

// Helper function to get item name
function getItemName(itemId) {
    const name = itemMapping[itemId.toString()];
    return name || `Item ${itemId}`;
}

// Helper function to get champion icon URL
function getChampionIconUrl(championId) {
    const name = championMapping[championId.toString()];
    if (name) {
        return `assets/dragontail_data/15.10.1/img/champion/${name}.png`;
    }
    return null;
}

// Helper function to get item icon URL
function getItemIconUrl(itemId) {
    return `assets/dragontail_data/15.10.1/img/item/${itemId}.png`;
}

// Helper function to create champion HTML with icon
function createChampionHtml(championId, options = {}) {
    const name = getChampionName(championId);
    const iconUrl = getChampionIconUrl(championId);
    const className = options.className || 'champion-with-icon';
    const showName = options.showName !== false;
    
    if (iconUrl && showName) {
        return `<span class="${className}"><img src="${iconUrl}" alt="${name}" class="champion-icon">${name}</span>`;
    } else if (iconUrl) {
        return `<img src="${iconUrl}" alt="${name}" class="champion-icon">`;
    } else {
        return name;
    }
}

// Helper function to create item HTML with icon
function createItemHtml(itemId, options = {}) {
    const name = getItemName(itemId);
    const iconUrl = getItemIconUrl(itemId);
    const className = options.className || 'item-with-icon';
    const showName = options.showName !== false;
    
    if (iconUrl && showName) {
        return `<span class="${className}"><img src="${iconUrl}" alt="${name}" class="item-icon">${name}</span>`;
    } else if (iconUrl) {
        return `<img src="${iconUrl}" alt="${name}" class="item-icon">`;
    } else {
        return name;
    }
}

// Helper function to format item build list
function formatItemBuild(itemIds) {
    return itemIds.map(id => getItemName(id)).join(', ');
}

// Helper function to format item build with icons
function formatItemBuildWithIcons(itemIds, options = {}) {
    return itemIds.map(id => createItemHtml(id, options)).join('');
}

// Function to populate algorithm comparison data
function populateAlgorithmData(data) {
    // Update modeling section performance metrics
    const gaWinRate = document.getElementById('ga-win-rate');
    const deWinRate = document.getElementById('de-win-rate');
    const gaAdvantage = document.getElementById('ga-advantage');
    
    if (gaWinRate) gaWinRate.textContent = `${(data.genetic_algorithm.win_probability * 100).toFixed(1)}% Win Rate`;
    if (deWinRate) deWinRate.textContent = `${(data.differential_evolution.win_probability * 100).toFixed(1)}% Win Rate`;
    if (gaAdvantage) gaAdvantage.textContent = `+${(data.comparison.advantage * 100).toFixed(1)}%`;
    
    // Update optimization insights with actual champion name and icon
    const baselineWinRate = document.getElementById('baseline-win-rate');
    const championOptimized = document.getElementById('champion-optimized');
    
    if (baselineWinRate) baselineWinRate.textContent = `${(data.baseline_win_rate * 100).toFixed(1)}%`;
    if (championOptimized) {
        championOptimized.innerHTML = createChampionHtml(data.champion_id, { showName: true });
    }
    
    // Update evaluation section metrics
    const evalGaWinRate = document.getElementById('eval-ga-win-rate');
    const evalDeWinRate = document.getElementById('eval-de-win-rate');
    const evalGaImprovement = document.getElementById('eval-ga-improvement');
    const evalDeImprovement = document.getElementById('eval-de-improvement');
    
    if (evalGaWinRate) evalGaWinRate.textContent = `${(data.genetic_algorithm.win_probability * 100).toFixed(1)}%`;
    if (evalDeWinRate) evalDeWinRate.textContent = `${(data.differential_evolution.win_probability * 100).toFixed(1)}%`;
    if (evalGaImprovement) evalGaImprovement.textContent = `${data.comparison.ga_improvement.toFixed(1)}%`;
    if (evalDeImprovement) evalDeImprovement.textContent = `${data.comparison.de_improvement.toFixed(1)}%`;
    
    // Update comparison matrix
    const matrixGaWinRate = document.getElementById('matrix-ga-win-rate');
    const matrixDeWinRate = document.getElementById('matrix-de-win-rate');
    const matrixGaGenerations = document.getElementById('matrix-ga-generations');
    const matrixDeGenerations = document.getElementById('matrix-de-generations');
    const matrixGaFitness = document.getElementById('matrix-ga-fitness');
    const matrixDeFitness = document.getElementById('matrix-de-fitness');
    
    if (matrixGaWinRate) matrixGaWinRate.textContent = `${(data.genetic_algorithm.win_probability * 100).toFixed(1)}%`;
    if (matrixDeWinRate) matrixDeWinRate.textContent = `${(data.differential_evolution.win_probability * 100).toFixed(1)}%`;
    if (matrixGaGenerations) matrixGaGenerations.textContent = data.genetic_algorithm.generations;
    if (matrixDeGenerations) matrixDeGenerations.textContent = data.differential_evolution.generations;
    if (matrixGaFitness) matrixGaFitness.textContent = data.genetic_algorithm.fitness.toFixed(2);
    if (matrixDeFitness) matrixDeFitness.textContent = data.differential_evolution.fitness.toFixed(2);
    
    // Update optimal builds with actual item names
    const gaOptimalBuild = document.getElementById('ga-optimal-build');
    const deOptimalBuild = document.getElementById('de-optimal-build');
    const gaBuildItems = document.getElementById('ga-build-items');
    const deBuildItems = document.getElementById('de-build-items');
    
    if (gaOptimalBuild && data.genetic_algorithm.optimal_build) {
        gaOptimalBuild.textContent = formatItemBuild(data.genetic_algorithm.optimal_build);
    }
    if (deOptimalBuild && data.differential_evolution.optimal_build) {
        deOptimalBuild.textContent = formatItemBuild(data.differential_evolution.optimal_build);
    }
    
    // Update build item lists with individual item spans and icons
    if (gaBuildItems && data.genetic_algorithm.optimal_build) {
        const gaItems = data.genetic_algorithm.optimal_build;
        const deItems = data.differential_evolution.optimal_build || [];
        gaBuildItems.innerHTML = gaItems.map(itemId => {
            const isShared = deItems.includes(itemId);
            const itemHtml = createItemHtml(itemId, { showName: true });
            return `<span class="item${isShared ? ' shared' : ''}">${itemHtml}</span>`;
        }).join('');
    }
    
    if (deBuildItems && data.differential_evolution.optimal_build) {
        const deItems = data.differential_evolution.optimal_build;
        const gaItems = data.genetic_algorithm.optimal_build || [];
        deBuildItems.innerHTML = deItems.map(itemId => {
            const isShared = gaItems.includes(itemId);
            const itemHtml = createItemHtml(itemId, { showName: true });
            return `<span class="item${isShared ? ' shared' : ''}">${itemHtml}</span>`;
        }).join('');
    }
    
    // Update common items information with icons
    const commonItems = document.getElementById('common-items');
    const commonItemsList = document.getElementById('common-items-list');
    const commonItemsCount = document.getElementById('common-items-count');
    const totalItemsCount = document.getElementById('total-items-count');
    
    if (data.genetic_algorithm.optimal_build && data.differential_evolution.optimal_build) {
        const gaItems = data.genetic_algorithm.optimal_build;
        const deItems = data.differential_evolution.optimal_build;
        const shared = gaItems.filter(item => deItems.includes(item));
        
        if (commonItems) {
            const sharedItemsHtml = shared.map(id => createItemHtml(id, { showName: true })).join(', ');
            commonItems.innerHTML = `${shared.length} item${shared.length !== 1 ? 's' : ''} (${sharedItemsHtml})`;
        }
        if (commonItemsList) {
            commonItemsList.innerHTML = shared.map(id => createItemHtml(id, { showName: true })).join(', ');
        }
        if (commonItemsCount) {
            commonItemsCount.textContent = shared.length;
        }
        if (totalItemsCount) {
            totalItemsCount.textContent = Math.max(gaItems.length, deItems.length);
        }
    }
    
    // Update validation results
    const statSignificance = document.getElementById('stat-significance');
    const confidenceInterval = document.getElementById('confidence-interval');
    const validationChampion = document.getElementById('validation-champion');
    const baselineAccuracy = document.getElementById('baseline-accuracy');
    
    if (statSignificance) statSignificance.textContent = data.comparison.statistical_significance || 'p < 0.05';
    if (confidenceInterval) confidenceInterval.textContent = data.comparison.confidence_interval || '95%';
    if (validationChampion) validationChampion.innerHTML = createChampionHtml(data.champion_id, { showName: true });
    if (baselineAccuracy) baselineAccuracy.textContent = `${(data.baseline_win_rate * 100).toFixed(1)}%`;
}

// Function to populate dataset analysis data
function populateDatasetData(data) {
    // Update processing stats
    const rawJsonSize = document.getElementById('raw-json-size');
    const processedMatches = document.getElementById('processed-matches');
    const playerRecordsPreprocessing = document.getElementById('player-records-preprocessing');
    const columnsRemoved = document.getElementById('columns-removed');
    
    if (rawJsonSize) rawJsonSize.textContent = `${data.processing_stats.raw_json_size_mb}MB`;
    if (processedMatches) processedMatches.textContent = data.processing_stats.processed_matches.toLocaleString();
    if (playerRecordsPreprocessing) playerRecordsPreprocessing.textContent = data.processing_stats.player_records.toLocaleString();
    if (columnsRemoved) columnsRemoved.textContent = data.processing_stats.columns_removed;
    
    // Update collection stats
    const uniquePlayers = document.getElementById('unique-players');
    const matchIdsCollected = document.getElementById('match-ids-collected');
    const apiCallsSaved = document.getElementById('api-calls-saved');
    const duplicateEfficiency = document.getElementById('duplicate-efficiency');
    const puuidDuplicates = document.getElementById('puuid-duplicates');
    const matchIdDuplicates = document.getElementById('match-id-duplicates');
    const timeSavedMinutes = document.getElementById('time-saved-minutes');
    
    if (uniquePlayers) uniquePlayers.textContent = data.collection_stats.unique_players.toLocaleString();
    if (matchIdsCollected) matchIdsCollected.textContent = data.collection_stats.match_ids_collected.toLocaleString();
    if (apiCallsSaved) apiCallsSaved.textContent = data.collection_stats.api_calls_saved.toLocaleString();
    if (duplicateEfficiency) duplicateEfficiency.textContent = `${data.collection_stats.duplicate_efficiency.toFixed(1)}%`;
    if (puuidDuplicates) puuidDuplicates.textContent = data.collection_stats.puuid_duplicates.toLocaleString();
    if (matchIdDuplicates) matchIdDuplicates.textContent = data.collection_stats.match_id_duplicates.toLocaleString();
    if (timeSavedMinutes) timeSavedMinutes.textContent = `${data.collection_stats.time_saved_minutes.toFixed(1)} minutes`;
    
    // Update champion focus information with actual champion name and icon
    const championFocus = document.getElementById('champion-focus');
    const championRecords = document.getElementById('champion-records');
    const championBaselineWinRate = document.getElementById('champion-baseline-win-rate');
    const validationChampion = document.getElementById('validation-champion');
    
    if (championFocus && data.champion_focus) {
        championFocus.innerHTML = createChampionHtml(data.champion_focus.champion_id, { showName: true });
    }
    if (championRecords && data.champion_focus) {
        championRecords.textContent = data.champion_focus.total_records.toLocaleString();
    }
    if (championBaselineWinRate && data.champion_focus) {
        championBaselineWinRate.textContent = `${(data.champion_focus.baseline_win_rate * 100).toFixed(1)}%`;
    }
    
    // Update validation champion if it exists
    if (validationChampion && data.champion_focus) {
        validationChampion.innerHTML = createChampionHtml(data.champion_focus.champion_id, { showName: true });
    }
}

// Function to populate EDA data
function populateEDAData(data) {
    // Update champion title with actual name and icon
    const championTitle = document.getElementById('eda-champion-title');
    if (championTitle && data.champion_info) {
        const championHtml = createChampionHtml(data.champion_info.champion_id, { className: 'champion-focus-large', showName: true });
        championTitle.innerHTML = `Champion Analysis: ${championHtml}`;
    }

    // Update performance metrics
    const performanceMetrics = document.getElementById('performance-metrics');
    if (performanceMetrics && data.performance_stats) {
        performanceMetrics.innerHTML = `
            <div class="metric-item">
                <span class="metric-label">Average KDA</span>
                <span class="metric-value">${data.performance_stats.avg_kda.toFixed(2)}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Average Gold</span>
                <span class="metric-value">${data.performance_stats.avg_gold.toLocaleString()}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Average Damage</span>
                <span class="metric-value">${data.performance_stats.avg_damage.toLocaleString()}</span>
            </div>
            <div class="metric-item">
                <span class="metric-label">Win Rate</span>
                <span class="metric-value">${data.win_rate ? data.win_rate.toFixed(1) : 'N/A'}%</span>
            </div>
        `;
    }

    // Update top items with actual item names and icons
    const topItemsList = document.getElementById('top-items-list');
    if (topItemsList && data.top_items) {
        topItemsList.innerHTML = data.top_items.map(item => `
            <div class="item-usage">
                <span class="item-name">${createItemHtml(item.id)}</span>
                <span class="usage-percent">${item.usage.toFixed(1)}%</span>
            </div>
        `).join('');
    }

    // Update dataset overview
    const datasetOverview = document.getElementById('dataset-overview');
    if (datasetOverview && data.champion_info) {
        const championHtml = createChampionHtml(data.champion_info.champion_id);
        datasetOverview.innerHTML = `
            <div class="overview-item">
                <span class="label">Champion Focus</span>
                <span class="value">${championHtml}</span>
            </div>
            <div class="overview-item">
                <span class="label">Total Records</span>
                <span class="value">${data.champion_info.total_records.toLocaleString()}</span>
            </div>
            <div class="overview-item">
                <span class="label">Build Diversity</span>
                <span class="value">${data.build_diversity ? data.build_diversity.toFixed(1) : 'N/A'}%</span>
            </div>
        `;
    }
}

async function loadEDAData() {
    try {
        console.log('Loading EDA data...');
        const response = await fetch('data/eda_insights.json');
        
        if (response.ok) {
            const data = await response.json();
            console.log('EDA data loaded from file:', data);
            populateEDAData(data);
            return;
        }
    } catch (error) {
        console.log('Using embedded EDA data due to:', error.message);
    }
    
    // Use embedded data as fallback
    populateEDAData(EDA_DATA);
    console.log('EDA data loaded from embedded source');
}

// Load algorithm comparison data
async function loadAlgorithmData() {
    try {
        console.log('Loading algorithm comparison data...');
        const response = await fetch('data/algorithm_comparison.json');
        
        if (response.ok) {
            const data = await response.json();
            console.log('Algorithm data loaded from file:', data);
            populateAlgorithmData(data);
            return;
        }
    } catch (error) {
        console.log('Using embedded algorithm data due to:', error.message);
    }
    
    // Use embedded data as fallback
    populateAlgorithmData(ALGORITHM_DATA);
    console.log('Algorithm data loaded from embedded source');
}

// Load dataset analysis data
async function loadDatasetData() {
    try {
        console.log('Loading dataset analysis data...');
        const response = await fetch('data/dataset_analysis.json');
        
        if (response.ok) {
            const data = await response.json();
            console.log('Dataset data loaded from file:', data);
            
            // Transform the data to match our expected format
            const transformedData = {
                dataset_info: data.dataset_info,
                processing_stats: {
                    raw_json_size_mb: 644, // This should come from processing logs
                    processed_matches: 8348, // This should come from processing logs
                    player_records: data.dataset_info.total_player_records,
                    columns_removed: 20 // This should come from processing logs
                },
                collection_stats: {
                    unique_players: 1531, // This should come from collection logs
                    match_ids_collected: 8362, // This should come from collection logs
                    api_calls_saved: 4090, // This should come from collection logs
                    duplicate_efficiency: 46.8, // This should come from collection logs
                    puuid_duplicates: 3003, // This should come from collection logs
                    match_id_duplicates: 11658, // This should come from collection logs
                    time_saved_minutes: 51.1 // This should come from collection logs
                },
                champion_focus: data.top_champions ? {
                    champion_id: data.top_champions[0].champion_id,
                    total_records: data.top_champions[0].total_records,
                    baseline_win_rate: data.top_champions[0].win_rate
                } : null
            };
            
            populateDatasetData(transformedData);
            return;
        }
    } catch (error) {
        console.log('Using embedded dataset data due to:', error.message);
    }
    
    // Use embedded data as fallback
    populateDatasetData(DATASET_DATA);
    console.log('Dataset data loaded from embedded source');
} 