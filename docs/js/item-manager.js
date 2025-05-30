/**
 * Item Manager Module - Handles League of Legends item data
 * 
 * This module loads item data from Riot's Data Dragon and provides
 * utilities for displaying item names, images, and information.
 */

class ItemManager {
    constructor() {
        this.itemData = null;
        this.isLoaded = false;
        this.loadPromise = null;
    }

    /**
     * Load item data from Data Dragon
     */
    async loadItemData() {
        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.loadPromise = this._fetchItemData();
        return this.loadPromise;
    }

    async _fetchItemData() {
        try {
            console.log('📦 Loading item data from Data Dragon...');
            
            const response = await fetch('assets/dragontail_data/15.10.1/data/en_US/item.json');
            if (!response.ok) {
                throw new Error(`Failed to load item data: ${response.status}`);
            }
            
            const data = await response.json();
            this.itemData = data.data;
            this.isLoaded = true;
            
            console.log(`✅ Loaded ${Object.keys(this.itemData).length} items from Data Dragon`);
            return this.itemData;
        } catch (error) {
            console.error('❌ Error loading item data:', error);
            this.itemData = {};
            this.isLoaded = false;
            throw error;
        }
    }

    /**
     * Get item information by ID
     */
    getItem(itemId) {
        if (!this.isLoaded) {
            console.warn(`⚠️ Item manager not loaded yet, returning default for item ${itemId}`);
            return this._getDefaultItem(itemId);
        }

        const itemKey = itemId.toString();
        if (!this.itemData[itemKey]) {
            console.warn(`⚠️ Item ${itemId} not found in data, returning default`);
            return this._getDefaultItem(itemId);
        }

        const item = this.itemData[itemKey];
        const result = {
            id: itemId,
            name: item.name,
            description: item.description || item.plaintext || '',
            image: {
                full: item.image?.full || `${itemId}.png`,
                sprite: item.image?.sprite || 'item0.png',
                group: item.image?.group || 'item'
            },
            gold: item.gold || {},
            tags: item.tags || [],
            stats: item.stats || {}
        };
        
        console.log(`✅ Loaded item ${itemId}: ${result.name} (image: ${result.image.full})`);
        return result;
    }

    /**
     * Get multiple items by IDs
     */
    getItems(itemIds) {
        return itemIds.map(id => this.getItem(id));
    }

    /**
     * Create item display element
     */
    createItemElement(itemId, options = {}) {
        const item = this.getItem(itemId);
        const {
            showName = true,
            showTooltip = true,
            size = 'medium',
            className = ''
        } = options;

        // Handle empty slots
        if (itemId === 0 || itemId === '0') {
            return this._createEmptySlotElement(size, className);
        }

        const container = document.createElement('div');
        container.className = `item-container ${size} ${className}`;
        container.setAttribute('data-item-id', itemId);

        // Item image
        const img = document.createElement('img');
        img.src = item.image.url;
        img.alt = item.name;
        img.className = 'item-image';
        img.onerror = () => {
            // Fallback to a default item image or placeholder
            img.src = 'assets/dragontail_data/15.10.1/img/item/1001.png'; // Boots as fallback
        };

        container.appendChild(img);

        // Item name
        if (showName) {
            const nameElement = document.createElement('div');
            nameElement.className = 'item-name';
            nameElement.textContent = item.name;
            container.appendChild(nameElement);
        }

        // Tooltip
        if (showTooltip) {
            container.title = this._createTooltipText(item);
            container.classList.add('has-tooltip');
        }

        return container;
    }

    /**
     * Create a build display with multiple items
     */
    createBuildDisplay(itemIds, options = {}) {
        const {
            title = 'Item Build',
            showNames = true,
            showTooltips = true,
            size = 'medium',
            className = ''
        } = options;

        const container = document.createElement('div');
        container.className = `build-display ${className}`;

        // Title
        if (title) {
            const titleElement = document.createElement('h4');
            titleElement.className = 'build-title';
            titleElement.textContent = title;
            container.appendChild(titleElement);
        }

        // Items container
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'build-items';

        itemIds.forEach((itemId, index) => {
            const itemElement = this.createItemElement(itemId, {
                showName: showNames,
                showTooltip: showTooltips,
                size: size,
                className: `slot-${index}`
            });
            itemsContainer.appendChild(itemElement);
        });

        container.appendChild(itemsContainer);

        // Build stats summary
        const statsElement = this._createBuildStats(itemIds);
        container.appendChild(statsElement);

        return container;
    }

    /**
     * Update existing item displays with new data
     */
    updateItemDisplays() {
        const itemElements = document.querySelectorAll('[data-item-id]');
        itemElements.forEach(element => {
            const itemId = element.getAttribute('data-item-id');
            if (itemId && itemId !== '0') {
                const item = this.getItem(parseInt(itemId));
                
                // Update image
                const img = element.querySelector('.item-image');
                if (img) {
                    img.src = item.image.url;
                    img.alt = item.name;
                }
                
                // Update name
                const nameElement = element.querySelector('.item-name');
                if (nameElement) {
                    nameElement.textContent = item.name;
                }
                
                // Update tooltip
                if (element.classList.contains('has-tooltip')) {
                    element.title = this._createTooltipText(item);
                }
            }
        });
    }

    /**
     * Get build statistics
     */
    getBuildStats(itemIds) {
        const items = this.getItems(itemIds.filter(id => id !== 0));
        
        const stats = {
            totalCost: 0,
            categories: new Set(),
            effects: []
        };

        items.forEach(item => {
            stats.totalCost += item.gold.total || 0;
            item.tags.forEach(tag => stats.categories.add(tag));
            
            // Add notable effects
            if (item.plaintext) {
                stats.effects.push(item.plaintext);
            }
        });

        return {
            totalCost: stats.totalCost,
            categories: Array.from(stats.categories),
            effects: stats.effects,
            itemCount: items.length
        };
    }

    // Private helper methods
    _getDefaultItem(itemId) {
        return {
            id: itemId,
            name: `Item ${itemId}`,
            description: 'Item data not available',
            plaintext: '',
            image: {
                full: `${itemId}.png`,
                url: `assets/dragontail_data/15.10.1/img/item/${itemId}.png`
            },
            gold: { total: 0, base: 0, sell: 0 },
            tags: [],
            stats: {}
        };
    }

    _createEmptySlotElement(size, className) {
        const container = document.createElement('div');
        container.className = `item-container empty-slot ${size} ${className}`;
        container.setAttribute('data-item-id', '0');

        const placeholder = document.createElement('div');
        placeholder.className = 'empty-placeholder';
        placeholder.textContent = 'Empty';
        container.appendChild(placeholder);

        return container;
    }

    _cleanDescription(description) {
        if (!description) return '';
        
        // Remove HTML tags and clean up the description
        return description
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/\s+/g, ' ')    // Normalize whitespace
            .trim();
    }

    _createTooltipText(item) {
        let tooltip = `${item.name}`;
        
        if (item.gold.total > 0) {
            tooltip += `\nCost: ${item.gold.total}g`;
        }
        
        if (item.plaintext) {
            tooltip += `\n${item.plaintext}`;
        }
        
        if (item.tags.length > 0) {
            tooltip += `\nTags: ${item.tags.join(', ')}`;
        }
        
        return tooltip;
    }

    _createBuildStats(itemIds) {
        const stats = this.getBuildStats(itemIds);
        
        const container = document.createElement('div');
        container.className = 'build-stats';
        
        const costElement = document.createElement('div');
        costElement.className = 'stat-item';
        costElement.innerHTML = `<strong>Total Cost:</strong> ${stats.totalCost.toLocaleString()}g`;
        container.appendChild(costElement);
        
        const itemCountElement = document.createElement('div');
        itemCountElement.className = 'stat-item';
        itemCountElement.innerHTML = `<strong>Items:</strong> ${stats.itemCount}/7`;
        container.appendChild(itemCountElement);
        
        if (stats.categories.length > 0) {
            const categoriesElement = document.createElement('div');
            categoriesElement.className = 'stat-item';
            categoriesElement.innerHTML = `<strong>Categories:</strong> ${stats.categories.join(', ')}`;
            container.appendChild(categoriesElement);
        }
        
        return container;
    }
}

// Create global instance
window.itemManager = new ItemManager();

// Auto-load item data when the module loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.itemManager.loadItemData();
        console.log('✅ Item Manager initialized successfully');
        
        // Update any existing item displays
        window.itemManager.updateItemDisplays();
    } catch (error) {
        console.error('❌ Failed to initialize Item Manager:', error);
    }
}); 