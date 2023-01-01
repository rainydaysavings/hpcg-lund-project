#version 410

out vec4 frag_color;

uniform sampler2D test_height_map;
uniform sampler2D test_color_map;
uniform sampler2D test_normal_map;

uniform sampler2D back_wall_color;
uniform sampler2D left_wall_color;
uniform sampler2D right_wall_color;
uniform sampler2D floor_wall_color;
uniform sampler2D ceil_wall_color;

uniform sampler2D back_wall_height;
uniform sampler2D left_wall_height;
uniform sampler2D right_wall_height;
//uniform sampler2D floor_wall_height;
uniform sampler2D ceil_wall_height;

uniform sampler2D back_wall_normal;
uniform sampler2D left_wall_normal;
uniform sampler2D right_wall_normal;
uniform sampler2D floor_wall_normal;
uniform sampler2D ceil_wall_normal;

uniform sampler2D window_color;
uniform sampler2D window_height;
uniform sampler2D window_normal;
uniform sampler2D window_opacity;

uniform vec3 camera_position;
uniform vec3 light_position;
uniform mat4 normal_model_to_world;
uniform mat4 vertex_world_to_clip;

uniform bool use_test;
uniform bool use_soft;
uniform bool hide_window;
uniform bool use_POM;
uniform bool use_light_scatter;

const float FLOOR_HEIGHT = 5.0;
const float ROOM_SIZE = 5.0;

float initialDepth = 0;

in VS_OUT {
    vec3 frag_pos;
    vec2 texcoords;
    mat3 TBN;
	vec3 N;
}
fs_in;

void main() {
    //vec3 lp = vec3(-light_position.y, -light_position.x, light_position.z);
    vec3 lp = light_position;
    vec3 V = inverse(fs_in.TBN) * normalize(camera_position - fs_in.frag_pos);
    vec3 N = fs_in.N;
    vec3 L = vec3(1.0, 0.0, 0.0);

    L = normalize(L);
    vec3 diffuse = max(dot(L, normalize(N)), 0.0) * vec3(0.8,0.5,0.2);
    frag_color.xyz = diffuse;
}

