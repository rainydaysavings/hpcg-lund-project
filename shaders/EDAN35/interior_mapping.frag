#version 410

out vec4 frag_color;


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



// wallIdx:
//left wall = 1
//right wall = 2
//back wall = 3
//ceiling = 4
//floor = 5
const uint WALL_LEFT 	= 1;
const uint WALL_RIGHT 	= 2;
const uint WALL_BACK 	= 3;
const uint WALL_CEIL 	= 4;
const uint WALL_FLOOR 	= 5;
vec2 POM(vec2 texcoords, vec3 N, vec3 V, float heightScale, uint wallIdx){

	// Different amount of depth layers depending on view angle (Optimmization)
	const float minLayers = 2.0;
	const float maxLayers = 128.0;
	float numLayers = mix(maxLayers, minLayers, dot(N,V));
	numLayers = 128;

	// layerDepth is the depth of every ray step done in the while loop
	float layerDepth = 1.0 / numLayers;
	float currentLayerDepth = 0.0;

	// S is the step in texture coordinates when stepping along the ray
	vec2 S = ( -V.yx / V.z ) * heightScale;
	// deltaUVs is the value added to the texture coordinates every step in the while loop
	vec2 deltaUVs = S / numLayers;

	vec2 UVs = texcoords;

	// read surface texcoord texel depth. Depth is the inverse of height
	float currentDepthMapValue = 0.0;

	switch(wallIdx){
		case WALL_LEFT:
			currentDepthMapValue = 1.0 - texture2D(left_wall_height, UVs).r;
			break;
		case WALL_RIGHT:
			currentDepthMapValue = 1.0 - texture2D(right_wall_height, UVs).r;
			break;
		case WALL_BACK:
			currentDepthMapValue = 1.0 - texture2D(back_wall_height, UVs).r;
			break;
		case WALL_CEIL:
			currentDepthMapValue = 1.0 - texture2D(ceil_wall_height, UVs).r;
			break;
//		case 5:
//			currentDepthMapValue = 1.0 - texture2D(floor_wall_height, UVs).r;
//			break;
		}

	// while loop iterates in the direction of deltaUVs, and steps down a depth layer value each loop
	while(currentLayerDepth < currentDepthMapValue){
		UVs -= deltaUVs;

		switch(wallIdx){
		case WALL_LEFT:
			currentDepthMapValue = 1.0 - texture2D(left_wall_height, UVs).r;
			break;
		case WALL_RIGHT:
			currentDepthMapValue = 1.0 - texture2D(right_wall_height, UVs).r;
			break;
		case WALL_BACK:
			currentDepthMapValue = 1.0 - texture2D(back_wall_height, UVs).r;
			break;
		case WALL_CEIL:
			currentDepthMapValue = 1.0 - texture2D(ceil_wall_height, UVs).r;
			break;
//		case 5:
//			currentDepthMapValue = 1.0 - texture2D(floor_wall_height, UVs).r;
//			break;
		}

		currentLayerDepth += layerDepth;
	}

	// Linear interpolation to get UV more accuretly than numLayers resolution.
	// Get previous texcoords so we have the coords for before and after collision
	vec2 prevTexCoords = UVs + deltaUVs;
	// afterDepth is the distance between the after collision layer depth and the actual depth value from the heightmap
	float afterDepth = currentDepthMapValue - currentLayerDepth;
	// beforeDepth is the distance between the before collision layer depth and the actual depth value from the heightmap using the prevTexCoords
	float beforeDepth = 1.0;

	switch(wallIdx){
		case WALL_LEFT:
			beforeDepth -= texture2D(left_wall_height, prevTexCoords).r;
			break;
		case WALL_RIGHT:
			beforeDepth -= texture2D(right_wall_height, prevTexCoords).r;
			break;
		case WALL_BACK:
			beforeDepth -= texture2D(back_wall_height, prevTexCoords).r;
			break;
		case WALL_CEIL:
			beforeDepth -= texture2D(ceil_wall_height, prevTexCoords).r;
			break;
//		case 5:
//			currentDepthMapValue = 1.0 - texture2D(floor_wall_height, prevTexCoords).r;
//			break;
		}

	beforeDepth = beforeDepth - currentLayerDepth + layerDepth;
	// weight is the value used to interpolate between the texture coordinates before and after collision, to approximate the precise hit location
	float weight = afterDepth / (afterDepth - beforeDepth);
	UVs = prevTexCoords * weight + UVs * (1.0 - weight);

	return UVs;
}


void main()
{
	vec3 frag_pos = fs_in.frag_pos;
	vec3 epsilon_camera_pos = camera_position;

	vec3 V = inverse(fs_in.TBN) * normalize(epsilon_camera_pos-fs_in.frag_pos);
	vec3 tangent_space_pos = fs_in.frag_pos - epsilon_camera_pos;

	// Floor and ceiling calculations
	float is_floor 		= step(tangent_space_pos.y, 0.0);
	float ceiling_y 	= ceil(frag_pos.y / FLOOR_HEIGHT - is_floor) * FLOOR_HEIGHT;
	float ceiling_t 	= (ceiling_y - epsilon_camera_pos.y) / tangent_space_pos.y;

	// Back wall calculation
	float is_back_wall 	= step(tangent_space_pos.z, 0.0);
	float back_wall_z 	= ceil(frag_pos.z / ROOM_SIZE - is_back_wall) * ROOM_SIZE;
	float back_wall_t 	= (back_wall_z - epsilon_camera_pos.z) / tangent_space_pos.z;

	// Left wall calculation
	float is_left_wall 	= step(tangent_space_pos.x, 0.0);
	float left_wall_x 	= ceil(frag_pos.x / ROOM_SIZE - is_left_wall) * ROOM_SIZE;
	float left_wall_t 	= (left_wall_x - epsilon_camera_pos.x) / tangent_space_pos.x;

	// Let's paint walls
	vec3 diffuse_color;
	vec3 normal;
	if (ceiling_t < left_wall_t) {
		if (ceiling_t < back_wall_t) {
			vec2 texcoords = (epsilon_camera_pos.xz + ceiling_t * tangent_space_pos.xz) / FLOOR_HEIGHT;
			if(texcoords.x > 0.98 || texcoords.y > 0.98) vec2(0.0,1.0);
			if(texcoords.x < 0.02 || texcoords.y < -0.98) vec2(0.0,1.0);

			// It's a ceiling
			V = (mat4(0, 0, 1, 0,
					  0, 1, 0, 0,
					  -1, 0, 0, 0,
					  0, 0, 0, 1)*vec4(V, 1.0)).xyz;
			diffuse_color = mix(
				texture(ceil_wall_color, POM(texcoords, vec3(0,-1,0), V, 0.1, WALL_CEIL)).rgb,
				texture(floor_wall_color, texcoords).rgb,
				is_floor
			);
			normal =  mix(
				texture(ceil_wall_normal, texcoords).rgb,
				texture(floor_wall_normal, texcoords).rgb,
				is_floor
			);
		} else {
			// It's the back wall
			vec2 texcoords = (epsilon_camera_pos.xy + back_wall_t * tangent_space_pos.xy) / FLOOR_HEIGHT;
			if(texcoords.x < 0.02 || texcoords.y < 0.02) vec2(0.0,1.0);
			if(texcoords.x > 0.98 || texcoords.y > 0.98) vec2(0.0,1.0);
			diffuse_color = texture(back_wall_color, POM(texcoords, vec3(0,0,1), V, 0.5, WALL_BACK)).rgb;
			normal = texture(back_wall_normal, texcoords).rgb;
		}
	} else {
		if (back_wall_t < left_wall_t) {
			// It's the back wall
			vec2 texcoords = (epsilon_camera_pos.xy + back_wall_t * tangent_space_pos.xy) / ROOM_SIZE;
			if(texcoords.x < 0.02 || texcoords.y < 0.02) vec2(0.0,1.0);
			if(texcoords.x > 0.98 || texcoords.y > 0.98) vec2(0.0,1.0);

			diffuse_color = texture(back_wall_color, POM(texcoords, vec3(0,0,1), V, 0.5, WALL_BACK)).rgb;
			normal = texture(back_wall_normal, texcoords).rgb;
		} else {
			// It's a side wall, needs to check if left or right
			vec2 texcoords = (epsilon_camera_pos.zy + left_wall_t * tangent_space_pos.zy) / ROOM_SIZE;
			if(texcoords.x < -0.98 || texcoords.y < 0.02) vec2(0.0,1.0);
			if(texcoords.x > -0.02 || texcoords.y > 0.98) vec2(0.0,1.0);

			if(is_left_wall != 1){
				V = (mat4(1, 0, 0, 0,
						  0, 0, 1, 0,
						  0, -1, 0, 0,
						  0, 0, 0, 1)*vec4(V, 1.0)).xyz;
				diffuse_color = texture(right_wall_color, POM(texcoords, vec3(-1,0,0), V, 0.1, WALL_RIGHT)).rgb;
			} else {
				V = (mat4(1, 0, 0, 0,
						  0, 0, -1, 0,
						  0, -1, 0, 0,
						  0, 0, 0, 1)*vec4(V, 1.0)).xyz;

				diffuse_color = texture(left_wall_color, POM(texcoords, vec3(1,0,0), V, 0.1, WALL_LEFT)).rgb;
			}

			normal =  mix(
				texture(left_wall_normal, texcoords).rgb,
				texture(right_wall_normal, texcoords).rgb,
				is_left_wall
			);
		}
	}

	frag_color.xyz = diffuse_color;
}
