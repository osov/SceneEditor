varying vec2 vUv;
varying vec4 vUvData;
varying vec3 vColor; 

#ifdef USE_TEXTURE
uniform sampler2D u_texture;
#endif

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

uniform float alpha;

void main(void) {

#ifdef USE_SLICE
    vec2 newUV = vec2(
        processAxis(vUv.x, vSliceData.z, vSliceData.x),
        processAxis(vUv.y, vSliceData.w, vSliceData.y)
    );
#else
    vec2 newUV = vUv;
#endif

    newUV = vUvData.xy + newUV * vUvData.zw;

#ifdef USE_TEXTURE
    vec4 color = texture2D(u_texture, newUV);
    //  if (color.a < 0.5) discard;
    gl_FragColor = color * vec4(vColor, alpha);
#else
    gl_FragColor = vec4(vColor, alpha);
#endif
}