/**
 * Image Analyzer
 * Orchestrates all analysis components to extract style configuration from reference images
 */

import { loadImage, createCanvas } from 'canvas';
import { ColorQuantizer } from './color-quantizer.js';
import { MaterialClassifier } from './material-classifier.js';
import { ProportionAnalyzer } from './proportion-analyzer.js';
import { StyleDetector } from './style-detector.js';

export class ImageAnalyzer {
    constructor() {
        this.colorQuantizer = new ColorQuantizer();
        this.materialClassifier = new MaterialClassifier();
        this.proportionAnalyzer = new ProportionAnalyzer();
        this.styleDetector = new StyleDetector();
    }
    
    /**
     * Main analysis method
     * @param {string} imagePath - Path to reference image
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Style configuration object
     */
    async analyzeReference(imagePath, options = {}) {
        const maxColors = options.maxColors || 16;
        
        // 1. Load image
        const image = await loadImage(imagePath);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        
        // 2. Extract palette using median cut
        const palette = this.colorQuantizer.extractPalette(imageData, maxColors);
        
        // 3. Classify colors by material type
        const materialPalette = this.materialClassifier.groupByMaterial(palette);
        
        // 4. Analyze proportions
        const regions = this.proportionAnalyzer.detectBodyRegions(imageData);
        const proportions = this.proportionAnalyzer.measureProportions(regions);
        
        // 5. Detect equipment
        const equipment = this.proportionAnalyzer.detectEquipment(imageData, regions);
        
        // 6. Detect style patterns
        const outline = this.styleDetector.detectOutline(imageData);
        const shading = this.styleDetector.detectShading(imageData);
        const dithering = this.styleDetector.detectDithering(imageData);
        const highlights = this.styleDetector.detectHighlights(imageData);
        const colorCount = this.styleDetector.analyzeColorCount(imageData);
        
        const style = {
            outlineColor: outline.color,
            outlineThickness: outline.thickness,
            shadingMethod: shading,
            dithering: dithering,
            colorCount: colorCount,
            hasHighlights: highlights.hasHighlights,
            highlightColor: highlights.color,
            lightDirection: highlights.lightDirection
        };
        
        // 7. Combine into configuration
        return {
            source: imagePath,
            analyzedAt: new Date().toISOString(),
            palette: materialPalette,
            proportions: proportions,
            style: style,
            equipment: equipment
        };
    }
    
    /**
     * Analyze multiple reference images and combine results
     * @param {Array<string>} imagePaths - Array of image paths
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Combined style configuration
     */
    async analyzeMultipleReferences(imagePaths, options = {}) {
        const analyses = await Promise.all(
            imagePaths.map(path => this.analyzeReference(path, options))
        );
        
        // Combine palettes (merge all colors, remove duplicates)
        const combinedPalette = {};
        analyses.forEach(analysis => {
            Object.keys(analysis.palette).forEach(material => {
                if (!combinedPalette[material]) {
                    combinedPalette[material] = [];
                }
                analysis.palette[material].forEach(color => {
                    if (!combinedPalette[material].includes(color)) {
                        combinedPalette[material].push(color);
                    }
                });
            });
        });
        
        // Average proportions
        const avgProportions = {};
        const proportionKeys = Object.keys(analyses[0].proportions);
        proportionKeys.forEach(key => {
            const sum = analyses.reduce((acc, a) => acc + (a.proportions[key] || 0), 0);
            avgProportions[key] = Math.round(sum / analyses.length);
        });
        
        // Most common style (simplified - take first, could be improved)
        const style = analyses[0].style;
        
        // Combine equipment (if any present in any analysis)
        const combinedEquipment = {};
        analyses.forEach(analysis => {
            Object.keys(analysis.equipment).forEach(item => {
                if (analysis.equipment[item].present) {
                    combinedEquipment[item] = analysis.equipment[item];
                }
            });
        });
        
        return {
            sources: imagePaths,
            analyzedAt: new Date().toISOString(),
            palette: combinedPalette,
            proportions: avgProportions,
            style: style,
            equipment: combinedEquipment
        };
    }
}

