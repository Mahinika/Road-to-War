shader_type canvas_item;

uniform vec4 outline_color : source_color = vec4(0.0, 0.0, 0.0, 1.0);
uniform float outline_width : hint_range(0.0, 10.0) = 1.0;

uniform vec4 flash_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float flash_strength : hint_range(0.0, 1.0) = 0.0;

uniform vec4 glow_color : source_color = vec4(1.0, 1.0, 1.0, 0.0);
uniform float glow_intensity : hint_range(0.0, 5.0) = 0.0;

uniform float cooldown_progress : hint_range(0.0, 1.0) = 0.0;
uniform bool radial_cooldown = true;

void fragment() {
    vec4 tex = texture(TEXTURE, UV);
    vec2 size = TEXTURE_PIXEL_SIZE * outline_width;
    
    // Outline logic
    float alpha = tex.a;
    alpha += texture(TEXTURE, UV + vec2(0.0, -size.y)).a;
    alpha += texture(TEXTURE, UV + vec2(0.0, size.y)).a;
    alpha += texture(TEXTURE, UV + vec2(-size.x, 0.0)).a;
    alpha += texture(TEXTURE, UV + vec2(size.x, 0.0)).a;
    
    vec4 final_color = tex;
    
    if (tex.a < 0.1 && alpha > 0.1) {
        final_color = outline_color;
    }
    
    // Hit flash
    final_color.rgb = mix(final_color.rgb, flash_color.rgb, flash_strength);
    
    // Glow
    final_color.rgb += glow_color.rgb * glow_intensity * tex.a;
    
    // Cooldown overlay
    if (cooldown_progress > 0.0) {
        bool in_cooldown = false;
        if (radial_cooldown) {
            vec2 rel = UV - vec2(0.5);
            float angle = (atan(rel.y, rel.x) + PI) / (2.0 * PI);
            if (angle > (1.0 - cooldown_progress)) {
                in_cooldown = true;
            }
        } else {
            if (UV.y > (1.0 - cooldown_progress)) {
                in_cooldown = true;
            }
        }
        
        if (in_cooldown) {
            final_color.rgb *= 0.3; // Darken
        }
    }
    
    COLOR = final_color;
}
