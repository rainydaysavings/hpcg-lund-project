#version 410

out vec4 frag_color;


uniform sampler2D back_wall;
uniform sampler2D left_wall;
uniform sampler2D right_wall;
uniform sampler2D floor_wall;
uniform sampler2D ceil_wall;

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
vec2 POM(vec2 texcoords, vec3 N, vec3 V, float heightScale, int wallIdx){



	// Different amount of depth layers depending on view angle (Optimmization)
	const float minLayers = 8.0;
	const float maxLayers = 64.0;
	float numLayers = mix(maxLayers, minLayers, dot(N,V));
	numLayers = 128;

	// layerDepth is the depth of every ray step done in the while loop
	float layerDepth = 1.0/numLayers;
	float currentLayerDepth = 0.0;

	// S is the step in texture coordinates when stepping along the ray
	vec2 S = ( -V.yx / V.z )* heightScale;
	// deltaUVs is the value added to the texture coordinates every step in the while loop
	vec2 deltaUVs = S / numLayers;

	vec2 UVs = texcoords;

	// read surface texcoord texel depth. Depth is the inverse of height
	float currentDepthMapValue = 0.0;

	switch(wallIdx){
		case 1:
			currentDepthMapValue = 1.0 - texture2D(left_wall_height, UVs).r;
			break;
		case 2:
			currentDepthMapValue = 1.0 - texture2D(right_wall_height, UVs).r;
			break;
		case 3:
			currentDepthMapValue = 1.0 - texture2D(back_wall_height, UVs).r;
			break;
		case 4:
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
		case 1:
			currentDepthMapValue = 1.0 - texture2D(left_wall_height, UVs).r;
			break;
		case 2:
			currentDepthMapValue = 1.0 - texture2D(right_wall_height, UVs).r;
			break;
		case 3:
			currentDepthMapValue = 1.0 - texture2D(back_wall_height, UVs).r;
			break;
		case 4:
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
		case 1:
			beforeDepth = 1.0 - texture2D(left_wall_height, prevTexCoords).r;
			break;
		case 2:
			beforeDepth = 1.0 - texture2D(right_wall_height, prevTexCoords).r;
			break;
		case 3:
			beforeDepth = 1.0 - texture2D(back_wall_height, prevTexCoords).r;
			break;
		case 4:
			beforeDepth = 1.0 - texture2D(ceil_wall_height, prevTexCoords).r;
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

	
	vec3 V = inverse(fs_in.TBN) * normalize(camera_position-fs_in.frag_pos);


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
			// It's a ceiling
			V = (mat4(0, 0, 1, 0,
					  0, 1, 0, 0,
					  -1, 0, 0, 0,
					  0, 0, 0, 1)*vec4(V, 1.0)).xyz;
			diffuse_color = mix(
				texture(ceil_wall, POM(texcoords / FLOOR_HEIGHT, vec3(0,-1,0), V, 0.1, 4)).rgb,
				texture(floor_wall, texcoords / FLOOR_HEIGHT).rgb,
				is_floor
			);
		} else {
			// It's the back wall
			
			vec2 texcoords = camera_position.xy + back_wall_t * tangent_space_pos.xy;
			diffuse_color = texture(back_wall, POM(texcoords / ROOM_SIZE, vec3(0,0,1), V, 0.4, 3)).rgb;
		}
	} else {
		if (back_wall_t < left_wall_t) {
			// It's the back wall
			vec2 texcoords = camera_position.xy + back_wall_t * tangent_space_pos.xy;
			diffuse_color = texture(back_wall, POM(texcoords / ROOM_SIZE, vec3(0,0,1), V, 0.4, 3)).rgb;
		} else {
			// It's a side wall, needs to check if left or right
			vec2 texcoords = camera_position.zy + left_wall_t * tangent_space_pos.zy;
			if(is_left_wall != 1){
				V = (mat4(1, 0, 0, 0,
						  0, 0, 1, 0,
						  0, -1, 0, 0,
						  0, 0, 0, 1)*vec4(V, 1.0)).xyz;

				diffuse_color = texture(right_wall, POM(texcoords / ROOM_SIZE, vec3(-1,0,0), V, 0.1, 2)).rgb;

			} else {
				V = (mat4(1, 0, 0, 0,
						  0, 0, -1, 0,
						  0, -1, 0, 0,
						  0, 0, 0, 1)*vec4(V, 1.0)).xyz;

				diffuse_color = texture(left_wall, POM(texcoords / ROOM_SIZE, vec3(1,0,0), V, 0.1, 1)).rgb;

			}



//			diffuse_color = mix(
//				texture(right_wall, POM(texcoords / ROOM_SIZE, vec3(1,0,0), V, 0.1, 2)).rgb,
//				texture(left_wall, texcoords / ROOM_SIZE).rgb,
//				is_left_wall
//			);
		}
	}

	frag_color.xyz = diffuse_color;
}
