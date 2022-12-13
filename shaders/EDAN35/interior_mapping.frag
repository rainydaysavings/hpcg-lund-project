#version 410

out vec4 frag_color;


uniform sampler2D back_wall;
uniform sampler2D left_wall;
uniform sampler2D right_wall;
uniform sampler2D floor_wall;
uniform sampler2D ceil_wall;

uniform vec3 camera_position;
uniform vec3 light_position;
uniform mat4 normal_model_to_world;

const float FLOOR_HEIGHT = 5.0;
const float ROOM_SIZE = 5.0;

in VS_OUT {
	vec3 frag_pos;
	vec2 texcoords;
	mat3 TBN;
} fs_in;

void main()
{
	vec3 tangent_space_pos = fs_in.frag_pos - camera_position;

	// Floor and ceiling calculations
	float is_floor 		= step(tangent_space_pos.y, 0.0);
	float ceiling_y 	= ceil(fs_in.frag_pos.y / FLOOR_HEIGHT - is_floor) * FLOOR_HEIGHT;
	float ceiling_t 	= (ceiling_y - camera_position.y) / tangent_space_pos.y;

	// Back wall calculation
	float is_back_wall 	= step(tangent_space_pos.z, 0.0);
	float back_wall_z 	= ceil(fs_in.frag_pos.z / ROOM_SIZE - is_back_wall) * ROOM_SIZE;
	float back_wall_t 	= (back_wall_z - camera_position.z) / tangent_space_pos.z;

	// Left wall calculation
	float is_left_wall 	= step(tangent_space_pos.x, 0.0);
	float left_wall_x 	= ceil(fs_in.frag_pos.x / ROOM_SIZE - is_left_wall) * ROOM_SIZE;
	float left_wall_t 	= (left_wall_x - camera_position.x) / tangent_space_pos.x;

	// Let's paint walls
	vec3 diffuse_color;
	if (ceiling_t < left_wall_t) {
		if (ceiling_t < back_wall_t) {
			vec2 texcoords = camera_position.xz + ceiling_t * tangent_space_pos.xz;
			vec4 t0 = texture2D(right_wall, texcoords / FLOOR_HEIGHT);
			vec4 t1 = texture2D(floor_wall, texcoords / FLOOR_HEIGHT);
			// It's a ceiling
			diffuse_color = mix(
				t0.rgb,
				t1.rgb,
				mix(0.0, 0.4, texcoords.x)
			);
		} else {
			// It's the back wall
			vec2 texcoords = camera_position.xy + back_wall_t * tangent_space_pos.xy;
			diffuse_color = texture(back_wall, texcoords / ROOM_SIZE).rgb;
		}
	} else {
		if (back_wall_t < left_wall_t) {
			// It's the back wall
			vec2 texcoords = camera_position.xy + back_wall_t * tangent_space_pos.xy;
			diffuse_color = texture(back_wall, texcoords / ROOM_SIZE).rgb;
		} else {
			// It's a side wall, needs to check if left or right
			vec2 texcoords = camera_position.zy + left_wall_t * tangent_space_pos.zy;
			diffuse_color = mix(
				texture(left_wall, texcoords / ROOM_SIZE).rgb,
				texture(right_wall, texcoords / ROOM_SIZE).rgb,
				is_left_wall
			);
		}
	}

	frag_color.xyz = diffuse_color;
}
