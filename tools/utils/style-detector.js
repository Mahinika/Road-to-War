/**
 * Style Detector
 * Detects visual style patterns: outlines, shading, dithering, highlights
 */

export class StyleDetector {
    /**
     * Get pixel color from image data
     * @param {ImageData} imageData - Canvas ImageData object
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Array<number>} [r, g, b, a] or null if out of bounds
     */
    getPixel(imageData, x, y) {
        if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
            return null;
        }
        const idx = (y * imageData.width + x) * 4;
        return [
            imageData.data[idx],
            imageData.data[idx + 1],
            imageData.data[idx + 2],
            imageData.data[idx + 3]
        ];
    }
    
    /**
     * Check if pixel is on edge (has transparent neighbor)
     * @param {ImageData} imageData - Canvas ImageData object
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} True if pixel is on edge
     */
    isEdgePixel(imageData, x, y) {
        const pixel = this.getPixel(imageData, x, y);
        if (!pixel || pixel[3] === 0) return false;
        
        const neighbors = [
            this.getPixel(imageData, x - 1, y),
            this.getPixel(imageData, x + 1, y),
            this.getPixel(imageData, x, y - 1),
            this.getPixel(imageData, x, y + 1)
        ];
        
        return neighbors.some(n => !n || n[3] === 0);
    }
    
    /**
     * Detect outline color and thickness
     * @param {ImageData} imageData - Canvas ImageData object
     * @returns {Object} Outline information
     */
    detectOutline(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const edgeColors = new Map();
        
        // Collect colors from edge pixels
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (this.isEdgePixel(imageData, x, y)) {
                    const pixel = this.getPixel(imageData, x, y);
                    if (pixel && pixel[3] > 0) {
                        const hex = (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
                        edgeColors.set(hex, (edgeColors.get(hex) || 0) + 1);
                    }
                }
            }
        }
        
        // Find most common dark color (likely outline)
        let outlineColor = 0x000000;
        let maxCount = 0;
        
        edgeColors.forEach((count, hex) => {
            const [r, g, b] = [(hex >> 16) & 0xFF, (hex >> 8) & 0xFF, hex & 0xFF];
            const brightness = (r + g + b) / 3;
            
            // Prefer darker colors
            if (brightness < 100 && count > maxCount) {
                maxCount = count;
                outlineColor = hex;
            }
        });
        
        // Estimate thickness (simplified - count consecutive edge pixels)
        let thickness = 1;
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                if (this.isEdgePixel(imageData, x, y)) {
                    // Check how many pixels in a row are edge pixels
                    let consecutive = 1;
                    for (let dx = 1; x + dx < width && this.isEdgePixel(imageData, x + dx, y); dx++) {
                        consecutive++;
                    }
                    thickness = Math.max(thickness, Math.min(consecutive, 3));
                }
            }
        }
        
        return {
            color: outlineColor,
            thickness: Math.min(thickness, 3) // Cap at 3 for pixel art
        };
    }
    
    /**
     * Analyze shading method
     * @param {ImageData} imageData - Canvas ImageData object
     * @returns {string} Shading method: 'cel-shading', 'gradient', 'flat'
     */
    detectShading(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const transitions = [];
        
        // Sample horizontal and vertical transitions
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const pixel1 = this.getPixel(imageData, x, y);
                const pixel2 = this.getPixel(imageData, x + 1, y);
                
                if (pixel1 && pixel2 && pixel1[3] > 0 && pixel2[3] > 0) {
                    const brightness1 = (pixel1[0] + pixel1[1] + pixel1[2]) / 3;
                    const brightness2 = (pixel2[0] + pixel2[1] + pixel2[2]) / 3;
                    const diff = Math.abs(brightness1 - brightness2);
                    transitions.push(diff);
                }
            }
        }
        
        if (transitions.length === 0) return 'flat';
        
        // Analyze transition patterns
        const avgTransition = transitions.reduce((a, b) => a + b, 0) / transitions.length;
        const largeTransitions = transitions.filter(t => t > 50).length;
        const ratio = largeTransitions / transitions.length;
        
        // Cel-shading: many large, sudden transitions
        if (ratio > 0.1 && avgTransition > 30) {
            return 'cel-shading';
        }
        
        // Gradient: many small, gradual transitions
        if (avgTransition < 20 && ratio < 0.05) {
            return 'gradient';
        }
        
        // Flat: very few transitions
        return 'flat';
    }
    
    /**
     * Detect dithering patterns
     * @param {ImageData} imageData - Canvas ImageData object
     * @returns {boolean} True if dithering detected
     */
    detectDithering(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        let checkerboardCount = 0;
        let totalSamples = 0;
        
        // Check for checkerboard patterns (common dithering)
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const pixel = this.getPixel(imageData, x, y);
                const neighbor1 = this.getPixel(imageData, x + 1, y);
                const neighbor2 = this.getPixel(imageData, x, y + 1);
                
                if (pixel && neighbor1 && neighbor2 && 
                    pixel[3] > 0 && neighbor1[3] > 0 && neighbor2[3] > 0) {
                    totalSamples++;
                    
                    const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
                    const brightness1 = (neighbor1[0] + neighbor1[1] + neighbor1[2]) / 3;
                    const brightness2 = (neighbor2[0] + neighbor2[1] + neighbor2[2]) / 3;
                    
                    // Check for alternating pattern
                    if (Math.abs(brightness - brightness1) > 30 && 
                        Math.abs(brightness - brightness2) > 30 &&
                        Math.abs(brightness1 - brightness2) < 10) {
                        checkerboardCount++;
                    }
                }
            }
        }
        
        // If more than 5% of samples show checkerboard pattern, likely dithering
        return totalSamples > 0 && (checkerboardCount / totalSamples) > 0.05;
    }
    
    /**
     * Detect highlight placement
     * @param {ImageData} imageData - Canvas ImageData object
     * @returns {Object} Highlight information
     */
    detectHighlights(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const brightPixels = [];
        
        // Find bright pixels on edges (likely highlights)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (this.isEdgePixel(imageData, x, y)) {
                    const pixel = this.getPixel(imageData, x, y);
                    if (pixel && pixel[3] > 0) {
                        const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
                        if (brightness > 200) {
                            brightPixels.push({ x, y, brightness });
                        }
                    }
                }
            }
        }
        
        const hasHighlights = brightPixels.length > 0;
        let highlightColor = 0xFFFFFF;
        
        if (hasHighlights) {
            // Find most common bright color
            const colorCounts = new Map();
            brightPixels.forEach(({ x, y }) => {
                const pixel = this.getPixel(imageData, x, y);
                if (pixel) {
                    const hex = (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
                    colorCounts.set(hex, (colorCounts.get(hex) || 0) + 1);
                }
            });
            
            let maxCount = 0;
            colorCounts.forEach((count, hex) => {
                if (count > maxCount) {
                    maxCount = count;
                    highlightColor = hex;
                }
            });
        }
        
        // Detect light direction (simplified - check which side has more highlights)
        const leftHighlights = brightPixels.filter(p => p.x < width / 2).length;
        const rightHighlights = brightPixels.filter(p => p.x >= width / 2).length;
        const topHighlights = brightPixels.filter(p => p.y < height / 2).length;
        
        let lightDirection = 'top';
        if (leftHighlights > rightHighlights * 1.5) lightDirection = 'top-left';
        else if (rightHighlights > leftHighlights * 1.5) lightDirection = 'top-right';
        else if (topHighlights < brightPixels.length * 0.3) lightDirection = 'bottom';
        
        return {
            hasHighlights,
            color: highlightColor,
            lightDirection
        };
    }
    
    /**
     * Count unique colors (palette size)
     * @param {ImageData} imageData - Canvas ImageData object
     * @returns {number} Number of unique colors
     */
    analyzeColorCount(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const colors = new Set();
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixel = this.getPixel(imageData, x, y);
                if (pixel && pixel[3] > 0) {
                    const hex = (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
                    colors.add(hex);
                }
            }
        }
        
        return colors.size;
    }
}

