/**
 * Proportion Analyzer
 * Detects body regions and measures sprite proportions using edge detection and region growing
 */

export class ProportionAnalyzer {
    /**
     * Sobel edge detection (simplified for pixel art)
     * @param {ImageData} imageData - Canvas ImageData object
     * @returns {Array<Array<number>>} Edge map (2D array of edge strengths)
     */
    detectEdges(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        
        // Sobel kernels
        const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
        const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
        
        const edges = Array(height).fill(0).map(() => Array(width).fill(0));
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;
                
                // Apply Sobel kernels
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4;
                        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                        
                        gx += gray * sobelX[ky + 1][kx + 1];
                        gy += gray * sobelY[ky + 1][kx + 1];
                    }
                }
                
                // Calculate edge strength
                edges[y][x] = Math.sqrt(gx * gx + gy * gy);
            }
        }
        
        return edges;
    }
    
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
     * Calculate color similarity (Euclidean distance in RGB space)
     * @param {Array<number>} color1 - [r, g, b]
     * @param {Array<number>} color2 - [r, g, b]
     * @returns {number} Distance (0 = identical, higher = more different)
     */
    colorSimilarity(color1, color2) {
        if (!color1 || !color2) return Infinity;
        const dr = color1[0] - color2[0];
        const dg = color1[1] - color2[1];
        const db = color1[2] - color2[2];
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }
    
    /**
     * Region growing algorithm
     * @param {ImageData} imageData - Canvas ImageData object
     * @param {number} seedX - Seed point X
     * @param {number} seedY - Seed point Y
     * @param {number} threshold - Color similarity threshold
     * @returns {Array<Object>} Array of {x, y} points in the region
     */
    regionGrowing(imageData, seedX, seedY, threshold = 30) {
        const seedPixel = this.getPixel(imageData, seedX, seedY);
        if (!seedPixel || seedPixel[3] === 0) return [];
        
        const region = [];
        const queue = [{ x: seedX, y: seedY }];
        const visited = new Set();
        const width = imageData.width;
        const height = imageData.height;
        
        while (queue.length > 0) {
            const point = queue.shift();
            const key = `${point.x},${point.y}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            
            const pixel = this.getPixel(imageData, point.x, point.y);
            if (!pixel || pixel[3] === 0) continue;
            
            const similarity = this.colorSimilarity(
                [seedPixel[0], seedPixel[1], seedPixel[2]],
                [pixel[0], pixel[1], pixel[2]]
            );
            
            if (similarity <= threshold) {
                region.push(point);
                
                // Add neighbors to queue
                const neighbors = [
                    { x: point.x - 1, y: point.y },
                    { x: point.x + 1, y: point.y },
                    { x: point.x, y: point.y - 1 },
                    { x: point.x, y: point.y + 1 }
                ];
                
                neighbors.forEach(neighbor => {
                    if (neighbor.x >= 0 && neighbor.x < width &&
                        neighbor.y >= 0 && neighbor.y < height) {
                        const neighborKey = `${neighbor.x},${neighbor.y}`;
                        if (!visited.has(neighborKey)) {
                            queue.push(neighbor);
                        }
                    }
                });
            }
        }
        
        return region;
    }
    
    /**
     * Detect body regions using region growing
     * @param {ImageData} imageData - Canvas ImageData object
     * @returns {Object} Detected body regions
     */
    detectBodyRegions(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const centerX = Math.floor(width / 2);
        const centerY = Math.floor(height / 2);
        
        // Try to detect head (top center)
        const headY = Math.floor(height * 0.2);
        const headRegion = this.regionGrowing(imageData, centerX, headY, 40);
        
        // Try to detect torso (center)
        const torsoRegion = this.regionGrowing(imageData, centerX, centerY, 40);
        
        // Try to detect legs (bottom center)
        const legY = Math.floor(height * 0.7);
        const leftLegRegion = this.regionGrowing(imageData, centerX - 4, legY, 40);
        const rightLegRegion = this.regionGrowing(imageData, centerX + 4, legY, 40);
        
        // Try to detect arms (middle sides)
        const armY = Math.floor(height * 0.4);
        const leftArmRegion = this.regionGrowing(imageData, centerX - 8, armY, 40);
        const rightArmRegion = this.regionGrowing(imageData, centerX + 8, armY, 40);
        
        return {
            head: headRegion,
            torso: torsoRegion,
            leftLeg: leftLegRegion,
            rightLeg: rightLegRegion,
            leftArm: leftArmRegion,
            rightArm: rightArmRegion
        };
    }
    
    /**
     * Measure proportions from detected regions
     * @param {Object} regions - Detected body regions
     * @returns {Object} Proportion measurements
     */
    measureProportions(regions) {
        const getBounds = (region) => {
            if (region.length === 0) return null;
            let minX = Infinity, maxX = -Infinity;
            let minY = Infinity, maxY = -Infinity;
            
            region.forEach(p => {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
            });
            
            return { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
        };
        
        const headBounds = getBounds(regions.head);
        const torsoBounds = getBounds(regions.torso);
        const leftLegBounds = getBounds(regions.leftLeg);
        const rightLegBounds = getBounds(regions.rightLeg);
        const leftArmBounds = getBounds(regions.leftArm);
        const rightArmBounds = getBounds(regions.rightArm);
        
        // Calculate center positions
        const centerX = torsoBounds ? Math.floor((torsoBounds.minX + torsoBounds.maxX) / 2) : 32;
        const centerY = torsoBounds ? Math.floor((torsoBounds.minY + torsoBounds.maxY) / 2) : 32;
        
        return {
            headSize: headBounds ? Math.max(headBounds.width, headBounds.height) : 8,
            headY: headBounds ? Math.floor((headBounds.minY + headBounds.maxY) / 2) : 12,
            torsoWidth: torsoBounds ? torsoBounds.width : 12,
            torsoHeight: torsoBounds ? torsoBounds.height : 16,
            torsoY: torsoBounds ? Math.floor((torsoBounds.minY + torsoBounds.maxY) / 2) : 28,
            armLength: leftArmBounds ? leftArmBounds.height : 12,
            armWidth: leftArmBounds ? leftArmBounds.width : 4,
            legLength: leftLegBounds ? leftLegBounds.height : 12,
            legWidth: leftLegBounds ? leftLegBounds.width : 6,
            centerX,
            centerY,
            symmetryAxis: centerX
        };
    }
    
    /**
     * Detect equipment positions
     * @param {ImageData} imageData - Canvas ImageData object
     * @param {Object} bodyRegions - Detected body regions
     * @returns {Object} Detected equipment
     */
    detectEquipment(imageData, bodyRegions) {
        // Simple implementation: detect non-body regions
        // This is a simplified version - full implementation would use more sophisticated detection
        const equipment = {
            helmet: { present: bodyRegions.head.length > 0 },
            chestArmor: { present: bodyRegions.torso.length > 0 },
            weapon: { present: false, type: 'unknown' }
        };
        
        // Try to detect weapon on right side
        const width = imageData.width;
        const height = imageData.height;
        const centerX = Math.floor(width / 2);
        
        // Check right side for potential weapon
        for (let x = centerX + 10; x < width - 2; x++) {
            for (let y = height * 0.3; y < height * 0.7; y++) {
                const pixel = this.getPixel(imageData, x, y);
                if (pixel && pixel[3] > 0) {
                    equipment.weapon.present = true;
                    equipment.weapon.type = 'sword'; // Default assumption
                    equipment.weapon.position = { x, y };
                    break;
                }
            }
            if (equipment.weapon.present) break;
        }
        
        return equipment;
    }
}

