#version 410

out vec4 frag_color;
uniform sampler2D opacity_map;

uniform vec3 camera_position;
uniform vec3 light_position;
uniform mat4 normal_model_to_world;

in VS_OUT {
    vec3 frag_pos;
    vec2 texcoords;
    mat3 TBN;
}
fs_in;

void main() {
	float decay = 0.96815;
    float exposure = 0.2;
    float density = 0.926;
    float weight = 0.58767;
    int num_samples = 100;

    vec3 fragColor = vec3(0.0, 0.0, 0.0);
	vec2 delta_texcoords = vec2( fs_in.texcoords - light_position.xy );
	vec2 texcoords_step = fs_in.texcoords;

	delta_texcoords *= (1.0 /  float(num_samples)) * density;
	float illuminationDecay = 1.0;
	for(int i=0; i < 100 ; i++){
		texcoords_step -= delta_texcoords;
		vec3 samp = vec3(1.0, 1.0, 1.0) - texture2D(opacity_map, texcoords_step).xyz;
		samp *= illuminationDecay * weight;
		fragColor += samp;
		illuminationDecay *= decay;
	}

	fragColor *= exposure;

    frag_color.xyz *= fragColor;
}
