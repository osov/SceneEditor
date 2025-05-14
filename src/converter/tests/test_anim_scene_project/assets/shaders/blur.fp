varying vec2 vUv;
varying vec4 vUvData;
varying vec3 vColor;

#ifdef USE_SLICE
varying vec4 vSliceData;

float map(float value, float originalMin, float originalMax, float newMin, float newMax) {
    return (value - originalMin) / (originalMax - originalMin) * (newMax - newMin) + newMin;
}

float processAxis(float coord, float texBorder, float winBorder) {
    return (coord < winBorder) ? map(coord, 0.0, winBorder, 0.0, texBorder) :
        (coord > (1.0 - winBorder)) ? map(coord, 1.0 - winBorder, 1.0, 1.0 - texBorder, 1.0) :
        map(coord, winBorder, 1.0 - winBorder, texBorder, 1.0 - texBorder);
}
#endif

uniform sampler2D u_texture;
uniform float blurAmount;
uniform float alpha;
uniform vec2 blurOffset;  // New uniform for blur offset

void main() {
#ifdef USE_SLICE
    vec2 newUV = vec2(
        processAxis(vUv.x, vSliceData.z, vSliceData.x),
        processAxis(vUv.y, vSliceData.w, vSliceData.y)
    );
#else
    vec2 newUV = vUv;
#endif

    newUV = vUvData.xy + newUV * vUvData.zw;
    
    // Calculate blur offsets
    float dx = blurAmount / 512.0;
    float dy = blurAmount / 512.0;
    
    // Sample 9 points for blur
    vec4 color = vec4(0.0);
    
    // Center (weight: 4/16)
    color += texture2D(u_texture, newUV) * 0.25;
    
    // Cardinal directions (weight: 2/16 each)
    color += texture2D(u_texture, newUV + vec2(dx, 0.0)) * 0.125;
    color += texture2D(u_texture, newUV + vec2(-dx, 0.0)) * 0.125;
    color += texture2D(u_texture, newUV + vec2(0.0, dy)) * 0.125;
    color += texture2D(u_texture, newUV + vec2(0.0, -dy)) * 0.125;
    
    // Diagonal directions (weight: 1/16 each)
    color += texture2D(u_texture, newUV + vec2(dx, dy)) * 0.0625;
    color += texture2D(u_texture, newUV + vec2(-dx, dy)) * 0.0625;
    color += texture2D(u_texture, newUV + vec2(dx, -dy)) * 0.0625;
    color += texture2D(u_texture, newUV + vec2(-dx, -dy)) * 0.0625;
    
    gl_FragColor = color * vec4(vColor, alpha);
}
