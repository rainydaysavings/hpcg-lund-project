#version 410

out vec4 frag_color;

uniform sampler2D test_height_map;
uniform sampler2D test_color_map;
uniform sampler2D test_normal_map;

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

uniform sampler2D window_color;
uniform sampler2D window_height;
uniform sampler2D window_normal;
uniform sampler2D window_opacity;

uniform vec3 camera_position;
uniform vec3 light_position;
uniform mat4 normal_model_to_world;

uniform bool use_test;
uniform bool use_soft;
uniform bool hide_window;
uniform bool use_POM;


const float FLOOR_HEIGHT = 5.0;
const float ROOM_SIZE = 5.0;

float initialDepth = 0;

in VS_OUT {
	vec3 frag_pos;
	vec2 texcoords;
	mat3 TBN;
} fs_in;

float softShadow(vec2 UVs, vec3 L, vec3 N, float heightScale, int wallIdx){
		if(!use_soft){
			return 1.0;
		}

		L = vec3(-L.y-0.5, -L.x-0.65, L.z);

		float shadowNumLayers = 80.0;
		float shadowFactor = 1.0;

		float shadowLayerDepth = 1.0/shadowNumLayers;
		float startDepth = 0;


		if(use_test){
			startDepth = 1.0 - texture2D(test_height_map, UVs).r;
		} else {

			switch(wallIdx){
			case 0:
				startDepth = 1.0 - texture2D(window_height, UVs).r;
				break;
			case 1:
				startDepth = 1.0 - texture2D(left_wall_height, UVs).r;
				break;
			case 2:
				startDepth = 1.0 - texture2D(right_wall_height, UVs).r;
				break;
			case 3:
				startDepth = 1.0 - texture2D(back_wall_height, UVs).r;
				break;
			case 4:
				startDepth = 1.0 - texture2D(ceil_wall_height, UVs).r;
				break;
			}
		}
		L = L + startDepth;
		vec3 Ln = normalize(L);
		vec2 lightStep = ( Ln.yx / Ln.z ) * heightScale;
		
		float currentLayerDepth = startDepth;
		vec2 deltaUVs = lightStep / (shadowNumLayers * currentLayerDepth);
		vec2 tempUVs = UVs;

		// Soft self shadowing 
	
		// variable maxOcclusion is the size of the largest occlusion encountered on the ray to the light source
		float maxOcclusion = 0;
		// variable maxOcclusionDepth is the depth of that point of occlusion
		float maxOcclusionDepth = startDepth;
		//if(dot(N,L) > 0){
			// loop until ray escapes surface
			while(currentLayerDepth > 0){
				tempUVs -= deltaUVs;
//				if(tempUVs.x > 1.0 || tempUVs.y > 1.0 || tempUVs.x < 0.0 || tempUVs.y < 0.0){
//					break;
//				}
				float occlusionDepth = 1.0;
				if(use_test){
					occlusionDepth = 1.0 - texture2D(test_height_map, tempUVs).r;
				} else {
					switch(wallIdx){
					case 0:
						occlusionDepth = 1.0 - texture2D(window_height, tempUVs).r;
						break;
					case 1:
						occlusionDepth = 1.0 - texture2D(left_wall_height, tempUVs).r;
						break;
					case 2:
						occlusionDepth = 1.0 - texture2D(right_wall_height, tempUVs).r;
						break;
					case 3:
						occlusionDepth = 1.0 - texture2D(back_wall_height, tempUVs).r;
						break;
					case 4:
						occlusionDepth = 1.0 - texture2D(ceil_wall_height, tempUVs).r;
						break;
					}
				}
				if(maxOcclusion < (currentLayerDepth - occlusionDepth) && occlusionDepth < currentLayerDepth){
					maxOcclusion = currentLayerDepth - occlusionDepth;
					maxOcclusionDepth = occlusionDepth;
				}
				currentLayerDepth -= shadowLayerDepth;
			}
			// penumbra size approximation with an area light source(of width 1) (may be tweaked for better looking shadows)
			if(maxOcclusionDepth != startDepth){
				float penumbraWidth = (startDepth-maxOcclusionDepth)/(maxOcclusionDepth+length(L));
				// interpret penumbraWidth as a factor between 1 and 0
				shadowFactor = max(min(1-penumbraWidth/(0.24+penumbraWidth), 1.0), 0.0);
				//shadowFactor = max(min(pow(startDepth-(maxOcclusionDepth+1), 2.0), 1.0), 0.0);
			}
		//}
		


	return shadowFactor;
}




// wallIdx:
//window = 0
//left wall = 1
//right wall = 2
//back wall = 3
//ceiling = 4
//floor = 5
vec2 POM(vec2 texcoords, vec3 N, vec3 V, float heightScale, int wallIdx){
	if(!use_POM){
		return texcoords;
	}


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
	if(use_test){
		currentDepthMapValue = 1.0 - texture2D(test_height_map, UVs).r;
	} else {
		switch(wallIdx){
			case 0:
				currentDepthMapValue = 1.0 - texture2D(window_height, UVs).r;
				break;
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
		}

	// while loop iterates in the direction of deltaUVs, and steps down a depth layer value each loop
	while(currentLayerDepth < currentDepthMapValue){
		UVs -= deltaUVs;
		if(use_test){
			currentDepthMapValue = 1.0 - texture2D(test_height_map, UVs).r;
		} else {
			switch(wallIdx){
			case 0:
				currentDepthMapValue = 1.0 - texture2D(window_height, UVs).r;
				break;
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
	if(use_test){
		beforeDepth = 1.0 - texture2D(test_height_map, prevTexCoords).r;
	} else {
		switch(wallIdx){
			case 0:
				beforeDepth = 1.0 - texture2D(window_height, prevTexCoords).r;
				break;
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
		}

	beforeDepth = beforeDepth - currentLayerDepth + layerDepth;
	initialDepth = beforeDepth;
	// weight is the value used to interpolate between the texture coordinates before and after collision, to approximate the precise hit location
	float weight = afterDepth / (afterDepth - beforeDepth);
	UVs = prevTexCoords * weight + UVs * (1.0 - weight);

	return UVs;
}

void main()
{
	//vec3 lp = vec3(-light_position.y, -light_position.x, light_position.z);
	vec3 lp = light_position;
	vec3 V = inverse(fs_in.TBN) * normalize(camera_position-fs_in.frag_pos);
	vec2 UVs = vec2(0.0);
	vec3 N = vec3(0,0,1);
	float shadowFactor = 1.0;
	vec3 L = vec3(1.0, 0.0, 0.0);

	if(!hide_window){


		vec3 dirLight = normalize(vec3(0, 20, 10));
		UVs = POM(fs_in.texcoords, vec3(0,0,1), V, 0.2, 0);
		if(UVs.x > 1.0 || UVs.y > 1.0 || UVs.x < 0.0 || UVs.y < 0.0){
			discard;
			return;
		}




		// Does it hit window wall?
		if(texture2D(window_opacity, UVs).r > 0.1){

			N = texture2D(window_normal, UVs).rgb * 2 - 1;
			vec3 windowDiffuse = texture2D(window_color, UVs).rgb;
			vec3 windowAmbient = windowDiffuse * 0.2;
			vec3 windowColor = max(dot(dirLight,normalize(N)), 0.0) * windowDiffuse;
			shadowFactor = softShadow(UVs, dirLight, vec3(0,0,1), 0.2, 0);

			frag_color.rgb = windowColor + windowAmbient * pow(shadowFactor, 10);




			return;
		}



	}
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
			
			if(is_floor != 1){
				UVs = POM(texcoords / FLOOR_HEIGHT, vec3(0,-1,0), V, 0.1, 4);
				// adapt light coordiates to different wall orientations
				lp = vec3(lp.x, lp.z - 1.0, 1.0-lp.y);
				L = lp - vec3(UVs, initialDepth);

				if(use_test){
					N = texture2D(test_normal_map, UVs).rgb* 2 - 1;
					diffuse_color = texture(test_color_map, UVs).rgb;
				} else {
					N = texture2D(ceil_wall_normal, UVs).rgb* 2 - 1;
					diffuse_color = texture(ceil_wall, UVs).rgb;
				}
				shadowFactor = softShadow(UVs, L, vec3(0,0,1), 0.1, 4);
				
				
			} else {
				// It's the floor
				if(use_test){
					V = (mat4(1, 0, 0, 0,
							  0, 1, 0, 0,
							  0, 0, -1, 0,
							  0, 0, 0, 1)*vec4(V, 1.0)).xyz;
					UVs = POM(texcoords / FLOOR_HEIGHT, vec3(0,1,0), V, 0.1, 4);
					lp = vec3(lp.x, lp.z - 2.5, lp.y);
					L = lp - vec3(UVs, initialDepth);
					N = texture2D(test_normal_map, UVs).rgb* 2 - 1;
					diffuse_color = texture(test_color_map, UVs).rgb;
					shadowFactor = softShadow(UVs, L, vec3(0,0,1), 0.1, 4);
				} else {
					L = lp - vec3(texcoords / FLOOR_HEIGHT, initialDepth);
					diffuse_color = texture(floor_wall, texcoords / FLOOR_HEIGHT).rgb;
					N = texture2D(floor_wall_normal, texcoords / FLOOR_HEIGHT).rgb* 2 - 1;
					N = (mat4(1, 0, 0, 0,
							  0, 1, 0, 0,
							  0, 0, 1, 0,
							  0, 0, 0, 1)*vec4(N, 1.0)).xyz;
				}
			}

		} else {
			// It's the back wall
			
			vec2 texcoords = camera_position.xy + back_wall_t * tangent_space_pos.xy;
			UVs = POM(texcoords / ROOM_SIZE, vec3(0,0,1), V, 0.3, 3);
			lp = vec3(lp.x, lp.y, lp.z);
			L = lp - vec3(UVs, -initialDepth);

			if(use_test){
				N = texture2D(test_normal_map, UVs).rgb* 2 - 1;
				diffuse_color = texture(test_color_map, UVs).rgb;
			} else {
				N = texture2D(back_wall_normal, UVs).rgb* 2 - 1;
				diffuse_color = texture(back_wall, UVs).rgb;
			}
			shadowFactor = softShadow(UVs, L, vec3(0,0,1), 0.2, 3);
			
			
		}
	} else {
		if (back_wall_t < left_wall_t) {
			// It's the back wall
			vec2 texcoords = camera_position.xy + back_wall_t * tangent_space_pos.xy;
			UVs = POM(texcoords / ROOM_SIZE, vec3(0,0,1), V, 0.3, 3);
			lp = vec3(lp.x, lp.y, lp.z);
			L = lp - vec3(UVs, initialDepth);
			if(use_test){
				N = texture2D(test_normal_map, UVs).rgb* 2 - 1;
				diffuse_color = texture(test_color_map, UVs).rgb;
			} else {
				N = texture2D(back_wall_normal, UVs).rgb* 2 - 1;
				diffuse_color = texture(back_wall, UVs).rgb;
			}
			shadowFactor = softShadow(UVs, L, vec3(0,0,1), 0.2, 3);
			
			
		} else {
			// It's a side wall, needs to check if left or right
			vec2 texcoords = camera_position.zy + left_wall_t * tangent_space_pos.zy;
			if(is_left_wall != 1){
			// right wall
				V = (mat4(1, 0, 0, 0,
						  0, 0, 1, 0,
						  0, -1, 0, 0,
						  0, 0, 0, 1)*vec4(V, 1.0)).xyz;
				UVs = POM(texcoords / ROOM_SIZE, vec3(-1,0,0), V, 0.1, 2);
				lp = vec3(lp.z - 1.0, lp.y, 1.0 - lp.x);
				L = lp - vec3(UVs, initialDepth);
				if(use_test){
					N = texture2D(test_normal_map, UVs).rgb* 2 - 1;
					diffuse_color = texture(test_color_map, UVs).rgb;
				} else {
					N = texture2D(right_wall_normal, UVs).rgb* 2 - 1;
					diffuse_color = texture(right_wall, UVs).rgb;
				}
				shadowFactor = softShadow(UVs, L, vec3(0,0,1), 0.1, 2);
				
				

			} else {
			// left wall
				V = (mat4(1, 0, 0, 0,
						  0, 0, -1, 0,
						  0, -1, 0, 0,
						  0, 0, 0, 1)*vec4(V, 1.0)).xyz;
				UVs = POM(texcoords / ROOM_SIZE, vec3(1,0,0), V, 0.1, 1);
				lp = vec3(lp.z - 1.0, lp.y, lp.x);
				L = lp - vec3(UVs, initialDepth);
				if(use_test){
					N = texture2D(test_normal_map, UVs).rgb* 2 - 1;
					diffuse_color = texture(test_color_map, UVs).rgb;
				} else {
					N = texture2D(left_wall_normal, UVs).rgb* 2 - 1;
					diffuse_color = texture(left_wall, UVs).rgb;
				}
				shadowFactor = softShadow(UVs, L, vec3(0,0,1), 0.1, 1);
				

			}
		}
	}
	
	L = normalize(L);
	vec3 diffuse = max(dot(L,normalize(N)), 0.0) * diffuse_color;


	shadowFactor = shadowFactor * shadowFactor; 
	frag_color.xyz = diffuse * shadowFactor;
}
