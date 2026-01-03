/**
 * City Biome Generator - Urban areas with cobblestone roads and stone buildings
 * Creates chibi pixel art cities with multiple building types
 */

import { RoadGenerator } from '../road-generator.js';
import { BuildingGenerator } from './building-generator.js';

export class CityBiomeGenerator {
    constructor(scene) {
        this.scene = scene;
        this.roadGenerator = new RoadGenerator(scene);
        this.buildingGenerator = new BuildingGenerator(scene);
        this.buildings = [];
    }

    /**
     * Generate a city biome
     * @param {number} width - World width
     * @param {number} height - World height
     * @param {number} groundY - Ground level Y position
     * @returns {Object} Biome data {road, buildings, npcs}
     */
    generateCity(width, height, groundY) {
        // Generate cobblestone road through city
        const road = this.roadGenerator.generateRoadPath('city', width, height, groundY);
        
        // Place buildings (more densely packed than towns)
        const buildings = this.placeBuildings(road, width, height, groundY);
        
        // Place NPCs
        const npcs = this.placeNPCs(road, width, height, groundY);
        
        return {
            road: road,
            buildings: buildings,
            npcs: npcs,
            type: 'city'
        };
    }

    /**
     * Place buildings in city (denser than towns)
     */
    placeBuildings(road, width, height, groundY) {
        const buildings = [];
        const buildingSpacing = 120; // Closer spacing than towns
        const numBuildings = Math.floor(width / buildingSpacing);
        
        // More commercial buildings in cities
        const buildingTypes = ['residential', 'commercial', 'commercial', 'civic', 'defensive'];
        
        for (let i = 0; i < numBuildings; i++) {
            const buildingX = 150 + (i * buildingSpacing);
            const roadY = this.roadGenerator.getRoadYAtX('city', buildingX, width, height);
            
            if (roadY === null) continue;
            
            // Alternate sides of road
            const sideOffset = (i % 2 === 0) ? -90 : 90;
            const buildingXPos = buildingX + sideOffset;
            
            // Taller buildings in cities
            const buildingType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
            const heightMultiplier = buildingType === 'civic' ? 1.3 : buildingType === 'defensive' ? 1.5 : 1.0;
            
            const building = this.buildingGenerator.generateBuilding(
                buildingType,
                buildingXPos,
                roadY + 30,
                {
                    enterable: buildingType === 'commercial' || Math.random() > 0.6,
                    height: undefined // Let it use default with multiplier applied in generator
                }
            );
            
            // Scale building if needed for height variation
            if (heightMultiplier !== 1.0) {
                building.sprite.setScale(1, heightMultiplier);
            }
            
            buildings.push(building);
        }
        
        // Place multiple shops in city
        for (let i = 0; i < 3; i++) {
            const shopX = (width / 4) * (i + 1);
            const shopRoadY = this.roadGenerator.getRoadYAtX('city', shopX, width, height);
            if (shopRoadY !== null) {
                const shop = this.buildingGenerator.generateShopBuilding(
                    shopX,
                    shopRoadY + 30,
                    'general'
                );
                buildings.push(shop);
            }
        }
        
        this.buildings = buildings;
        return buildings;
    }

    /**
     * Place NPCs in city (placeholder)
     */
    placeNPCs(road, width, height, groundY) {
        return [];
    }

    /**
     * Clean up city data
     */
    cleanup() {
        this.buildings.forEach(building => {
            if (building.sprite && !building.sprite.destroyed) {
                building.sprite.destroy();
            }
            if (building.doorZone && !building.doorZone.destroyed) {
                building.doorZone.destroy();
            }
            if (building.sign && !building.sign.destroyed) {
                building.sign.destroy();
            }
            if (building.shopText && !building.shopText.destroyed) {
                building.shopText.destroy();
            }
        });
        this.buildings = [];
    }
}

