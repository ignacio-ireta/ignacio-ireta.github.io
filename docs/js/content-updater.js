/**
 * Content Updater Module - Updates website sections with optimization data
 * 
 * This module handles updating different sections of the website
 * with dynamic optimization results.
 */

/**
 * Main Content Updater - Coordinates all section updates
 */
class ContentUpdater {
    constructor() {
        this.edaUpdater = new EDAUpdater();
        this.modelingUpdater = new ModelingUpdater();
        this.preprocessingUpdater = new PreprocessingUpdater();
    }

    /**
     * Update all sections with optimization data
     */
    async updateAll(data) {
        try {
            console.log('🔄 Starting content update for all sections...');
            
            // Update EDA section
            await this.edaUpdater.update(data);
            
            // Update Modeling section
            await this.modelingUpdater.update(data);
            
            // Update Preprocessing section
            await this.preprocessingUpdater.update(data);
            
            console.log('✅ All sections updated successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Error updating content:', error);
            return false;
        }
    }
}

/**
 * EDA Section Updater
 */
class EDAUpdater {
    async update(data) {
        const { metadata, insights } = data;
        
        // Wait for champion manager to be ready
        if (!window.championManager || !window.championManager.isReady()) {
            console.log('⏳ Waiting for champion manager to load...');
            try {
                await window.championManager.loadChampionData();
            } catch (error) {
                console.error('❌ Failed to load champion data:', error);
            }
        }

        // Get real champion name
        const championName = window.championManager.getChampionName(metadata.champion_id);
        
        console.log(`🎯 Updating EDA section for ${championName} (ID: ${metadata.champion_id})`);

        // Update title and description
        this.updateTitle(championName, metadata.champion_id, metadata.total_games);
        
        // Update background
        await this.updateBackground(championName);
        
        // Update insights
        this.updateInsights(data, championName);
        
        // Update item analysis with real item names
        await this.updateItemAnalysis(insights);
        
        // Update statistics
        this.updateStatistics(insights);
        
        // Update win rate correlations
        this.updateWinRateCorrelations(data);
    }

    updateTitle(championName, championId, totalGames) {
        const title = document.querySelector('#eda .text-content h3');
        const description = document.querySelector('#eda .text-content p');
        
        if (title) {
            title.textContent = `${championName} (ID: ${championId}) Analysis`;
        }
        
        if (description) {
            description.textContent = `Deep dive into ${championName}'s performance patterns from ${totalGames} games, revealing key insights that drive optimization success.`;
        }
    }

    async updateBackground(championName) {
        const edaSection = document.querySelector('#eda');
        const parallaxBg = document.querySelector('#eda .parallax-bg');
        
        if (!edaSection) return;

        const splashUrl = `assets/dragontail_data/img/champion/splash/${championName}_0.jpg`;
        
        // Update parallax background
        if (parallaxBg) {
            parallaxBg.style.backgroundImage = `url('${splashUrl}')`;
            parallaxBg.setAttribute('data-bg', splashUrl);
        }
        
        // Update main section background
        edaSection.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8)), url('${splashUrl}')`;
        edaSection.style.backgroundSize = 'cover';
        edaSection.style.backgroundPosition = 'center';
        edaSection.style.backgroundAttachment = 'fixed';
        
        console.log(`✅ Updated background with ${championName} splash art`);
    }

    updateInsights(data, championName) {
        const { metadata, algorithms, insights } = data;
        const insightElements = document.querySelectorAll('#eda .insight');
        
        if (insightElements.length >= 4) {
            // Performance Patterns
            if (algorithms && algorithms.comparison) {
                const improvement = algorithms.comparison.advantage * 100;
                insightElements[0].querySelector('p').textContent = 
                    `Optimization algorithms achieved ${improvement.toFixed(1)}% improvement over ${(metadata.win_rate * 100).toFixed(1)}% baseline - clear optimization potential`;
            }
            
            // Game Duration Impact
            if (insights.game_duration) {
                const { short_games, long_games } = insights.game_duration;
                const betterDuration = short_games.win_rate > long_games.win_rate ? 'Shorter' : 'Longer';
                const maxWR = Math.max(short_games.win_rate, long_games.win_rate);
                const minWR = Math.min(short_games.win_rate, long_games.win_rate);
                
                insightElements[1].querySelector('p').textContent = 
                    `${betterDuration} games favor ${championName}: ${(maxWR * 100).toFixed(1)}% vs ${(minWR * 100).toFixed(1)}% - ${betterDuration.toLowerCase()} game champion confirmed`;
            }
            
            // Core Item Dependencies - use real item names
            if (insights.top_items && insights.top_items.length >= 2) {
                const [topItem, secondItem] = insights.top_items;
                const topItemName = window.itemManager ? window.itemManager.getItem(topItem.id).name : `Item ${topItem.id}`;
                const secondItemName = window.itemManager ? window.itemManager.getItem(secondItem.id).name : `Item ${secondItem.id}`;
                
                insightElements[2].querySelector('p').textContent = 
                    `${topItemName} (${topItem.usage.toFixed(1)}%) and ${secondItemName} (${secondItem.usage.toFixed(1)}%) dominate builds - core items identified`;
            }
            
            // Build Diversity
            if (insights.build_diversity) {
                const diversity = insights.build_diversity;
                insightElements[3].querySelector('p').textContent = 
                    `${diversity.unique_builds} unique builds across ${diversity.total_games} games (${diversity.diversity_percentage.toFixed(1)}%) - ${diversity.diversity_percentage > 90 ? 'high' : 'moderate'} optimization potential`;
            }
        }
    }

    async updateItemAnalysis(insights) {
        const itemAnalysis = document.querySelector('.item-analysis');
        if (!itemAnalysis || !insights.top_items) return;
        
        // Wait for item manager to be ready
        if (!window.itemManager || !window.itemManager.isLoaded) {
            console.log('⏳ Waiting for item manager to load...');
            try {
                await window.itemManager.loadItemData();
            } catch (error) {
                console.error('❌ Failed to load item data:', error);
                return;
            }
        }
        
        const itemsToShow = insights.top_items.slice(0, 5);
        
        itemAnalysis.innerHTML = itemsToShow.map(item => {
            const itemData = window.itemManager.getItem(item.id);
            const itemName = itemData.name;
            const itemImage = itemData.image.full;
            
            return `
                <div class="item-bar">
                    <div class="item-info">
                        <div class="item-display">
                            <img src="assets/dragontail_data/15.10.1/img/item/${itemImage}" 
                                 alt="${itemName}" 
                                 class="item-icon-small"
                                 onerror="this.style.display='none'">
                            <span class="item-name">${itemName}</span>
                        </div>
                        <span class="item-usage">${item.usage.toFixed(1)}%</span>
                    </div>
                    <div class="usage-bar" style="width: ${item.usage}%"></div>
                </div>
            `;
        }).join('');
        
        console.log('✅ Updated item analysis with real item names and images');
    }

    updateStatistics(insights) {
        const statValues = document.querySelectorAll('.stat-value');
        
        if (statValues.length >= 3 && insights.performance_stats) {
            const stats = insights.performance_stats;
            statValues[0].textContent = stats.avg_kda.toFixed(2);
            statValues[1].textContent = Math.round(stats.avg_gold).toLocaleString();
            statValues[2].textContent = `${(stats.avg_duration / 60).toFixed(1)} min`;
        }
    }

    updateWinRateCorrelations(data) {
        const { metadata, insights } = data;
        const winRates = document.querySelectorAll('.win-rate');
        
        if (winRates.length >= 4 && insights.win_rate_correlations) {
            const correlations = insights.win_rate_correlations;
            
            if (correlations.high_kda) {
                winRates[0].textContent = `${(correlations.high_kda.win_rate * 100).toFixed(1)}%`;
            }
            
            if (correlations.high_gold) {
                winRates[1].textContent = `${(correlations.high_gold.win_rate * 100).toFixed(1)}%`;
            }
            
            if (correlations.high_damage) {
                winRates[2].textContent = `${(correlations.high_damage.win_rate * 100).toFixed(1)}%`;
            }
            
            // Baseline
            winRates[3].textContent = `${(metadata.win_rate * 100).toFixed(1)}%`;
        }
    }
}

/**
 * Modeling Section Updater
 */
class ModelingUpdater {
    update(data) {
        const { metadata, algorithms } = data;
        
        console.log(`🧬 Updating modeling section for Champion ${metadata.champion_id}`);

        // Update algorithm results
        this.updateAlgorithmResults(algorithms);
        
        // Update progress metrics
        this.updateProgressMetrics(metadata, algorithms);
        
        // Update item builds display
        this.updateItemBuilds(algorithms);
    }

    updateAlgorithmResults(algorithms) {
        const modelItems = document.querySelectorAll('#modeling .model-item');
        
        if (modelItems.length >= 3) {
            // Genetic Algorithm
            const gaWinRate = (algorithms.genetic_algorithm.win_probability * 100).toFixed(1);
            const gaAccuracy = modelItems[0].querySelector('.accuracy');
            if (gaAccuracy) {
                gaAccuracy.textContent = `Win Rate: ${gaWinRate}%`;
            }
            
            // Differential Evolution
            const deWinRate = (algorithms.differential_evolution.win_probability * 100).toFixed(1);
            const deAccuracy = modelItems[1].querySelector('.accuracy');
            if (deAccuracy) {
                deAccuracy.textContent = `Win Rate: ${deWinRate}%`;
            }
            
            // Baseline
            const baselineWinRate = (algorithms.baseline_win_rate * 100).toFixed(1);
            const baselineAccuracy = modelItems[2].querySelector('.accuracy');
            if (baselineAccuracy) {
                baselineAccuracy.textContent = `Win Rate: ${baselineWinRate}%`;
            }
            
            // Update winner highlighting
            modelItems.forEach(item => item.classList.remove('best'));
            if (algorithms.comparison.winner === 'Differential Evolution') {
                modelItems[1].classList.add('best');
            } else if (algorithms.comparison.winner === 'Genetic Algorithm') {
                modelItems[0].classList.add('best');
            }
        }
    }

    updateProgressMetrics(metadata, algorithms) {
        const progressMetrics = document.querySelectorAll('#modeling .progress-item .value');
        
        if (progressMetrics.length >= 4) {
            // Champion Selected
            progressMetrics[0].textContent = `ID ${metadata.champion_id}`;
            
            // Improvement
            const bestImprovement = algorithms.comparison.advantage * 100;
            progressMetrics[2].textContent = `+${bestImprovement.toFixed(1)}%`;
            
            // Generations (use winner's generations)
            const winnerAlgo = algorithms.comparison.winner === 'Genetic Algorithm' ? 
                algorithms.genetic_algorithm : algorithms.differential_evolution;
            progressMetrics[3].textContent = `${winnerAlgo.generations}`;
        }
    }

    async updateItemBuilds(algorithms) {
        // Wait for item manager to be ready
        if (!window.itemManager || !window.itemManager.isLoaded) {
            console.log('⏳ Waiting for item manager to load for builds...');
            try {
                await window.itemManager.loadItemData();
            } catch (error) {
                console.error('❌ Failed to load item data for builds:', error);
                return;
            }
        }

        // Find or create item builds container
        let buildsContainer = document.querySelector('.algorithm-builds');
        if (!buildsContainer) {
            // Create builds container after the model items
            const modelingSection = document.querySelector('#modeling .section-content');
            if (modelingSection) {
                buildsContainer = document.createElement('div');
                buildsContainer.className = 'algorithm-builds';
                buildsContainer.innerHTML = `
                    <h4 style="color: #C89B3C; margin: 2rem 0 1rem 0; text-align: center;">Optimal Item Builds</h4>
                `;
                modelingSection.appendChild(buildsContainer);
            }
        }

        if (!buildsContainer) return;

        // Create builds display
        const gaBuilds = this.createBuildDisplay('Genetic Algorithm', algorithms.genetic_algorithm);
        const deBuilds = this.createBuildDisplay('Differential Evolution', algorithms.differential_evolution);

        // Clear existing builds and add new ones
        const existingBuilds = buildsContainer.querySelectorAll('.build-comparison');
        existingBuilds.forEach(build => build.remove());

        buildsContainer.appendChild(gaBuilds);
        buildsContainer.appendChild(deBuilds);

        console.log('✅ Updated item builds with real item names and images');
    }

    createBuildDisplay(algorithmName, algorithmData) {
        const buildContainer = document.createElement('div');
        buildContainer.className = 'build-comparison';
        
        const winRate = (algorithmData.win_rate * 100).toFixed(1);
        const improvement = algorithmData.improvement ? `(+${(algorithmData.improvement * 100).toFixed(1)}%)` : '';
        
        buildContainer.innerHTML = `
            <div class="build-header">
                <h5>${algorithmName}</h5>
                <span class="build-winrate">${winRate}% ${improvement}</span>
            </div>
            <div class="build-items">
                ${this.createItemsDisplay(algorithmData.optimal_build)}
            </div>
        `;
        
        return buildContainer;
    }

    createItemsDisplay(itemIds) {
        if (!itemIds || !Array.isArray(itemIds)) {
            return '<span class="no-items">No items available</span>';
        }

        return itemIds.map(itemId => {
            const itemData = window.itemManager.getItem(itemId);
            const itemName = itemData.name;
            const itemImage = itemData.image.full;
            
            return `
                <div class="build-item" title="${itemName}">
                    <img src="assets/dragontail_data/15.10.1/img/item/${itemImage}" 
                         alt="${itemName}" 
                         class="item-icon">
                    <span class="item-name">${itemName}</span>
                </div>
            `;
        }).join('');
    }
}

/**
 * Preprocessing Section Updater
 */
class PreprocessingUpdater {
    update(data) {
        const { metadata } = data;
        
        console.log(`🔄 Updating preprocessing section for Champion ${metadata.champion_id}`);
        
        // Update processing results
        this.updateProcessingResults(metadata);
    }
    
    updateProcessingResults(metadata) {
        const processingResults = document.querySelector('#preprocessing .quality-metrics');
        if (!processingResults) return;
        
        const metrics = processingResults.querySelectorAll('.metric');
        if (metrics.length >= 4) {
            // Update Selected Champion metric (last one)
            const championMetric = metrics[3];
            const valueElement = championMetric.querySelector('.value');
            if (valueElement) {
                valueElement.textContent = `ID ${metadata.champion_id}`;
            }
        }
        
        console.log(`✅ Updated preprocessing results with Champion ${metadata.champion_id}`);
    }
}

// Create global instance
window.contentUpdater = new ContentUpdater(); 