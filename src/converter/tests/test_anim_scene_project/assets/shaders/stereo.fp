// 15
#include <packing>
varying vec2 vUv;
uniform sampler2D tDepth;
uniform float cameraNear;
uniform float cameraFar;
uniform vec2 resolution;
uniform float u_time;
uniform sampler2D tRepeat;

const float pixelRepeat = 90.0;
const float depthScale = 80.0;
const float mix_level = 0.88;
const float is_inverse = 0.;

float readDepth(vec2 coord) {
	float fragCoordZ = texture2D(tDepth, coord).x;
	float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
	return viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
}

float random(vec2 p) {
	return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float mix_value(float a, float b, float t) {
	return a * (1.0 - t) + b * t;
}

float fractalNoise(vec2 p) {
	const int octaves = 5;
	const float persistence = 0.1;
	float value = 0.0;
	float amplitude = 1.0;
	float frequency = 1.0;
	for (int i = 0; i < octaves; i++) {
		value += random(p * frequency) * amplitude;
		frequency *= 2.0;
		amplitude *= persistence;
	}
	return value;
}



void main() {
	vec2 uv = gl_FragCoord.xy;

	vec2 vIntPixel = uv;
	vIntPixel = floor(uv + 0.5); // Подсчёт пикселей

	for (int i = 0; i <= 30; i++) {
		float d = readDepth((vIntPixel - vec2(pixelRepeat * 0.5, pixelRepeat * 0.)) / resolution);
		if (is_inverse > 0.)
			d = 1. - d;
		float offset = -pixelRepeat;
		offset -= d * depthScale;
		vIntPixel.x += offset;
		vIntPixel.x = floor(vIntPixel.x + 0.5);
		if (vIntPixel.x < 0.0) break;
	}

	vIntPixel.x = mod(vIntPixel.x, pixelRepeat);
	vec2 vvUV = (vIntPixel  ) / pixelRepeat;

	vec2 noiseUV = vvUV + u_time * 0.000005;
	float n = fractalNoise(noiseUV * 1.);
	vec3 color = vec3(n);
	vec3 rgb = texture( tRepeat, fract(vvUV) ).rgb;
	vec3 m = mix(color, rgb, mix_level);
	gl_FragColor = vec4(m, 1.0);
}
