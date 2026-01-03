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
        const halfWidth = Math.floor(this.width / 2);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < halfWidth; x++) {
                const leftPixel = this.getPixel(x, y);
                if (leftPixel && leftPixel[3] > 0) {
                    const rightX = this.width - 1 - x;
                    // Convert RGBA array to hex color
                    const color = (leftPixel[0] << 16) | (leftPixel[1] << 8) | leftPixel[2];
                    this.setPixel(rightX, y, color);
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
}

