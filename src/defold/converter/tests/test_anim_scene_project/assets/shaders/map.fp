uniform sampler2D u_mask;
uniform sampler2D tex1;
uniform sampler2D tex2;
uniform sampler2D tex3;

varying vec4 var_boo;
varying vec4 var_uv0;
varying vec4 var_uv1;
varying vec4 var_uv2;
varying vec4 var_uv3;
varying vec4 var_repeat;
varying vec2 vUv;

vec2 var_rotated = vec2(1., 0.);

float sum( vec3 v ) { return v.x+v.y+v.z; }
vec3 textureNoTile( sampler2D samp, in vec2 uv )
{
	vec2 x = uv;
	float k = texture2D( samp, 0.005*x ).x;

	float index = k*8.0;
	float i = floor( index );
	float f = fract( index );

	vec2 offa = sin(vec2(3.0,7.0)*(i+0.0));
	vec2 offb = sin(vec2(3.0,7.0)*(i+1.0));

	vec3 cola = texture2D( samp, x + offa ).rgb;
	vec3 colb = texture2D( samp, x + offb ).rgb;

	return mix( cola, colb, smoothstep(0.2,0.8,f-0.1*sum(cola-colb)) );
}

void main() {

	float u0 = var_boo.z;
	float v0 = var_boo.w;
	vec2 uv0 = vec2(
		mix(var_uv0.x,  var_uv0.z,       u0 * var_rotated.x  + v0 * var_rotated.y),
		mix(var_uv0.y,  var_uv0.w, 1. - (u0 * var_rotated.y  + v0 * var_rotated.x))
	);


	float u1 = var_boo.x * var_repeat.x - floor(var_boo.x * var_repeat.x);
	float v1 = var_boo.y * var_repeat.x - floor(var_boo.y * var_repeat.x);
	vec2 uv1 = vec2(
		mix(var_uv1.x,  var_uv1.z,       u1 * var_rotated.x  + v1 * var_rotated.y),
		mix(var_uv1.y,  var_uv1.w, 1. - (u1 * var_rotated.y  + v1 * var_rotated.x))
	);

	float u2 = var_boo.x * var_repeat.y - floor(var_boo.x * var_repeat.y);
	float v2 = var_boo.y * var_repeat.y - floor(var_boo.y * var_repeat.y);
	vec2 uv2 = vec2(
		mix(var_uv2.x,  var_uv2.z,       u2 * var_rotated.x  + v2 * var_rotated.y),
		mix(var_uv2.y,  var_uv2.w, 1. - (u2 * var_rotated.y  + v2 * var_rotated.x))
	);

	float u3 = var_boo.x * var_repeat.z - floor(var_boo.x * var_repeat.z);
	float v3 = var_boo.y * var_repeat.z - floor(var_boo.y * var_repeat.z);
	vec2 uv3 = vec2(
		mix(var_uv3.x,  var_uv3.z,       u3 * var_rotated.x  + v3 * var_rotated.y),
		mix(var_uv3.y,  var_uv3.w, 1. - (u3 * var_rotated.y  + v3 * var_rotated.x))
	);


	vec4 mask  = texture2D(u_mask, uv0);
	vec4 color1 = texture2D(tex1, uv1 );
	vec4 color2 = texture2D( tex2, uv2 );
	vec4 color3 = texture2D( tex3, uv3 );

	//color1 = vec4(textureNoTile( tex1, uv1 ), 1.);
	//color2 = vec4(textureNoTile( tex2, uv2 ), 1.);
	//color3 = vec4(textureNoTile( tex3, uv3 ), 1.);

	vec4 tex  =  color1 * mask.r + color2 * mask.g + color3 * mask.b;
	tex.r = clamp(tex.r, 0., 1.);
	tex.g = clamp(tex.g, 0., 1.);
	tex.b = clamp(tex.b, 0., 1.);
	gl_FragColor = vec4(tex.rgb, 1.);
	//gl_FragColor = vec4(var_boo.xy,0.,1.);
}
