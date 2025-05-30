/**
 * Champion Manager Module - Handles League of Legends champion data
 * 
 * This module loads champion data from Riot's Data Dragon and provides
 * utilities for mapping champion IDs to names, images, and information.
 */

class ChampionManager {
    constructor() {
        this.championData = null;
        this.championIdMap = new Map(); // Maps champion key (ID) to champion data
        this.isLoaded = false;
        this.loadPromise = null;
    }

    /**
     * Load champion data from Data Dragon
     */
    async loadChampionData() {
        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.loadPromise = this._fetchChampionData();
        return this.loadPromise;
    }

    async _fetchChampionData() {
        try {
            console.log('🏆 Loading champion data from Data Dragon...');
            
            const response = await fetch('assets/dragontail_data/15.10.1/data/en_US/champion.json');
            if (!response.ok) {
                throw new Error(`Failed to load champion data: ${response.status}`);
            }
            
            const data = await response.json();
            this.championData = data.data;
            
            // Create ID mapping
            this.championIdMap.clear();
            Object.values(this.championData).forEach(champion => {
                const championId = parseInt(champion.key);
                this.championIdMap.set(championId, champion);
            });
            
            this.isLoaded = true;
            
            console.log(`✅ Loaded ${Object.keys(this.championData).length} champions from Data Dragon`);
            console.log(`📋 Created ID mapping for ${this.championIdMap.size} champions`);
            return this.championData;
        } catch (error) {
            console.error('❌ Error loading champion data:', error);
            this.championData = {};
            this.isLoaded = false;
            throw error;
        }
    }

    /**
     * Get champion information by ID
     */
    getChampion(championId) {
        if (!this.isLoaded || !this.championIdMap.has(championId)) {
            console.warn(`⚠️ Champion ${championId} not found in data`);
            return this._getDefaultChampion(championId);
        }

        const champion = this.championIdMap.get(championId);
        return {
            id: championId,
            key: champion.key,
            name: champion.name,
            title: champion.title,
            blurb: champion.blurb,
            image: {
                full: champion.image?.full || `${champion.id}.png`,
                url: `assets/dragontail_data/15.10.1/img/champion/${champion.image?.full || champion.id + '.png'}`,
                splash: `assets/dragontail_data/img/champion/splash/${champion.id}_0.jpg`
            },
            tags: champion.tags || [],
            info: champion.info || {},
            stats: champion.stats || {}
        };
    }

    /**
     * Get champion name by ID
     */
    getChampionName(championId) {
        const champion = this.getChampion(championId);
        return champion.name;
    }

    /**
     * Get champion splash art URL by ID
     */
    getChampionSplashUrl(championId) {
        const champion = this.getChampion(championId);
        return champion.image.splash;
    }

    /**
     * Get all champions as a list
     */
    getAllChampions() {
        if (!this.isLoaded) {
            console.warn('⚠️ Champion data not loaded yet');
            return [];
        }

        return Array.from(this.championIdMap.values()).map(champion => ({
            id: parseInt(champion.key),
            name: champion.name,
            title: champion.title,
            image: champion.image
        }));
    }

    /**
     * Search champions by name
     */
    searchChampions(query) {
        if (!this.isLoaded) {
            return [];
        }

        const lowerQuery = query.toLowerCase();
        return this.getAllChampions().filter(champion => 
            champion.name.toLowerCase().includes(lowerQuery) ||
            champion.title.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Check if champion data is loaded
     */
    isReady() {
        return this.isLoaded;
    }

    // Private helper methods
    _getDefaultChampion(championId) {
        return {
            id: championId,
            key: championId.toString(),
            name: `Champion ${championId}`,
            title: 'Unknown Champion',
            blurb: 'Champion data not available',
            image: {
                full: `Champion${championId}.png`,
                url: `assets/dragontail_data/15.10.1/img/champion/Champion${championId}.png`,
                splash: `assets/dragontail_data/img/champion/splash/Champion${championId}_0.jpg`
            },
            tags: [],
            info: {},
            stats: {}
        };
    }
}

// Create global instance
window.championManager = new ChampionManager();

// Auto-load champion data when the module loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.championManager.loadChampionData();
        console.log('✅ Champion Manager initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize Champion Manager:', error);
    }
}); 