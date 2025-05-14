//lut_normal
//lut_normal lut_24'00 lut_sunny_day lut_18 lut_normal_far_swamp lut_tavern_event_singer lut_Terma

#define MAXCOLOR 31.0
#define COLORS 32.0
#define WIDTH 1024.0
#define HEIGHT 32.0

uniform sampler2D tScene;
uniform sampler2D tLUT;    // LUT текстура (1024x32)
uniform sampler2D tLight;
uniform float lightIntensity;
uniform vec2 resolution;

varying vec2 vUv;


void main() {
	vec4 sceneColor = texture2D(tScene, vUv);
	vec4 lightColor = texture2D(tLight, vUv) * lightIntensity;

//--------LUT-------
	vec4 px = sceneColor;
	float cell = px.b * MAXCOLOR;
	float cell_l = floor(cell); // <1>
	float cell_h = ceil(cell);
	float half_px_x = 0.5 / WIDTH;
	float half_px_y = 0.5 / HEIGHT;
	float r_offset = half_px_x + px.r / COLORS * (MAXCOLOR / COLORS);
	float g_offset = half_px_y + px.g * (MAXCOLOR / COLORS);
	vec2 lut_pos_l = vec2(cell_l / COLORS + r_offset, g_offset);
	vec2 lut_pos_h = vec2(cell_h / COLORS + r_offset, g_offset);
	vec4 graded_color_l = texture2D(tLUT, lut_pos_l);
	vec4 graded_color_h = texture2D(tLUT, lut_pos_h);
	sceneColor = mix(graded_color_l, graded_color_h, fract(cell));
//---------------

	float distFactor = smoothstep(0.8, 0.3, length(lightColor.rgb));
	lightColor.rgb *= mix(2.0, 0.8, distFactor); // Чем дальше - тем мягче свет

	gl_FragColor = sceneColor * (lightColor + vec4(141./255., 195./255., 252./255., 0.) * 0.3);
	//gl_FragColor = sceneColor * vec4(141./255., 195./255., 252./255., 0.) * 0.5;
	gl_FragColor = sceneColor;
}

