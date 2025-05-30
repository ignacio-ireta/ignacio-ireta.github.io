/**
 * Data Loader Module - Loads optimization data and provides caching
 * 
 * This module handles loading optimization results and EDA insights
 * with proper error handling and caching.
 */

class OptimizationDataLoader {
    constructor() {
        this.cache = new Map();
        this.isLoading = false;
    }

    /**
     * Load optimization data with champion and item name resolution
     */
    async loadOptimizationData() {
        if (this.isLoading) {
            console.log('⏳ Data loading already in progress...');
            return null;
        }

        const cacheKey = 'optimization_data';
        if (this.cache.has(cacheKey)) {
            console.log('📋 Using cached optimization data');
            return this.cache.get(cacheKey);
        }

        this.isLoading = true;
        
        try {
            console.log('🔄 Loading optimization data...');

            // Load all required data files
            const [algorithmData, edaData] = await Promise.all([
                this._loadAlgorithmComparison(),
                this._loadEDAInsights()
            ]);

            if (!algorithmData || !edaData) {
                throw new Error('Failed to load required data files');
            }

            // Wait for managers to be ready
            await this._ensureManagersReady();

            // Combine and enhance data with real names
            const combinedData = this._combineData(algorithmData, edaData);
            const enhancedData = await this._enhanceWithRealNames(combinedData);

            // Validate the final data
            enhancedData.isValid = this._validateData(enhancedData);

            if (enhancedData.isValid) {
                this.cache.set(cacheKey, enhancedData);
                console.log('✅ Optimization data loaded and cached successfully');
            } else {
                console.warn('⚠️ Loaded data failed validation');
            }

            return enhancedData;

        } catch (error) {
            console.error('❌ Error loading optimization data:', error);
            return {
                isValid: false,
                error: error.message,
                metadata: { champion_id: 0, total_games: 0, win_rate: 0 },
                algorithms: {},
                insights: {}
            };
        } finally {
            this.isLoading = false;
        }
    }

    async _loadAlgorithmComparison() {
        try {
            const response = await fetch('data/algorithm_comparison.json');
            if (!response.ok) {
                throw new Error(`Algorithm comparison fetch failed: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Failed to load algorithm comparison:', error);
            return null;
        }
    }

    async _loadEDAInsights() {
        try {
            const response = await fetch('data/eda_insights.json');
            if (!response.ok) {
                throw new Error(`EDA insights fetch failed: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('❌ Failed to load EDA insights:', error);
            return null;
        }
    }

    async _ensureManagersReady() {
        // Ensure champion manager is ready
        if (!window.championManager || !window.championManager.isReady()) {
            console.log('⏳ Waiting for champion manager...');
            await window.championManager.loadChampionData();
        }

        // Ensure item manager is ready
        if (!window.itemManager || !window.itemManager.isLoaded) {
            console.log('⏳ Waiting for item manager...');
            await window.itemManager.loadItemData();
        }
    }

    _combineData(algorithmData, edaData) {
        return {
            metadata: {
                champion_id: algorithmData.champion_id,
                total_games: edaData.champion_info?.total_records || 0,
                win_rate: algorithmData.baseline_win_rate || 0,
                generated_at: edaData.generated_at,
                data_source: edaData.data_source
            },
            algorithms: {
                genetic_algorithm: algorithmData.genetic_algorithm,
                differential_evolution: algorithmData.differential_evolution,
                baseline_win_rate: algorithmData.baseline_win_rate,
                comparison: algorithmData.comparison
            },
            insights: {
                performance_stats: edaData.performance_stats,
                top_items: edaData.top_items,
                build_diversity: edaData.build_diversity,
                game_duration: edaData.game_duration,
                win_rate_correlations: edaData.win_rate_correlations
            }
        };
    }

    async _enhanceWithRealNames(data) {
        try {
            // Get real champion name
            const championName = window.championManager.getChampionName(data.metadata.champion_id);
            data.championName = championName;

            // Enhance top items with real names
            if (data.insights.top_items) {
                data.insights.top_items = data.insights.top_items.map(item => {
                    const itemData = window.itemManager.getItem(item.id);
                    return {
                        ...item,
                        name: itemData.name,
                        description: itemData.description,
                        image: itemData.image
                    };
                });
            }

            // Enhance algorithm builds with item names
            if (data.algorithms.genetic_algorithm?.optimal_build) {
                data.algorithms.genetic_algorithm.optimal_build_names = data.algorithms.genetic_algorithm.optimal_build.map(itemId => {
                    return window.itemManager.getItem(itemId).name;
                });
            }

            if (data.algorithms.differential_evolution?.optimal_build) {
                data.algorithms.differential_evolution.optimal_build_names = data.algorithms.differential_evolution.optimal_build.map(itemId => {
                    return window.itemManager.getItem(itemId).name;
                });
            }

            console.log(`✅ Enhanced data with real names for ${championName}`);
            return data;

        } catch (error) {
            console.error('❌ Error enhancing data with real names:', error);
            return data; // Return original data if enhancement fails
        }
    }

    _validateData(data) {
        try {
            // Check required fields
            const requiredFields = [
                'metadata.champion_id',
                'metadata.total_games',
                'algorithms.genetic_algorithm',
                'algorithms.differential_evolution',
                'insights'
            ];

            for (const field of requiredFields) {
                const value = this._getNestedValue(data, field);
                if (value === undefined || value === null) {
                    console.warn(`⚠️ Missing required field: ${field}`);
                    return false;
                }
            }

            // Validate champion ID
            if (data.metadata.champion_id <= 0) {
                console.warn('⚠️ Invalid champion ID');
                return false;
            }

            // Validate algorithms have builds
            if (!data.algorithms.genetic_algorithm.optimal_build || 
                !data.algorithms.differential_evolution.optimal_build) {
                console.warn('⚠️ Missing optimal builds');
                return false;
            }

            console.log('✅ Data validation passed');
            return true;

        } catch (error) {
            console.error('❌ Data validation error:', error);
            return false;
        }
    }

    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Data cache cleared');
    }

    /**
     * Get cache status
     */
    getCacheInfo() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Create global instance
window.optimizationDataLoader = new OptimizationDataLoader(); 