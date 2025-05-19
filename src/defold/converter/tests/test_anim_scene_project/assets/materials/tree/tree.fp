varying vec2 vUv;
uniform sampler2D u_texture;
//uniform float u_time;

void main() {
	//float strength = smoothstep(0.0, 1.0, vUv.y);
	//float wave = sin((vUv.y + u_time * 0.5) * 3.0) * 0.03 * strength;
	//vec2 offsetUv = vUv + vec2(wave, 0.0);
	vec4 color = texture2D(u_texture, vUv);

	gl_FragColor = color;
}
