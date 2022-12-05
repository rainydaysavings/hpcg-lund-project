#version 410

out vec4 frag_color;


uniform sampler2D test_color_map;
uniform sampler2D test_height_map;
uniform sampler2D test_normal_map;

uniform vec3 camera_position;
uniform vec3 light_position;

uniform mat4 normal_model_to_world;

in VS_OUT {
	vec3 frag_pos;
	vec2 texcoords;
	mat3 TBN;

} fs_in;


void main()
{
	//vec3 tT = vec3(1, 0, 0);
	//vec3 tB = vec3(0, 1, 0);
	//mat3 testTBN = mat3(tT, tB, tN);

	vec3 lp = vec3(0,0,10.5);
	lp = vec3(light_position.x, light_position.x, light_position.z);
	vec3 L = inverse(fs_in.TBN) * normalize(lp-fs_in.frag_pos);


	
	vec3 N = fs_in.TBN[2];
	vec3 V = inverse(fs_in.TBN) * normalize(camera_position-fs_in.frag_pos);


	// set heightscale
	float heightScale = 0.1;

	// Different amount of depth layers depending on view angle (Optimmization)
	const float minLayers = 8.0;
	const float maxLayers = 64.0;
	float numLayers = mix(maxLayers, minLayers, dot(N,V));
	//numLayers = 800;

	// layerDepth is the depth of every ray step done in the while loop
	float layerDepth = 1.0/numLayers;
	float currentLayerDepth = 0.0;

	// S is the step in texture coordinates when stepping along the ray
	vec2 S = ( -V.yx / V.z )* heightScale;
	// deltaUVs is the value added to the texture coordinates every step in the while loop
	vec2 deltaUVs = S / numLayers;

	vec2 UVs = fs_in.texcoords;

	// read surface texcoord texel depth. Depth is the inverse of height
	float currentDepthMapValue = 1.0 - texture2D(test_height_map, UVs).r;

	// while loop iterates in the direction of deltaUVs, and steps down a depth layer value each loop
	while(currentLayerDepth < currentDepthMapValue){
		UVs -= deltaUVs;
		currentDepthMapValue = 1.0 - texture2D(test_height_map, UVs).r;
		currentLayerDepth += layerDepth;
	}

	// Linear interpolation to get UV more accuretly than numLayers resolution.
	// Get previous texcoords so we have the coords for before and after collision
	vec2 prevTexCoords = UVs + deltaUVs;
	// afterDepth is the distance between the after collision layer depth and the actual depth value from the heightmap
	float afterDepth = currentDepthMapValue - currentLayerDepth;
	// beforeDepth is the distance between the before collision layer depth and the actual depth value from the heightmap using the prevTexCoords
	float beforeDepth = 1.0 - texture2D(test_height_map, prevTexCoords).r - currentLayerDepth + layerDepth;
	// weight is the value used to interpolate between the texture coordinates before and after collision, to approximate the precise hit location
	float weight = afterDepth / (afterDepth - beforeDepth);
	UVs = prevTexCoords * weight + UVs * (1.0 - weight);

	// can be used to exclude pixels that are outside the single texture tile
	if(UVs.x > 1.0 || UVs.y > 1.0 || UVs.x < 0.0 || UVs.y < 0.0){
		discard;
		return;
	}

	

	// Self shadowing

	vec2 lightStep = ( L.xy / L.z ) * heightScale;
	deltaUVs = lightStep / (numLayers*currentLayerDepth);
	vec2 tempUVs = UVs;
	float shadowFactor = 1;

//	while(currentLayerDepth > 0){
//		tempUVs -= deltaUVs;
//		// to stop shadows from neighbouring texture tiles
//		if(tempUVs.x > 1.0 || tempUVs.y > 1.0 || tempUVs.x < 0.0 || tempUVs.y < 0.0){
//			break;
//		}
//		currentDepthMapValue = 1.0 - texture2D(test_height_map, tempUVs).r;
//		currentLayerDepth -= layerDepth;
//		if(currentLayerDepth > currentDepthMapValue){
//			shadowFactor = 0.2;
//			break;
//		}
//	}



	// Soft self shadowing TODO: FIX THIS SHIT VVVVVVVVVVVVV

	float initialDepth = 1.0 - texture2D(test_height_map, tempUVs-0.001*deltaUVs).r;

	float maxOcclusion = 0;
	float maxOcclusionDepth = initialDepth;
	for(int i = 0; currentLayerDepth > 0; i++){
		tempUVs -= deltaUVs;
		float occlusionDepth = 1 - texture2D(test_height_map, tempUVs).r;
		if(maxOcclusion < (currentLayerDepth - occlusionDepth) && occlusionDepth < currentLayerDepth){
			maxOcclusion = currentLayerDepth - occlusionDepth;
			maxOcclusionDepth = occlusionDepth;
		}
		currentLayerDepth -= layerDepth;
	}

	float lightSourceWidth = 1;
	float lightSourceDistance = lp.z;
	if(maxOcclusionDepth != initialDepth){
		float penumbraWidth = lightSourceWidth*(initialDepth-maxOcclusionDepth)/maxOcclusionDepth;
		shadowFactor = max(min(penumbraWidth, 1.0), 0.0);
	}


	//phong shading

	N = normalize(normal_model_to_world * vec4(fs_in.TBN * (texture2D(test_normal_map, UVs).rgb * 2 - 1), 1.0)).rgb;
	N = vec3(-N.r, -N.b, N.g);

	vec3 R = normalize(reflect(L,N));

	vec3 ambient = vec3(0.2, 0.2, 0.2);

	vec4 diffuseTexture = texture2D(test_color_map, UVs);
	vec3 diffuse = max(dot(L,N), 0.0) * diffuseTexture.rgb * shadowFactor;

	vec3 specColor = vec3(1.0, 1.0, 1.0);
	float shininess = 10.0;
	//vec3 specular = specColor * pow(max(dot(R,V), 0.0), shininess);

	
	frag_color = vec4(ambient + diffuse , 1.0);
	//frag_color = vec4(N,1.0);
	}
