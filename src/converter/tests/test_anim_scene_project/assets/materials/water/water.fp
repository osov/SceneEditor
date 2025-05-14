varying vec2 vUv;

uniform float u_time;

uniform sampler2D u_texture;
uniform sampler2D u_normal;
uniform sampler2D u_flowMap;

uniform float u_speed; // 0.4;
uniform float u_normal_scale; // 0.75;
uniform float u_normal_scale_2; // 0.1;
uniform float u_debug;
void main(void) {

	vec4 flowData = texture2D(u_flowMap, vUv);
	vec2 flowDir = flowData.xy * 2.0 - 1.0;
	flowDir.x *= -1.0;
	float flowVisible = flowData.z * u_normal_scale_2 * 2.;

	float flowStrength = length(flowDir);
	flowDir = normalize(flowDir) * (flowStrength * 0.3);

	float phase0 = fract(u_time * u_speed);
	float phase1 = fract(u_time * u_speed + 0.5);
	vec2 uv0 = vUv * u_normal_scale + flowDir * flowStrength * phase0;
	vec2 uv1 = vUv * u_normal_scale + flowDir * flowStrength * phase1;

	float blend = smoothstep(0.0, 1.0, abs(0.5 - phase0) * 2.0);
	vec2 w1 = texture2D(u_normal, uv0).rg - 0.5;
	vec2 w2 = texture2D(u_normal, uv1).rg - 0.5;

	vec2 finalOffset = mix(w1, w2, blend);

	vec2 distortedUv =  vUv + finalOffset * flowVisible;

	vec4 color = texture2D(u_texture, distortedUv);

	gl_FragColor = color;

	if (u_debug > 0.)
		gl_FragColor = mix(color, vec4(flowData.rgb, 1.), 0.5);
}