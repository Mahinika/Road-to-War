/**
 * Spell Icon Generator
 * Generates spell/ability icons with keyword-driven motifs
 */

import { createCanvas } from 'canvas';
import { BaseGenerator } from './base-generator.js';
import { setupCanvasContext, drawIconPlate } from '../utils/canvas-utils.js';

// Spell type color cache
const SPELL_TYPE_COLORS = {
    'attack': { primary: '#FF4444', secondary: '#FF8888', accent: '#FFFFFF' },
    'heal': { primary: '#44FF44', secondary: '#88FF88', accent: '#FFFFFF' },
    'buff': { primary: '#4444FF', secondary: '#8888FF', accent: '#FFFFFF' },
    'debuff': { primary: '#FF44FF', secondary: '#FF88FF', accent: '#FFFFFF' },
    'aoe': { primary: '#FFAA44', secondary: '#FFCC88', accent: '#FFFFFF' },
    'dot': { primary: '#AA44FF', secondary: '#CC88FF', accent: '#FFFFFF' }
};

export class SpellIconGenerator extends BaseGenerator {
    constructor() {
        super();
    }

    /**
     * Generate spell icon
     * @param {Object} abilityData - Ability data
     * @param {string} abilityId - Ability identifier
     * @param {number} size - Icon size (default 48)
     * @returns {HTMLCanvasElement} Canvas with spell icon
     */
    generate(abilityData, abilityId, size = 48) {
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        setupCanvasContext(ctx, size);
        
        const type = abilityData.type || 'attack';
        const colors = SPELL_TYPE_COLORS[type] || SPELL_TYPE_COLORS.attack;
        
        // Background plate
        drawIconPlate(ctx, size, colors.primary);

        // Foreground glyph with keyword-driven motif
        const motif = this.pickSpellMotif(abilityId, abilityData);
        this.drawGlyph(ctx, size, motif, colors);
        
        return canvas;
    }

    /**
     * Pick spell motif based on ability ID and data
     * @private
     */
    pickSpellMotif(abilityId, abilityData) {
        const id = String(abilityId || '').toLowerCase();
        const name = String(abilityData?.name || '').toLowerCase();
        const hay = `${id} ${name}`;

        // Priority motifs (same logic as original)
        if (/(shield|barrier|block|ward|aegis)/.test(hay)) return 'shield';
        if (/(heal|renew|rejuvenation|regrowth|hymn|prayer|lay_on_hands|light)\b/.test(hay) || abilityData?.type === 'heal' || abilityData?.type === 'aoe_heal') return 'heal';
        if (/(moonkin_form|eclipse|starfall|starfire|moonfire)/.test(hay)) return 'moon';
        if (/(lightning|thunder|storm|chain_lightning)/.test(hay)) return 'lightning';
        if (/(fire|flame|pyro|combust|immolate|lava|inferno)/.test(hay)) return 'fire';
        if (/(frost|ice|cold|freeze|blizzard|icy|snow)/.test(hay)) return 'frost';
        if (/(shadow|curse|agony|corruption|drain|haunt|vamp|affliction)/.test(hay)) return 'shadow';
        if (/(backstab|stab|dagger|mutilate|eviscerate|envenom|sinister|shred|rip|rend|bleed)/.test(hay)) return 'dagger';
        if (/(shot|arrow|aimed|steady|explosive_shot|chimera|wyvern)/.test(hay)) return 'arrow';
        if (/(tree_of_life)/.test(hay)) return 'tree';
        if (/(bear_form|cat_form|metamorphosis)/.test(hay)) return 'form';
        if (/(totem|shamanistic)/.test(hay)) return 'totem';
        if (/(charge|kick|taunt|slam|strike|smite|judgment|crusader)/.test(hay)) return 'sword';

        // Fallback by type
        const t = abilityData?.type;
        if (t === 'buff') return 'shield';
        if (t === 'debuff' || t === 'dot') return 'shadow';
        if (t === 'aoe') return 'burst';
        return 'spark';
    }

    /**
     * Draw glyph for spell icon
     * @private
     */
    drawGlyph(ctx, size, motif, colors) {
        // This would contain the full drawGlyph implementation from generate-all-assets.js
        // For now, using a simplified version - full implementation would be extracted
        const cx = size / 2;
        const cy = size / 2;
        
        // Simplified glyph drawing - full version would have all motif cases
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 2);
        ctx.fill();
        
        // Full implementation would include all motif cases from the original drawGlyph function
        // This is a placeholder that would need to be expanded with the full drawing logic
    }
}
