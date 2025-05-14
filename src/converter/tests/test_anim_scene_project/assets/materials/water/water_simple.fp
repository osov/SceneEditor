varying vec2 vUv;
uniform float u_time;

uniform sampler2D u_texture;
uniform sampler2D u_normal;

uniform float u_speed; // 0.4;
uniform float u_normal_scale; // 0.75;
uniform float u_normal_scale_2; // 0.1;
uniform float u_angle;

uniform float u_fade_edge_x;
uniform float u_fade_edge_y;
uniform float u_fade_offset_x;
uniform float u_fade_offset_y;
uniform float u_debug;
void main(void) {

	float angle = radians(u_angle);
	vec2 flowDir = vec2(cos(angle), sin(angle)) * 0.3;

	float fadeX = smoothstep(u_fade_offset_x - u_fade_edge_x, u_fade_offset_x, vUv.x) * smoothstep(u_fade_offset_x + u_fade_edge_x, u_fade_offset_x, vUv.x);
	float fadeY = smoothstep(u_fade_offset_y - u_fade_edge_y, u_fade_offset_y, vUv.y) * smoothstep(u_fade_offset_y + u_fade_edge_y, u_fade_offset_y, vUv.y);
	float edgeFade = pow(fadeX * fadeY, 0.1);

	float phase0 = fract(u_time * u_speed);
	float phase1 = fract(u_time * u_speed + 0.5);
	vec2 uv0 = vUv * u_normal_scale + flowDir * phase0;
	vec2 uv1 = vUv * u_normal_scale + flowDir * phase1;

	float blend = smoothstep(0.0, 1.0, abs(0.5 - phase0) * 2.0);
	vec2 w1 = texture2D(u_normal, uv0).rg - 0.5;
	vec2 w2 = texture2D(u_normal, uv1).rg - 0.5;

	vec2 finalOffset = mix(w1, w2, blend);

	vec2 distortedUv =  vUv + finalOffset * u_normal_scale_2 * edgeFade;

	vec4 color = texture2D(u_texture, distortedUv);

	gl_FragColor = color;
	if (u_debug > 0.)
		gl_FragColor = mix(color, vec4(edgeFade, 0., 0., 1.), 0.5);
}