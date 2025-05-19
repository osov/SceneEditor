// water
varying vec2 vUv;
varying vec3 vColor;

uniform sampler2D u_texture;
uniform sampler2D u_normal;
uniform sampler2D u_flowMap;
uniform float alpha;
uniform float u_time;

float blend_cycle = 3.0;
float cycle_speed = 0.9;
float flow_speed =  0.2;
float uv_scale = 1.;

void main(void) {

	float half_cycle = blend_cycle * 0.5;
	float phase1 = mod( u_time * cycle_speed, blend_cycle);
	float phase2 = mod( u_time * cycle_speed + half_cycle, blend_cycle);

	vec4 flow_tex = texture(u_flowMap, vUv);
	vec2 flow = (flow_tex.rg * 2.0 - 1.0);
	flow.x *= -1.;
	flow *= flow_speed * uv_scale;
	float flowStrength = flow_tex.b * 1.5;


	float blend_factor = abs(half_cycle - phase1)/half_cycle;
	phase1 -= half_cycle;
	phase2 -= half_cycle;


	vec2 waveOffset = texture2D(u_normal, vUv * 2.0 + vec2(u_time * 0.12)).rg;
	waveOffset = (waveOffset - 0.5) * 0.1 * flowStrength;

	vec2 layer1 = flow * phase1 + vUv + waveOffset;
	vec2 layer2 = flow * phase2 + vUv + waveOffset;
	vec3 emission_tex = mix(texture2D(u_texture, layer1), texture2D(u_texture, layer2), blend_factor).rgb;

	 float EDGE_BLEND = 0.15;
    vec2 edgeFactor = smoothstep(0.0, EDGE_BLEND, vUv) * (1.0 - smoothstep(1.0 - EDGE_BLEND, 1.0, vUv));
    float borderMask = edgeFactor.x * edgeFactor.y;

    vec3 staticColor = texture2D(u_texture, vUv + waveOffset).rgb;
    float flowInfluence = smoothstep(0.01, 0.1, flowStrength) * borderMask ;
     emission_tex = mix(staticColor, emission_tex, flowInfluence);


    gl_FragColor = vec4(emission_tex, 1.);
    //gl_FragColor = vec4(flow_tex);
}