/**
 * Town Biome Generator - Forest towns with roads and buildings
 * Creates chibi pixel art forest towns with wooden buildings
 */

import { RoadGenerator } from '../road-generator.js';
import { BuildingGenerator } from './building-generator.js';

export class TownBiomeGenerator {
    constructor(scene) {
        this.scene = scene;
        this.roadGenerator = new RoadGenerator(scene);
        this.buildingGenerator = new BuildingGenerator(scene);
        this.buildings = []; // Store building references
    }

    /**
     * Generate a forest town biome
     * @param {number} width - World width
     * @param {number} height - World height
     * @param {number} groundY - Ground level Y position
     * @returns {Object} Biome data {road, buildings, npcs}
     */
    generateForestTown(width, height, groundY) {
        // Generate road through town
        const road = this.roadGenerator.generateRoadPath('forest_town', width, height, groundY);
        
        // Place buildings along the road
        const buildings = this.placeBuildingsAlongRoad(road, width, height, groundY);
        
        // Place NPCs in town
        const npcs = this.placeNPCs(road, width, height, groundY);
        
        return {
            road: road,
            buildings: buildings,
            npcs: npcs,
            type: 'forest_town'
        };
    }

    /**
     * Place buildings along the road
     */
    placeBuildingsAlongRoad(road, width, height, groundY) {
        const buildings = [];
        const buildingSpacing = 150; // Space between buildings
        const numBuildings = Math.floor(width / buildingSpacing);
        
        // Building types to place
        const buildingTypes = ['residential', 'residential', 'commercial', 'civic'];
        
        for (let i = 0; i < numBuildings; i++) {
            const buildingX = 200 + (i * buildingSpacing);
            const roadY = this.roadGenerator.getRoadYAtX('forest_town', buildingX, width, height);
            
            if (roadY === null) continue;
            
            // Place building to the side of road (alternate sides)
            const sideOffset = (i % 2 === 0) ? -80 : 80;
            const buildingXPos = buildingX + sideOffset;
            
            // Choose building type
            const buildingType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
            
            // Generate building
            const building = this.buildingGenerator.generateBuilding(
                buildingType,
                buildingXPos,
                roadY + 30, // Slightly below road
                {
                    enterable: buildingType === 'commercial' || Math.random() > 0.7
                }
            );
            
            buildings.push(building);
        }
        
        // Place a shop near the center
        const shopX = width / 2;
        const shopRoadY = this.roadGenerator.getRoadYAtX('forest_town', shopX, width, height);
        if (shopRoadY !== null) {
            const shop = this.buildingGenerator.generateShopBuilding(
                shopX,
                shopRoadY + 30,
                'general'
            );
            buildings.push(shop);
        }
        
        this.buildings = buildings;
        return buildings;
    }

    /**
     * Place NPCs in town (placeholder - will be enhanced in Phase 4)
     */
    placeNPCs(road, width, height, groundY) {
        // NPCs will be placed in Phase 4
        return [];
    }

    /**
     * Clean up town data
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

