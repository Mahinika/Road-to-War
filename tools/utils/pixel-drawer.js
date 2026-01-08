/**
 * Pixel Drawer Utility
 * Low-level pixel manipulation for pixel-art style drawing
 */

export class PixelDrawer {
    constructor(ctx, width, height) {
        this.ctx = ctx;
        this.width = width;
        this.height = height;
        this.imageData = ctx.createImageData(width, height);
    }

    /**
     * Convert hex color to RGB array
     * @param {string|number} color - Hex color (e.g., '#FF0000' or 0xFF0000)
     * @returns {Array<number>} [r, g, b, a]
     */
    hexToRgba(color) {
        let hex;
        if (typeof color === 'string') {
            hex = parseInt(color.replace('#', ''), 16);
        } else {
            hex = color;
        }
        return [
            (hex >> 16) & 0xFF,
            (hex >> 8) & 0xFF,
            hex & 0xFF,
            255
        ];
    }

    /**
     * Set a single pixel
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string|number} color - Hex color
     */
    setPixel(x, y, color) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        
        const [r, g, b, a] = this.hexToRgba(color);
        const index = (y * this.width + x) * 4;
        this.imageData.data[index] = r;
        this.imageData.data[index + 1] = g;
        this.imageData.data[index + 2] = b;
        this.imageData.data[index + 3] = a;
    }

    /**
     * Get pixel color at position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Array<number>} [r, g, b, a] or null if out of bounds
     */
    getPixel(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
        const index = (y * this.width + x) * 4;
        return [
            this.imageData.data[index],
            this.imageData.data[index + 1],
            this.imageData.data[index + 2],
            this.imageData.data[index + 3]
        ];
    }

    /**
     * Draw a filled rectangle
     * @param {number} x - X coordinate (top-left)
     * @param {number} y - Y coordinate (top-left)
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {string|number} color - Hex color
     */
    drawRect(x, y, width, height, color) {
        for (let py = y; py < y + height; py++) {
            for (let px = x; px < x + width; px++) {
                this.setPixel(px, py, color);
            }
        }
    }

    /**
     * Draw a rectangle outline
     * @param {number} x - X coordinate (top-left)
     * @param {number} y - Y coordinate (top-left)
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {string|number} color - Hex color
     */
    drawRectOutline(x, y, width, height, color) {
        // Top and bottom
        for (let px = x; px < x + width; px++) {
            this.setPixel(px, y, color);
            this.setPixel(px, y + height - 1, color);
        }
        // Left and right
        for (let py = y; py < y + height; py++) {
            this.setPixel(x, py, color);
            this.setPixel(x + width - 1, py, color);
        }
    }

    /**
     * Draw a filled circle using midpoint algorithm
     * @param {number} centerX - Center X
     * @param {number} centerY - Center Y
     * @param {number} radius - Radius
     * @param {string|number} color - Hex color
     */
    drawCircle(centerX, centerY, radius, color) {
        const r2 = radius * radius;
        for (let y = -radius; y <= radius; y++) {
            for (let x = -radius; x <= radius; x++) {
                if (x * x + y * y <= r2) {
                    this.setPixel(centerX + x, centerY + y, color);
                }
            }
        }
    }

    /**
     * Draw a line using Bresenham's algorithm
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {string|number} color - Hex color
     */
    drawLine(x1, y1, x2, y2, color) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;

        let x = x1;
        let y = y1;

        while (true) {
            this.setPixel(x, y, color);
            if (x === x2 && y === y2) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
    }

    /**
     * Mirror pixels horizontally (for symmetry)
     * @param {number} centerX - Center X coordinate for mirroring
     */
    mirrorHorizontal(centerX) {
        // Use centerX as the pivot point
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < centerX; x++) {
                const leftPixel = this.getPixel(x, y);
                if (leftPixel && leftPixel[3] > 0) {
                    const relativeX = centerX - x;
                    const rightX = centerX + relativeX;
                    
                    if (rightX < this.width) {
                        // Convert RGBA array to hex color
                        const color = (leftPixel[0] << 16) | (leftPixel[1] << 8) | leftPixel[2];
                        this.setPixel(rightX, y, color);
                    }
                }
            }
        }
    }

    /**
     * Apply dithering pattern for gradients
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string|number} color1 - First color
     * @param {string|number} color2 - Second color
     * @returns {string|number} Selected color based on dither pattern
     */
    dither(x, y, color1, color2) {
        return ((x + y) % 2 === 0) ? color1 : color2;
    }

    /**
     * Draw outline around existing pixels
     * @param {string|number} outlineColor - Outline color
     * @param {number} thickness - Outline thickness (default 1)
     */
    drawOutline(outlineColor, thickness = 1) {
        const outline = [];
        // For thickness > 1, we need to draw multiple layers
        for (let layer = 0; layer < thickness; layer++) {
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const pixel = this.getPixel(x, y);
                    if (pixel && pixel[3] > 0) {
                        // Check neighbors at increasing distances for thicker outlines
                        const checkDistance = layer + 1;
                        const neighbors = [
                            this.getPixel(x - checkDistance, y),
                            this.getPixel(x + checkDistance, y),
                            this.getPixel(x, y - checkDistance),
                            this.getPixel(x, y + checkDistance),
                            // Diagonal neighbors for smoother outlines
                            this.getPixel(x - checkDistance, y - checkDistance),
                            this.getPixel(x + checkDistance, y - checkDistance),
                            this.getPixel(x - checkDistance, y + checkDistance),
                            this.getPixel(x + checkDistance, y + checkDistance)
                        ];
                        const hasTransparentNeighbor = neighbors.some(n => !n || n[3] === 0);
                        if (hasTransparentNeighbor) {
                            outline.push({ x, y });
                        }
                    }
                }
            }
        }
        outline.forEach(({ x, y }) => {
            this.setPixel(x, y, outlineColor);
        });
    }

    /**
     * Draw selective outline (2-3px for main forms, 1px for details)
     * @param {Object} config - Configuration object
     * @param {string|number} config.outerColor - Outline color for main forms (default: 0x000000)
     * @param {number} config.outerThickness - Thickness for main forms (default: 2)
     * @param {string|number} config.innerColor - Outline color for details (default: 0x000000)
     * @param {number} config.innerThickness - Thickness for details (default: 1)
     * @param {number} config.regionThreshold - Minimum pixel count to be considered main form (default: 50)
     */
    drawSelectiveOutline(config = {}) {
        const {
            outerColor = 0x000000,
            outerThickness = 2,
            innerColor = 0x000000,
            innerThickness = 1,
            regionThreshold = 50
        } = config;

        // First, detect connected regions
        const regions = this.detectRegions();
        
        // Classify regions as main forms or details
        const mainForms = [];
        const details = [];
        
        for (const region of regions) {
            if (region.pixels.length >= regionThreshold) {
                mainForms.push(region);
            } else {
                details.push(region);
            }
        }

        // Draw outlines for main forms (thicker)
        for (const region of mainForms) {
            this.drawRegionOutline(region, outerColor, outerThickness);
        }

        // Draw outlines for details (thinner)
        for (const region of details) {
            this.drawRegionOutline(region, innerColor, innerThickness);
        }
    }

    /**
     * Detect connected regions in the image
     * @private
     * @returns {Array<Object>} Array of region objects with pixel arrays
     */
    detectRegions() {
        const visited = new Set();
        const regions = [];
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const key = `${x},${y}`;
                if (visited.has(key)) continue;
                
                const pixel = this.getPixel(x, y);
                if (!pixel || pixel[3] === 0) continue;
                
                // Flood fill to find connected region
                const region = this.floodFill(x, y, visited);
                if (region.pixels.length > 0) {
                    regions.push(region);
                }
            }
        }
        
        return regions;
    }

    /**
     * Flood fill to find connected pixels
     * @private
     * @param {number} startX - Start X
     * @param {number} startY - Start Y
     * @param {Set} visited - Set of visited coordinates
     * @returns {Object} Region object with pixels array
     */
    floodFill(startX, startY, visited) {
        const pixels = [];
        const stack = [{ x: startX, y: startY }];
        const startPixel = this.getPixel(startX, startY);
        if (!startPixel || startPixel[3] === 0) return { pixels: [] };
        
        while (stack.length > 0) {
            const { x, y } = stack.pop();
            const key = `${x},${y}`;
            
            if (visited.has(key)) continue;
            if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
            
            const pixel = this.getPixel(x, y);
            if (!pixel || pixel[3] === 0) continue;
            
            // Check if pixel matches start pixel (same color)
            const matches = pixel[0] === startPixel[0] && 
                          pixel[1] === startPixel[1] && 
                          pixel[2] === startPixel[2];
            
            if (!matches) continue;
            
            visited.add(key);
            pixels.push({ x, y });
            
            // Add neighbors to stack
            stack.push({ x: x + 1, y });
            stack.push({ x: x - 1, y });
            stack.push({ x, y: y + 1 });
            stack.push({ x, y: y - 1 });
        }
        
        return { pixels };
    }

    /**
     * Draw outline around a specific region
     * @private
     * @param {Object} region - Region object with pixels array
     * @param {string|number} color - Outline color
     * @param {number} thickness - Outline thickness
     */
    drawRegionOutline(region, color, thickness) {
        const outlinePixels = new Set();
        
        for (const { x, y } of region.pixels) {
            // Check all neighbors at increasing distances
            for (let layer = 0; layer < thickness; layer++) {
                const checkDistance = layer + 1;
                const neighbors = [
                    { x: x - checkDistance, y },
                    { x: x + checkDistance, y },
                    { x, y: y - checkDistance },
                    { x, y: y + checkDistance },
                    { x: x - checkDistance, y: y - checkDistance },
                    { x: x + checkDistance, y: y - checkDistance },
                    { x: x - checkDistance, y: y + checkDistance },
                    { x: x + checkDistance, y: y + checkDistance }
                ];
                
                for (const neighbor of neighbors) {
                    const neighborPixel = this.getPixel(neighbor.x, neighbor.y);
                    const isTransparent = !neighborPixel || neighborPixel[3] === 0;
                    
                    // Check if this neighbor is not part of the same region
                    const isInRegion = region.pixels.some(p => p.x === neighbor.x && p.y === neighbor.y);
                    
                    if (isTransparent || !isInRegion) {
                        const key = `${neighbor.x},${neighbor.y}`;
                        outlinePixels.add(key);
                    }
                }
            }
        }
        
        // Draw outline pixels
        for (const key of outlinePixels) {
            const [x, y] = key.split(',').map(Number);
            this.setPixel(x, y, color);
        }
    }

    /**
     * Apply the image data to the canvas context
     */
    apply() {
        this.ctx.putImageData(this.imageData, 0, 0);
    }

    /**
     * Clear the canvas
     * @param {string|number} color - Background color (default transparent)
     */
    clear(color = 0x00000000) {
        const [r, g, b, a] = this.hexToRgba(color);
        for (let i = 0; i < this.imageData.data.length; i += 4) {
            this.imageData.data[i] = r;
            this.imageData.data[i + 1] = g;
            this.imageData.data[i + 2] = b;
            this.imageData.data[i + 3] = a;
        }
    }

    /**
     * Draw a rectangle with gradient shading
     * @param {number} x - X coordinate (top-left)
     * @param {number} y - Y coordinate (top-left)
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {string|number} startColor - Starting color (top-left)
     * @param {string|number} endColor - Ending color (bottom-right)
     * @param {string} direction - 'horizontal', 'vertical', 'diagonal' (default: 'diagonal')
     */
    drawGradientRect(x, y, width, height, startColor, endColor, direction = 'diagonal') {
        const [sr, sg, sb] = this.hexToRgba(startColor);
        const [er, eg, eb] = this.hexToRgba(endColor);

        for (let py = y; py < y + height; py++) {
            for (let px = x; px < x + width; px++) {
                let t;
                
                if (direction === 'horizontal') {
                    t = (px - x) / width;
                } else if (direction === 'vertical') {
                    t = (py - y) / height;
                } else { // diagonal
                    const dx = (px - x) / width;
                    const dy = (py - y) / height;
                    t = (dx + dy) / 2;
                }

                const r = Math.round(sr + (er - sr) * t);
                const g = Math.round(sg + (eg - sg) * t);
                const b = Math.round(sb + (eb - sb) * t);
                const color = (r << 16) | (g << 8) | b;
                
                this.setPixel(px, py, color);
            }
        }
    }

    /**
     * Draw a filled polygon using scanline algorithm
     * @param {Array<{x: number, y: number}>} points - Array of polygon vertices
     * @param {string|number} color - Fill color
     */
    drawPolygon(points, color) {
        if (points.length < 3) return;

        // Find bounding box
        let minY = points[0].y;
        let maxY = points[0].y;
        for (const p of points) {
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        }

        // Build edge table
        const edges = [];
        for (let i = 0; i < points.length; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % points.length];
            
            if (p1.y !== p2.y) {
                const yMin = Math.min(p1.y, p2.y);
                const yMax = Math.max(p1.y, p2.y);
                const xMin = p1.y < p2.y ? p1.x : p2.x;
                const dx = (p2.x - p1.x) / (p2.y - p1.y);
                
                edges.push({
                    yMin,
                    yMax,
                    x: xMin,
                    dx
                });
            }
        }

        // Sort edges by yMin
        edges.sort((a, b) => a.yMin - b.yMin);

        // Scanline fill
        const activeEdges = [];
        let edgeIndex = 0;

        for (let y = minY; y <= maxY; y++) {
            // Add edges that start at this y
            while (edgeIndex < edges.length && edges[edgeIndex].yMin === y) {
                activeEdges.push(edges[edgeIndex]);
                edgeIndex++;
            }

            // Remove edges that end at this y
            for (let i = activeEdges.length - 1; i >= 0; i--) {
                if (activeEdges[i].yMax <= y) {
                    activeEdges.splice(i, 1);
                }
            }

            // Update x coordinates
            for (const edge of activeEdges) {
                edge.x += edge.dx;
            }

            // Sort active edges by x
            activeEdges.sort((a, b) => a.x - b.x);

            // Fill between pairs of edges
            for (let i = 0; i < activeEdges.length - 1; i += 2) {
                const xStart = Math.floor(activeEdges[i].x);
                const xEnd = Math.floor(activeEdges[i + 1].x);
                for (let x = xStart; x <= xEnd; x++) {
                    this.setPixel(x, y, color);
                }
            }
        }
    }

    /**
     * Draw a smooth curve using Catmull-Rom spline
     * @param {Array<{x: number, y: number}>} points - Control points
     * @param {string|number} color - Line color
     * @param {number} tension - Tension parameter (0-1, default: 0.5)
     * @param {number} segments - Number of segments per curve (default: 20)
     */
    drawCurve(points, color, tension = 0.5, segments = 20) {
        if (points.length < 2) return;

        for (let i = 0; i < points.length - 1; i++) {
            const p0 = i > 0 ? points[i - 1] : points[i];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = i < points.length - 2 ? points[i + 2] : points[i + 1];

            for (let j = 0; j <= segments; j++) {
                const t = j / segments;
                const point = this.catmullRom(p0, p1, p2, p3, t, tension);
                this.setPixel(Math.round(point.x), Math.round(point.y), color);
            }
        }
    }

    /**
     * Catmull-Rom spline interpolation
     * @private
     */
    catmullRom(p0, p1, p2, p3, t, tension) {
        const t2 = t * t;
        const t3 = t2 * t;

        const x = 0.5 * (
            (2 * p1.x) +
            (-p0.x + p2.x) * t +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        ) * tension + (1 - tension) * (p1.x + (p2.x - p1.x) * t);

        const y = 0.5 * (
            (2 * p1.y) +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        ) * tension + (1 - tension) * (p1.y + (p2.y - p1.y) * t);

        return { x, y };
    }

    /**
     * Draw a cubic Bezier curve
     * @param {{x: number, y: number}} p0 - Start point
     * @param {{x: number, y: number}} p1 - First control point
     * @param {{x: number, y: number}} p2 - Second control point
     * @param {{x: number, y: number}} p3 - End point
     * @param {string|number} color - Line color
     * @param {number} segments - Number of segments (default: 20)
     */
    drawBezier(p0, p1, p2, p3, color, segments = 20) {
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = this.bezierPoint(p0, p1, p2, p3, t);
            this.setPixel(Math.round(point.x), Math.round(point.y), color);
        }
    }

    /**
     * Calculate point on Bezier curve
     * @private
     */
    bezierPoint(p0, p1, p2, p3, t) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;

        return {
            x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
            y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
        };
    }
}

