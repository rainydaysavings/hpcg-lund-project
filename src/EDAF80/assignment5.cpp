#include "assignment5.hpp"
#include <EDAF80/parametric_shapes.cpp>

#include "config.hpp"
#include "core/Bonobo.h"
#include "core/FPSCamera.h"
#include "core/helpers.hpp"
#include "core/node.hpp"
#include "core/ShaderProgramManager.hpp"

#include <imgui.h>
#include <tinyfiledialogs.h>
#include <clocale>
#include <stdexcept>
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>
#include <cstdlib>


edaf80::Assignment5::Assignment5(WindowManager& windowManager) :
	mCamera(0.5f * glm::half_pi<float>(),
		static_cast<float>(config::resolution_x) / static_cast<float>(config::resolution_y),
		0.01f, 1000.0f),
	inputHandler(), mWindowManager(windowManager), window(nullptr)
{
	WindowManager::WindowDatum window_datum{ inputHandler, mCamera, config::resolution_x, config::resolution_y, 0, 0, 0, 0 };
	window = mWindowManager.CreateGLFWWindow("EDAF80: Assignment 5", window_datum, config::msaa_rate);
	if (window == nullptr) {
		throw std::runtime_error("Failed to get a window: aborting!");
	}

	bonobo::init();
}

edaf80::Assignment5::~Assignment5()
{
	bonobo::deinit();
}

void
edaf80::Assignment5::run()
{
	// Set up the camera
	mCamera.mWorld.SetTranslate(glm::vec3(0.0f, 0.0f, 6.0f));
	mCamera.mMouseSensitivity = glm::vec2(0.003f);
	mCamera.mMovementSpeed = glm::vec3(3.0f); // 3 m/s => 10.8 km/h

	// Create the shader programs
	ShaderProgramManager program_manager;
	GLuint fallback_shader = 0u;
	program_manager.CreateAndRegisterProgram("Fallback",
		{ { ShaderType::vertex, "common/fallback.vert" },
		  { ShaderType::fragment, "common/fallback.frag" } },
		fallback_shader);
	if (fallback_shader == 0u) {
		LogError("Failed to load fallback shader");
		return;
	}

	GLuint parallax_shader = 0u;
	program_manager.CreateAndRegisterProgram("parallax",
		{ { ShaderType::vertex, "EDAN35/parallax.vert" },
		  { ShaderType::fragment, "EDAN35/parallax.frag" } },
		parallax_shader);
	if (parallax_shader == 0u) {
		LogError("Failed to load parallax shader");
		return;
	}

	GLuint interior_mapping_shader = 0u;
	program_manager.CreateAndRegisterProgram("interior_mapping",
		{ { ShaderType::vertex, "EDAN35/interior_mapping.vert" },
		  { ShaderType::fragment, "EDAN35/interior_mapping.frag" } },
		interior_mapping_shader);
	if (interior_mapping_shader == 0u) {
		LogError("Failed to load interior mapping shader");
		return;
	}

	//
	// Todo: Insert the creation of other shader programs.
	//       (Check how it was done in assignment 3.)
	//
	glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_MIRRORED_REPEAT);
	glTexParameterf(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_MIRRORED_REPEAT);

	//load all textures

	auto test_height_map = bonobo::loadTexture2D(config::resources_path("project/Parallax_Occlusion_test_heightraw.png"));
	auto test_color_map = bonobo::loadTexture2D(config::resources_path("project/Parallax_Occlusion_test_Color.png"));
	auto test_normal_map = bonobo::loadTexture2D(config::resources_path("project/Parallax_Occlusion_test_normal.png"));

	auto wall1_height_map = bonobo::loadTexture2D(config::resources_path("project/wall1/wall1_height.png"));
	auto wall1_color_map = bonobo::loadTexture2D(config::resources_path("project/wall1/wall1_albedo.png"));
	auto wall1_normal_map = bonobo::loadTexture2D(config::resources_path("project/wall1/wall1_normal.png"));

	auto wall2_height_map = bonobo::loadTexture2D(config::resources_path("project/wall2/wall2_height.png"));
	auto wall2_color_map = bonobo::loadTexture2D(config::resources_path("project/wall2/wall2_albedo.png"));
	auto wall2_normal_map = bonobo::loadTexture2D(config::resources_path("project/wall2/wall2_normal.png"));

	auto wall3_height_map = bonobo::loadTexture2D(config::resources_path("project/wall3/wall3_height.png"));
	auto wall3_color_map = bonobo::loadTexture2D(config::resources_path("project/wall3/wall3_albedo.png"));
	auto wall3_normal_map = bonobo::loadTexture2D(config::resources_path("project/wall3/wall3_normal.png"));

	//floor height map is not used
	//auto floor_height_map = bonobo::loadTexture2D(config::resources_path("project/floor/floor_height.png"));
	auto floor_color_map = bonobo::loadTexture2D(config::resources_path("project/floor/floor_albedo.png"));
	auto floor_normal_map = bonobo::loadTexture2D(config::resources_path("project/floor/floor_normal.png"));

	auto ceiling_height_map = bonobo::loadTexture2D(config::resources_path("project/ceiling/ceil_height.png"));
	auto ceiling_color_map = bonobo::loadTexture2D(config::resources_path("project/ceiling/ceil_albedo.png"));
	auto ceiling_normal_map = bonobo::loadTexture2D(config::resources_path("project/ceiling/ceil_normal.png"));

	auto window_height_map = bonobo::loadTexture2D(config::resources_path("project/window/window_height.png"));
	auto window_color_map = bonobo::loadTexture2D(config::resources_path("project/window/window_albedo.png"));
	auto window_normal_map = bonobo::loadTexture2D(config::resources_path("project/window/window_normal.png"));
	auto window_opacity_map = bonobo::loadTexture2D(config::resources_path("project/window/window_opacity.png"));






	//
	// Todo: Load your geometry
	//
	/*auto back_wall 			= bonobo::loadTexture2D(config::resources_path("project/blue_back.jpg"));
	auto left_wall 			= bonobo::loadTexture2D(config::resources_path("project/red_left.jpg"));
	auto right_wall 		= bonobo::loadTexture2D(config::resources_path("project/red_right.jpg"));
	auto floor_wall 		= bonobo::loadTexture2D(config::resources_path("project/green_floor.jpg"));
	auto ceil_wall 			= bonobo::loadTexture2D(config::resources_path("project/green_ceil.jpg"));*/

	// Setting camera and light positions
	auto camera_position = mCamera.mWorld.GetTranslation();
	auto light_position = glm::vec3(0.5f, 0.5f, 0.5f);
	bool use_POM = false;
	bool use_hard = false;
	bool use_soft = false;
	bool use_test = false;
	bool use_light_scatter = false;
	bool hide_window = false;
	auto const set_uniforms = [&light_position, &camera_position, &use_POM, &use_hard, &use_soft, &use_test, &hide_window, &use_light_scatter](GLuint program) {
		glUniform3fv(glGetUniformLocation(program, "light_position"), 1, glm::value_ptr(light_position));
		glUniform3fv(glGetUniformLocation(program, "camera_position"), 1, glm::value_ptr(camera_position));
		glUniform1i(glGetUniformLocation(program, "use_POM"), use_POM ? 1 : 0);
		glUniform1i(glGetUniformLocation(program, "use_hard"), use_hard ? 1 : 0);
		glUniform1i(glGetUniformLocation(program, "use_soft"), use_soft ? 1 : 0);
		glUniform1i(glGetUniformLocation(program, "use_test"), use_test ? 1 : 0);
		glUniform1i(glGetUniformLocation(program, "hide_window"), hide_window ? 1 : 0);
		glUniform1i(glGetUniformLocation(program, "use_light_scatter"), use_light_scatter ? 1 : 0);
	};

	// Setting wall geometry, shader and textures
	auto wall_shape = parametric_shapes::createQuad(10.0f, 10.0f, 0, 0);
	Node wall;
	wall.set_geometry(wall_shape);
	//wall.set_program(&parallax_shader, set_uniforms);
	wall.add_texture("test_height_map", test_height_map, GL_TEXTURE_2D);
	wall.add_texture("test_color_map", test_color_map, GL_TEXTURE_2D);
	wall.add_texture("test_normal_map", test_normal_map, GL_TEXTURE_2D);


	wall.set_program(&interior_mapping_shader, 	set_uniforms);
	wall.add_texture("back_wall_color", wall3_color_map, 	GL_TEXTURE_2D);
	wall.add_texture("left_wall_color", wall2_color_map,	GL_TEXTURE_2D);
	wall.add_texture("right_wall_color", wall1_color_map, GL_TEXTURE_2D);
	wall.add_texture("floor_wall_color", floor_color_map, GL_TEXTURE_2D);
	wall.add_texture("ceil_wall_color", ceiling_color_map,GL_TEXTURE_2D);

	wall.add_texture("back_wall_height", wall3_height_map, GL_TEXTURE_2D);
	wall.add_texture("left_wall_height", wall2_height_map, GL_TEXTURE_2D);
	wall.add_texture("right_wall_height", wall1_height_map, GL_TEXTURE_2D);
	//wall.add_texture("floor_wall_height", floor_height_map, GL_TEXTURE_2D);
	wall.add_texture("ceil_wall_height", ceiling_height_map, GL_TEXTURE_2D);

	wall.add_texture("back_wall_normal", wall3_normal_map, GL_TEXTURE_2D);
	wall.add_texture("left_wall_normal", wall2_normal_map, GL_TEXTURE_2D);
	wall.add_texture("right_wall_normal", wall1_normal_map, GL_TEXTURE_2D);
	wall.add_texture("floor_wall_normal", floor_normal_map, GL_TEXTURE_2D);
	wall.add_texture("ceil_wall_normal", ceiling_normal_map, GL_TEXTURE_2D);

	wall.add_texture("window_normal", window_normal_map, GL_TEXTURE_2D);
	wall.add_texture("window_color", window_color_map, GL_TEXTURE_2D);
	wall.add_texture("window_height", window_height_map, GL_TEXTURE_2D);
	wall.add_texture("window_opacity", window_opacity_map, GL_TEXTURE_2D);



	glm::mat4 wallTransform = wall.get_transform().GetMatrix();
	wallTransform = glm::rotate(wallTransform, -glm::radians(90.0f), glm::vec3(1.0f, 0.0f, 0.0f));

	glClearDepthf(1.0f);
	glClearColor(0.0f, 0.0f, 0.0f, 1.0f);
	glEnable(GL_DEPTH_TEST);
	glLineWidth(5);

	auto lastTime = std::chrono::high_resolution_clock::now();
	bool show_logs = true;
	bool show_gui = true;
	bool shader_reload_failed = false;
	bool show_basis = false;
	bool show_wireframe = false;
	float basis_thickness_scale = 0.5f;
	float basis_length_scale = 1.0f;
	float lightposX = 0.5f;
	float lightposY = 0.5f;
	float lightposZ = 0.5f;
	while (!glfwWindowShouldClose(window)) {
		auto const nowTime = std::chrono::high_resolution_clock::now();
		auto const deltaTimeUs = std::chrono::duration_cast<std::chrono::microseconds>(nowTime - lastTime);
		lastTime = nowTime;

		auto& io = ImGui::GetIO();
		inputHandler.SetUICapture(io.WantCaptureMouse, io.WantCaptureKeyboard);

		glfwPollEvents();
		inputHandler.Advance();
		mCamera.Update(deltaTimeUs, inputHandler);

		if (inputHandler.GetKeycodeState(GLFW_KEY_R) & JUST_PRESSED) {
			shader_reload_failed = !program_manager.ReloadAllPrograms();
			if (shader_reload_failed)
				tinyfd_notifyPopup("Shader Program Reload Error",
					"An error occurred while reloading shader programs; see the logs for details.\n"
					"Rendering is suspended until the issue is solved. Once fixed, just reload the shaders again.",
					"error");
		}
		if (inputHandler.GetKeycodeState(GLFW_KEY_F3) & JUST_RELEASED)
			show_logs = !show_logs;
		if (inputHandler.GetKeycodeState(GLFW_KEY_F2) & JUST_RELEASED)
			show_gui = !show_gui;
		if (inputHandler.GetKeycodeState(GLFW_KEY_F11) & JUST_RELEASED)
			mWindowManager.ToggleFullscreenStatusForWindow(window);
		if (inputHandler.GetKeycodeState(GLFW_KEY_F4) & JUST_RELEASED)
			show_wireframe = show_wireframe ? false : true;

		// Retrieve the actual framebuffer size: for HiDPI monitors,
		// you might end up with a framebuffer larger than what you
		// actually asked for. For example, if you ask for a 1920x1080
		// framebuffer, you might get a 3840x2160 one instead.
		// Also it might change as the user drags the window between
		// monitors with different DPIs, or if the fullscreen status is
		// being toggled.
		int framebuffer_width, framebuffer_height;
		glfwGetFramebufferSize(window, &framebuffer_width, &framebuffer_height);
		glViewport(0, 0, framebuffer_width, framebuffer_height);

		//
		// Todo: If you need to handle inputs, you can do it here
		//
		light_position = glm::vec3(lightposX, lightposY, lightposZ);
		camera_position = mCamera.mWorld.GetTranslation();
		mWindowManager.NewImGuiFrame();
		glClear(GL_DEPTH_BUFFER_BIT | GL_COLOR_BUFFER_BIT);

		if (!shader_reload_failed) {
			//
			// Todo: Render all your geometry here.
			//
			wall.render(mCamera.GetWorldToClipMatrix(), wallTransform);
		}

		if(show_wireframe) glPolygonMode( GL_FRONT_AND_BACK, GL_LINE );
		else glPolygonMode( GL_FRONT_AND_BACK, GL_FILL );

		//
		// Todo: If you want a custom ImGUI window, you can set it up
		//       here
		//
		bool const opened = ImGui::Begin("Scene Controls", nullptr, ImGuiWindowFlags_None);
		if (opened) {
			ImGui::Checkbox("Show basis", &show_basis);
			//ImGui::SliderFloat("Basis thickness scale", &basis_thickness_scale, 0.0f, 100.0f);
			//ImGui::SliderFloat("Basis length scale", &basis_length_scale, 0.0f, 100.0f);
			ImGui::SliderFloat("lightposX", &lightposX, 0.0f, 1.0f);
			ImGui::SliderFloat("lightposY", &lightposY, 0.0f, 1.0f);
			ImGui::SliderFloat("lightposZ", &lightposZ, 0.0f, 5.0f);
			ImGui::Checkbox("Use Parallax Occlusion Mapping", &use_POM);
			//ImGui::Checkbox("Use Hard Shadows", &use_hard);
			ImGui::Checkbox("Use Soft Shadows", &use_soft);
			ImGui::Checkbox("Use test textures", &use_test);
			ImGui::Checkbox("Hide window", &hide_window);
			ImGui::Checkbox("Use light scatter", &use_light_scatter);
		}
		ImGui::End();
		if (show_basis)
			bonobo::renderBasis(basis_thickness_scale, basis_length_scale, mCamera.GetWorldToClipMatrix());
		if (show_logs)
			Log::View::Render();
		mWindowManager.RenderImGuiFrame(show_gui);

		glfwSwapBuffers(window);
	}
}

int main()
{
	std::setlocale(LC_ALL, "");

	Bonobo framework;

	try {
		edaf80::Assignment5 assignment5(framework.GetWindowManager());
		assignment5.run();
	}
	catch (std::runtime_error const& e) {
		LogError(e.what());
	}
}

