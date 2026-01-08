shader_type canvas_item;

uniform vec4 overlay_color : source_color = vec4(1.0, 0.0, 0.0, 1.0);  // Default red for rage
uniform float overlay_intensity : hint_range(0.0, 1.0) = 0.0;
uniform float glow_intensity : hint_range(0.0, 2.0) = 0.0;

uniform vec4 outline_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform float outline_width : hint_range(0.0, 5.0) = 0.0;

float get_processed_alpha(sampler2D tex, vec2 uv) {
    vec4 color = texture(tex, uv);
    if (length(color.rgb) < 0.1) {
        return 0.0;
    }
    return color.a;
}

void fragment() {
    vec2 size = TEXTURE_PIXEL_SIZE * outline_width;
    vec4 color = texture(TEXTURE, UV);
    
    // Original transparency logic: If the color is black, make it transparent
    if (length(color.rgb) < 0.1) {
        color.a = 0.0;
    }
    
    bool is_outline = false;
    if (outline_width > 0.0 && color.a < 0.1) {
        float a = 0.0;
        a += get_processed_alpha(TEXTURE, UV + vec2(0.0, -size.y));
        a += get_processed_alpha(TEXTURE, UV + vec2(size.x, 0.0));
        a += get_processed_alpha(TEXTURE, UV + vec2(0.0, size.y));
        a += get_processed_alpha(TEXTURE, UV + vec2(-size.x, 0.0));
        
        if (a > 0.01) {
            color = outline_color;
            is_outline = true;
        }
    }
    
    // Apply overlay color (Rage Mode etc.) to non-outline pixels
    if (color.a > 0.01 && !is_outline) {
        vec3 final_rgb = mix(color.rgb, overlay_color.rgb, overlay_intensity);
        
        // Apply glow if intensity > 0
        final_rgb += overlay_color.rgb * glow_intensity * color.a;
        
        color.rgb = final_rgb;
    }
    
    COLOR = color;
}
