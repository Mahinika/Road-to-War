/**
 * Color Quantizer
 * Extracts dominant colors from images using Median Cut algorithm
 * Optimal for pixel art with small palettes (8-32 colors)
 */

/**
 * ColorBox class for median cut algorithm
 */
class ColorBox {
        constructor(pixels) {
            this.pixels = pixels;
            this.minR = 255;
            this.maxR = 0;
            this.minG = 255;
            this.maxG = 0;
            this.minB = 255;
            this.maxB = 0;
            
            // Calculate bounding box
            pixels.forEach(pixel => {
                const [r, g, b] = pixel;
                this.minR = Math.min(this.minR, r);
                this.maxR = Math.max(this.maxR, r);
                this.minG = Math.min(this.minG, g);
                this.maxG = Math.max(this.maxG, g);
                this.minB = Math.min(this.minB, b);
                this.maxB = Math.max(this.maxB, b);
            });
        }
        
        /**
         * Get the range of this color box
         */
        range() {
            const rRange = this.maxR - this.minR;
            const gRange = this.maxG - this.minG;
            const bRange = this.maxB - this.minB;
            return Math.max(rRange, gRange, bRange);
        }
        
        /**
         * Get the axis with largest range
         */
        getLongestAxis() {
            const rRange = this.maxR - this.minR;
            const gRange = this.maxG - this.minG;
            const bRange = this.maxB - this.minB;
            
            if (rRange >= gRange && rRange >= bRange) return 'r';
            if (gRange >= bRange) return 'g';
            return 'b';
        }
        
        /**
         * Split this box along its longest axis at the median
         */
        split() {
            const axis = this.getLongestAxis();
            
            // Sort pixels by the longest axis
            const sorted = [...this.pixels].sort((a, b) => {
                if (axis === 'r') return a[0] - b[0];
                if (axis === 'g') return a[1] - b[1];
                return a[2] - b[2];
            });
            
            // Split at median
            const median = Math.floor(sorted.length / 2);
            const box1 = new ColorBox(sorted.slice(0, median));
            const box2 = new ColorBox(sorted.slice(median));
            
            return [box1, box2];
        }
        
        /**
         * Get average color of pixels in this box
         */
        averageColor() {
            if (this.pixels.length === 0) return [128, 128, 128];
            
            let sumR = 0, sumG = 0, sumB = 0;
            this.pixels.forEach(pixel => {
                sumR += pixel[0];
                sumG += pixel[1];
                sumB += pixel[2];
            });
            
            const count = this.pixels.length;
            return [
                Math.round(sumR / count),
                Math.round(sumG / count),
                Math.round(sumB / count)
            ];
        }
}

export class ColorQuantizer {
    /**
     * Median Cut Algorithm
     * @param {Array<Array<number>>} pixels - Array of [r, g, b] pixel values
     * @param {number} maxColors - Maximum number of colors to extract
     * @returns {Array<Array<number>>} Array of [r, g, b] dominant colors
     */
    medianCut(pixels, maxColors) {
        if (pixels.length === 0) return [];
        if (maxColors <= 0) return [];
        
        // Start with all pixels in one box
        let boxes = [new ColorBox(pixels)];
        
        // Split boxes until we have maxColors boxes
        while (boxes.length < maxColors && boxes.length < pixels.length) {
            // Find box with largest range
            let boxToSplit = boxes[0];
            let maxRange = boxToSplit.range();
            
            for (let i = 1; i < boxes.length; i++) {
                const range = boxes[i].range();
                if (range > maxRange) {
                    maxRange = range;
                    boxToSplit = boxes[i];
                }
            }
            
            // Can't split if range is 0
            if (maxRange === 0) break;
            
            // Split the box
            const [box1, box2] = boxToSplit.split();
            
            // Replace with split boxes
            boxes = boxes.filter(b => b !== boxToSplit);
            boxes.push(box1, box2);
        }
        
        // Return average colors from each box
        return boxes.map(box => box.averageColor());
    }
    
    /**
     * Extract color palette from image data
     * @param {ImageData} imageData - Canvas ImageData object
     * @param {number} maxColors - Maximum number of colors to extract (default: 16)
     * @returns {Array<number>} Array of hex color values
     */
    extractPalette(imageData, maxColors = 16) {
        const pixels = [];
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        // Collect all non-transparent pixels
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = (y * width + x) * 4;
                const r = data[index];
                const g = data[index + 1];
                const b = data[index + 2];
                const a = data[index + 3];
                
                // Skip fully transparent pixels
                if (a > 0) {
                    pixels.push([r, g, b]);
                }
            }
        }
        
        if (pixels.length === 0) {
            return [];
        }
        
        // Apply median cut algorithm
        const dominantColors = this.medianCut(pixels, maxColors);
        
        // Convert to hex colors
        return dominantColors.map(([r, g, b]) => {
            return (r << 16) | (g << 8) | b;
        });
    }
    
    /**
     * Convert hex color to RGB array
     * @param {number} hex - Hex color value
     * @returns {Array<number>} [r, g, b]
     */
    hexToRgb(hex) {
        return [
            (hex >> 16) & 0xFF,
            (hex >> 8) & 0xFF,
            hex & 0xFF
        ];
    }
}

