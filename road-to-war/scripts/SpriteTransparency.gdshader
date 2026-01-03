shader_type canvas_item;

void fragment() {
    vec4 color = texture(TEXTURE, UV);
    // If the color is black (or very close to it), make it transparent
    // Using a small epsilon to catch near-black pixels
    if (length(color.rgb) < 0.1) {
        color.a = 0.0;
    }
    COLOR = color;
}

