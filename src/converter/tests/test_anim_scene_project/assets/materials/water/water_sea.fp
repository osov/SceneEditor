// sea
varying vec2 vUv;

uniform sampler2D u_texture;
uniform sampler2D u_normal;
uniform float u_time;

float blend_cycle = 2.0;
float cycle_speed = 0.4;
float EDGE_BLEND = 0.03;

void main(void) {


	vec2 waveOffset = texture2D(u_normal, vUv * 1.0 + vec2(0., -u_time * 0.01)).rg;
	waveOffset = (waveOffset - 0.5) * 0.03 ;
	vec2 flow = vec2(0., -0.1);

	float half_cycle = blend_cycle * 0.5;
	float phase1 = mod( u_time * cycle_speed, blend_cycle);
	float phase2 = mod( u_time * cycle_speed + half_cycle, blend_cycle);
	float blend_factor = abs(half_cycle - phase1)/half_cycle;
	phase1 -= half_cycle;
	phase2 -= half_cycle;
	vec2 layer1 = flow * phase1 + vUv  + waveOffset;
	vec2 layer2 = flow * phase2 + vUv  + waveOffset;
	vec4 emission_tex = mix(texture2D(u_texture, layer1), texture2D(u_texture, layer2), blend_factor);


	vec2 edgeFactor = smoothstep(0.0, EDGE_BLEND, vUv) * (1.0 - smoothstep(1.0 - EDGE_BLEND, 1.0, vUv));
	float borderMask =  edgeFactor.y;

	vec4 staticColor = texture2D(u_texture, vUv + waveOffset * 0.5);
	float flowInfluence = smoothstep(0.01, 0.1, 0.5) * borderMask;
	emission_tex = mix(staticColor, emission_tex, flowInfluence);


    gl_FragColor = vec4(emission_tex);
}