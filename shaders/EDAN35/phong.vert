#version 410

layout (location = 0) in vec3 vertex;
layout (location = 1) in vec3 normal;
layout (location = 2) in vec2 texcoords;
layout (location = 3) in vec3 tangent;
layout (location = 4) in vec3 binormal;

uniform mat4 vertex_model_to_world;
uniform mat4 normal_model_to_world;
uniform mat4 vertex_world_to_clip;

out VS_OUT {
	vec3 frag_pos;
	vec2 texcoords;
	mat3 TBN;
	vec3 N;
} vs_out;


void main()
{
	vec3 T = normalize(vec3(normal_model_to_world * vec4(tangent, 0.0)));
	vec3 B = normalize(vec3(normal_model_to_world * vec4(binormal, 0.0)));
	vec3 N = normalize(vec3(normal_model_to_world * vec4(normal, 0.0)));

	vs_out.TBN = mat3(T, B, N);
	vs_out.texcoords = texcoords;
	vs_out.frag_pos = vec3(vertex_model_to_world * vec4(vertex, 1.0));
	vs_out.N = N;


	gl_Position = vertex_world_to_clip * vertex_model_to_world * vec4(vertex, 1.0);
}

