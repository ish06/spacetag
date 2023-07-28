import { defs, tiny } from './common.js';
import {Body} from "./collision_util.js";
import {Text_Line} from "./text-demo.js";


const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

const {Textured_Phong, Cube, FiveCube, Cube_Single_Strip} = defs;

class Base_Scene extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        /*We need this from Simulation to "decouple the scene from the framerate"*/
        Object.assign(this, {time_accumulator: 0, time_scale: 1, t: 0, dt: 1 / 20, bodies: [], steps_taken: 0});

        this.hover = this.swarm = false;
        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        //TODO: Take all shapes, materials, and other utilities stuff and put it in it's own class for organization
        this.shapes = {
            cube: new Cube(),
            wingcube: new Cube(),
            fivecube: new FiveCube(),
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
            sphere1: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(1),
            sphere2: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(2),
            sphere4: new defs.Subdivision_Sphere(4),
            //Adding obstacles to the game
            obstacle: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(4),
            //Score Board Implementation
            scoreboard: new defs.Square(),
            scoreboard_text: new Text_Line(50),
        };
        this.shapes.sphere4.arrays.texture_coord.forEach(v => v.scale_by(5));
        this.shapes.wingcube.arrays.texture_coord.forEach(v => v.scale_by(10));

        //Keeping track of nice colors I find
        this.colors = {
            royal_blue: hex_color('#4169e1'),
            gold: hex_color("#fac116"),
            space_gray: hex_color("#C6C6C6"),
        };

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .6, color: hex_color("#ffffff") }),
            test: new Material(new defs.Phong_Shader(),
                { ambient: .4, diffusivity: .6, specularity: 0.5, color: hex_color("#ffffff") }),
            metallic_body: new Material(new Textured_Phong(), {
                color: hex_color('#b3b3b3'),
                ambient: 0.4, diffusivity: 0.6, specularity: 0.5,
                texture: new Texture("assets/plane_body.jpg", "NEAREST")
            }),
            metallic: new Material(new Textured_Phong(), {
                color: hex_color('#4169e1'),
                ambient: 0.4, diffusivity: 0.6, specularity: 0.5,
                texture: new Texture("assets/plane_body.jpg", "NEAREST")
            }),
            obstacle_mat: new Material(new Textured_Phong(), { 
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0.5, specularity: 0,
                texture: new Texture("assets/fire2.jpg", "NEAREST")
            }),
            background_texture_lb: new Material(new Texture_Scroll_LB(), {
                color: color(0,0,0,1),
                ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/space.jpg", "NEAREST")
            }),
            background_texture_tr: new Material(new Texture_Scroll_TR(), {
                color: color(0,0,0,1),
                ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/space.jpg", "NEAREST")
            }),
            background_texture_fb: new Material(new Texture_Scroll_FB(), {
                color: color(0,0,0,1),
                ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/space.jpg", "NEAREST")
            }),

            text_image: new Material(new defs.Textured_Phong(1), {
                ambient: 1, diffusivity: 0, specularity: 0,
                texture: new Texture("assets/text3.png")
            }),

            //Random Planet Material
            planet3_mat: new Material(new defs.Phong_Shader(),
                { specularity: 1, diffusivity: 1, color: hex_color("#b08040") }),

            ring: new Material(new Ring_Shader(),
            
                { ambient: 1, diffusivity: 0, color: hex_color("#b08040") }),
            
            sun_mat: new Material(new Textured_Phong(), {
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0, specularity: 0,
                texture: new Texture("assets/sun.png", "NEAREST")
            }),
        };
        //Keeping track of nice colors I find
        this.colors = {
            royal_blue: hex_color('#4169e1'),
            gold: hex_color("#fac116")
        };
        this.once = false;
        this.max_tb = 15;
        this.max_lr = 15;
        
    }
    simulate (frame_time) {
        // This line gives ourselves a way to trick the simulator into thinking
        // that the display framerate is running fast or slow:
        frame_time = this.time_scale * frame_time;

        // Avoid the spiral of death; limit the amount of time we will spend
        // computing during this timestep if display lags:
        this.time_accumulator += Math.min(frame_time, 0.1);
        // Repeatedly step the simulation until we're caught up with this frame:
        while (Math.abs(this.time_accumulator) >= this.dt) {
            // Single step of the simulation for all bodies:
            this.update_state(this.dt);
            for (let b of this.bodies)
                b.advance(this.dt);
            // Following the advice of the article, de-couple
            // our simulation time from our frame rate:
            this.t += Math.sign(frame_time) * this.dt;
            this.time_accumulator -= Math.sign(frame_time) * this.dt;
            this.steps_taken++;
        }
        // Store an interpolation factor for how close our frame fell in between
        // the two latest simulation time steps, so we can correctly blend the
        // two latest states and display the result.
        let alpha = this.time_accumulator / this.dt;
        for (let b of this.bodies) {
            b.blend_state(alpha);
        }
    }

    display(context, program_state) {
        // display():  Called once per frame of animation. Here, the base class's display only does
        // some initial setup.

        //This is from the Simulation class in examples/collision-demo.js
        if (program_state.animate) {
            this.simulate(program_state.animation_delta_time);
        }
        // Draw each shape at its current location:

        //This is setting up the camera and state
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!this.once) {
            //this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.look_at(vec3(0, 20, 30), vec3(0, 0, 0), vec3(0, 1, 0)));
            this.once = true;
        }
        
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 0.1, 1000);
        // set light
        const light_position = vec4(0, 5, 5, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];
    }
    update_state(dt)      // update_state(): Your subclass of Simulation has to override this abstract function.
    {
        throw "Override this"
    }
}

export class SpaceTag extends Base_Scene {

    constructor() {
        //Most of the main parts we will need, like the shapes and Materials, will be in Base_Scene
        super();
        this.colliders = [
            {intersect_test: Body.intersect_sphere, points: new defs.Subdivision_Sphere(1), leeway: .5},
            {intersect_test: Body.intersect_sphere, points: new defs.Subdivision_Sphere(2), leeway: .3},
            {intersect_test: Body.intersect_cube, points: new defs.Cube(), leeway: .1}
        ];

        //Airplane Assignments (condensed)
        Object.assign(this, {
            body_transform: Mat4.identity(),
            wing_transform: Mat4.identity(),
            airplane_speed: vec3(0,0,0),
            bank_angle: 0,
            }
        );
        //this.tail_transform = this.body_transform.times(Mat4.translation(-3,1,0)),
        //Obstacles Assignments (condensed)
        Object.assign(this, {
            min:-20,
            max:20,
            }
        );

        //varaible to help with scoreboard implementation
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.initAirplane();
    }
    reset_game(){
        Object.assign(this, {time_accumulator: 0, time_scale: 1, t: 0, dt: 1 / 20, bodies: [], steps_taken: 0});
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.initAirplane();
    }
    make_control_panel() {
        this.key_triggered_button("Hover", ["e"], () => {
            this.updateAirplane(0,0);
        });
        this.key_triggered_button("Left ", ["ArrowLeft"], () => {
            this.updateAirplane(0,-1);
        });
        this.key_triggered_button("Right ", ["ArrowRight"], () => {
            this.updateAirplane(0,1);
        });
        this.new_line();
        this.key_triggered_button("Up", ["ArrowUp"], () => {
            this.updateAirplane(1,0);
        });
        this.key_triggered_button("Down", ["ArrowDown"], () => {
            this.updateAirplane(-1,0);
        });
        this.key_triggered_button("Continue", ["x"], () => {
            if(this.gameOver){
                this.reset_game();
            }
        });
    }
    drawBackground(context, program_state){
        const tunnel_width = 30;
        const tunnel_height = 30;
        const tunnel_length = 450;

        let identity = Mat4.identity();
        let background_left = identity;
        let background_right = identity;
        let background_top = identity;
        let background_bottom = identity;
        let background_front = identity;

        // x: length, y: height (- is up, + is down), z: width (- is left, + is right)
        background_left = background_left.times(Mat4.translation(0,0,-tunnel_width)).times(Mat4.scale(tunnel_length,tunnel_height,0.1));
        background_bottom = background_bottom.times(Mat4.translation(0,-tunnel_height,0)).times(Mat4.scale(tunnel_length,0,tunnel_width));
        this.shapes.cube.draw(context, program_state, background_left, this.materials.background_texture_lb);
        this.shapes.cube.draw(context, program_state, background_bottom, this.materials.background_texture_lb);

        background_right = background_right.times(Mat4.translation(0,0,tunnel_width)).times(Mat4.scale(tunnel_length,tunnel_height,0.1));
        background_top = background_top.times(Mat4.translation(0,tunnel_height,0)).times(Mat4.scale(tunnel_length,0,tunnel_width));
        this.shapes.cube.draw(context, program_state, background_right, this.materials.background_texture_tr);
        this.shapes.cube.draw(context, program_state, background_top, this.materials.background_texture_lb);

        background_front = background_front.times(Mat4.translation(tunnel_length,0,0)).times(Mat4.scale(0,tunnel_height,tunnel_width));
        this.shapes.cube.draw(context, program_state, background_front, this.materials.sun_mat);
    }

    initAirplane(){
        //Body(shape,material,vec3 size, str name).emplace(Mat4 location_mat, vec3 linear_vel, double angle_vel, vec3 spin_axis_optional)
        //Set up the Fuselage
        let omega = 1;
        let fuselage_size = vec3(5,2,1.8);
        let wing_size = vec3(1.5,0.2,6);
        let tail_size = vec3(1,3,0.2);
        let prop_size = vec3(0.2,3,0.2);

        let fuselage_xyz = vec3(0,0,0);
        let tail_xyz = vec3(-3,1,0);
        let wing_xyz = vec3(0,0,0);
        let prop_xyz = vec3(4,0,0)

        //Fuselage
        this.bodies.push(new Body(this.shapes.sphere4, this.materials.metallic_body, fuselage_size, "airplane")
            .emplace(Mat4.translation(fuselage_xyz[0], fuselage_xyz[1], fuselage_xyz[2]), this.airplane_speed, 0));
        //Tail
        this.bodies.push(new Body(this.shapes.wingcube, this.materials.metallic, tail_size, "airplane_tail")
            .emplace(Mat4.translation(tail_xyz[0], tail_xyz[1], tail_xyz[2]), this.airplane_speed, 0));
        //Wing1
        this.bodies.push(new Body(this.shapes.wingcube, this.materials.metallic, wing_size, "airplane_top_wing")
            .emplace(Mat4.translation(wing_xyz[0], wing_xyz[1]+1, wing_xyz[2]), this.airplane_speed, 0));
        //Wing2
        this.bodies.push(new Body(this.shapes.wingcube, this.materials.metallic, wing_size, "airplane_bottom_wing")
            .emplace(Mat4.translation(wing_xyz[0], wing_xyz[1]-1, wing_xyz[2]), this.airplane_speed, 0));
        //Prop
        this.bodies.push(new Body(this.shapes.wingcube, this.materials.metallic, prop_size, "airplane")
            .emplace(Mat4.translation(prop_xyz[0], prop_xyz[1], prop_xyz[2]), this.airplane_speed, omega,vec3(1,0,0)));
    }

    updateAirplane(yv=0,zv=0){
        for(let a of this.bodies){
            if(a.name !=="airplane" && a.name !== "airplane_bottom_wing" && a.name !== "airplane_top_wing" && a.name !== "airplane_tail"){
                break;
            }
            a.linear_velocity = vec3(0,yv,zv);
        }
    }
    checkCollisionWithWall(){
        for(let b of this.bodies){
            if(b.name.includes("airplane")){
                if (b.center[2] < -this.max_lr || b.center[2] > this.max_lr) { // left and right boundaries
                    let curr_updown = b.linear_velocity[1];
                    b.linear_velocity = vec3(0,curr_updown,0);
                    if (b.center[2] < -this.max_lr) {
                        b.center[2] = -this.max_lr;
                    }
                    else {
                        b.center[2] = this.max_lr;
                    }
                }
        
                if (b.name==="airplane_bottom_wing") {
                    if (b.center[1] < (-this.max_tb + 2) || b.center[1] > (this.max_tb - 4)) { // top and bottom boundaries
                        let curr_leftright = b.linear_velocity[2];
                        b.linear_velocity = vec3(0,0,curr_leftright);
        
                        if (b.center[1] < (-this.max_tb + 2)) {
                            b.center[1] = -this.max_tb + 2;
                        }
                        else {
                            b.center[1] = this.max_tb - 4;
                        }
                    }
                }
                else if (b.name==="airplane_top_wing" || b.name==="airplane_tail") {
                    if (b.center[1] < (-this.max_tb + 4) || b.center[1] > (this.max_tb - 2)) { // top and bottom boundaries
                        let curr_leftright = b.linear_velocity[2];
                        b.linear_velocity = vec3(0,0,curr_leftright);
        
                        if (b.center[1] < (-this.max_tb + 4)) {
                            b.center[1] = -this.max_tb + 4;
                        }
                        else {
                            b.center[1] = this.max_tb - 2;
                        }
                    }
                }
                else { // check if airplane is within bounds
                    if (b.center[1] < (-this.max_tb + 3) || b.center[1] > (this.max_tb - 3)) { // top and bottom boundaries
                        let curr_leftright = b.linear_velocity[2];
                        b.linear_velocity = vec3(0,0,curr_leftright);
        
                        if (b.center[1] < (-this.max_tb + 3)) {
                            b.center[1] = -this.max_tb + 3;
                        }
                        else {
                            b.center[1] = this.max_tb - 3;
                        }
                    }
                }
            }
        }
    }

    updateObstacles(){
        //Body(shape,material,vec3 size, str name).emplace(Mat4 location_mat, vec3 linear_vel, double angle_vel, vec3 spin_axis_optional)
        //there will always be 10 meteors on screen
        while (this.bodies.length < 15) {
            let x = 150 + Math.random()*50;
            let y = Math.random()*(this.max - this.min) + this.min; //range between -15 and 15
            let z = Math.random()*(this.max - this.min) + this.min; //range between -15 and 15
            let omega = Math.random()*0.5; //angular velocity

            //Body constructor followed by "emplace" to place the body and give it velocity
            let name = (Math.random()*10000000).toString();
            this.bodies.push(new Body(this.shapes.obstacle, this.materials.obstacle_mat, vec3(2, 2, 2),name)
                .emplace(Mat4.translation(x, y, z), vec3(-1 * Math.min(2*Math.sqrt(this.score) + 2, 15) , 0, 0), omega));
        }
        this.bodies = this.bodies.filter(b => b.center[0] > -25);
    }

    drawScoreboard(context, program_state) {
        let score_text = ("Light Years:").concat(Math.floor(this.score).toString());
        this.shapes.scoreboard_text.set_string(score_text, context.context);

        let scoreboard_text_transform = Mat4.identity();
        scoreboard_text_transform = scoreboard_text_transform
            .times(Mat4.translation(-5,-10,-27))
            .times(Mat4.rotation(Math.PI*3/2, 0, 1, 0)).times(Mat4.rotation(-Math.PI*1/24, 1, 0, 0))

            .times(Mat4.scale(1,1,0.1))
        this.shapes.scoreboard_text.draw(context, program_state, scoreboard_text_transform, this.materials.text_image);
    }

    drawLives(context, program_state){
        let score_text = "Lives:";
        for(let i = 0; i<this.lives; i++){
            score_text = score_text.concat("¥"); //Yen is actually an alias for the heart
        }
        this.shapes.scoreboard_text.set_string(score_text, context.context);

        let scoreboard_text_transform = Mat4.identity();
        scoreboard_text_transform = scoreboard_text_transform
            .times(Mat4.translation(-5,-10,14))
            .times(Mat4.rotation(Math.PI*3/2, 0, 1, 0)).times(Mat4.rotation(-Math.PI*1/24, 1, 0, 0))
            .times(Mat4.scale(1,1,0.1))
        this.shapes.scoreboard_text.draw(context, program_state, scoreboard_text_transform, this.materials.text_image);
    }
    drawGameOver(context, program_state){
        let fire = "£"
        let score_text = "£ Your Ship Crashed £";

        this.shapes.scoreboard_text.set_string(score_text, context.context);

        let scoreboard_text_transform = Mat4.identity();
        scoreboard_text_transform = scoreboard_text_transform
            .times(Mat4.translation(-5,5,-15))
            .times(Mat4.rotation(Math.PI*3/2, 0, 1, 0)).times(Mat4.rotation(-Math.PI*1/24, 1, 0, 0))
            .times(Mat4.scale(1,1,0.1))
        this.shapes.scoreboard_text.draw(context, program_state, scoreboard_text_transform, this.materials.text_image);

        scoreboard_text_transform = Mat4.identity();
        scoreboard_text_transform = scoreboard_text_transform
            .times(Mat4.translation(-4,0,-4))
            .times(Mat4.rotation(Math.PI*3/2, 0, 1, 0)).times(Mat4.rotation(-Math.PI*1/24, 1, 0, 0))
            .times(Mat4.scale(0.75,0.75,0.1))
        this.shapes.scoreboard_text.set_string("Score: ".concat(Math.floor(this.score.toString())), context.context);
        this.shapes.scoreboard_text.draw(context, program_state, scoreboard_text_transform, this.materials.text_image);

        scoreboard_text_transform = Mat4.identity();
        scoreboard_text_transform = scoreboard_text_transform
            .times(Mat4.translation(-4,-5,-11))
            .times(Mat4.rotation(Math.PI*3/2, 0, 1, 0)).times(Mat4.rotation(-Math.PI*1/24, 1, 0, 0))
            .times(Mat4.scale(0.75,0.75,0.1))
        this.shapes.scoreboard_text.set_string("Press X to Try Again", context.context);
        this.shapes.scoreboard_text.draw(context, program_state, scoreboard_text_transform, this.materials.text_image);
    }

    display(context, program_state) {
        super.display(context, program_state);

        // set camera behind plane
        let desired = Mat4.inverse(this.body_transform.times(Mat4.rotation(Math.PI * 1.5, 0, 1, 0))
            .times(Mat4.rotation(-Math.PI / 24, 1, 0, 0))
            .times(Mat4.translation(0, 3, 45)));
        program_state.camera_inverse = desired.map((x, i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1));
        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));

        if(this.gameOver){
            this.drawGameOver(context, program_state);
            return;
        }
        //drawing obstacles (should change from draw to "update" since all obstacles should be drawn in update_state?
        this.drawBackground(context, program_state);
        // Draw each shape at its current location: (should be in update_state)
        for(let b of this.bodies){
            b.shape.draw(context, program_state, b.drawn_location, b.material);
        }
        this.drawScoreboard(context, program_state)
        this.drawLives(context, program_state)
    }
    update_state(dt) {
        //this.updateAirplane(context, program_state);
        if(this.gameOver){
            return;
        }
        const collider = this.colliders[2];
        this.score = this.score + dt/50;
        this.updateObstacles();
        this.checkCollisionWithWall();
        for(let a of this.bodies){
            a.inverse = Mat4.inverse(a.drawn_location);
            for(let b of this.bodies){
                if (a.check_if_colliding(b, collider) && !a.name.includes("airplane") && b.name.includes("airplane")){
                    this.bodies = this.bodies.filter(c => c.name!==a.name);
                    this.lives -= 1;
                }
            }
        }
        if(this.lives <= 0){
            this.gameOver = true;
        }
    }
}

class Texture_Scroll_LB extends Textured_Phong {
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                vec2 offset = vec2(mod(animation_time * -0.1, 2.0) , 0.0);
                vec2 trans_tex_coord = f_tex_coord - offset;

                vec4 tex_color = texture2D(texture, trans_tex_coord);

                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:

                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}

class Texture_Scroll_TR extends Textured_Phong {
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                vec2 offset = vec2(mod(animation_time * 0.1, 2.0) , 0.0);
                vec2 trans_tex_coord = f_tex_coord - offset;

                vec4 tex_color = texture2D(texture, trans_tex_coord);

                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:

                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}

class Texture_Scroll_FB extends Textured_Phong {
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                float rot = -3.14159 * 0.01 * mod(animation_time, 25.0);
                mat2 m = mat2(cos(rot), sin(rot), -sin(rot), cos(rot));
                vec2 rot_tex_coord = m * (f_tex_coord.xy - 0.5) + 0.5; // + and - 0.5 is to shift rotation axis to middle

                vec4 tex_color = texture2D(texture, rot_tex_coord);

                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:

                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}
//Added this for random planets
class Ring_Shader extends Textured_Phong {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));

        context.uniform4fv(gpu_addresses.shape_color, material.color);
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        uniform vec4 shape_color;
        varying  vec4 position_OCS;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        void main(){
          gl_Position = projection_camera_model_transform * vec4( position, 1.0 );  
          position_OCS = vec4( position, 1.0 );  
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        return this.shared_glsl_code() + `
        void main(){

          float distance = sqrt((pow(position_OCS.x, 2.0) + pow(position_OCS.y, 2.0)));
          float factor = sin(distance * 50.0);
          //vec4 mixed_color = factor * shape_color + (1.0 - factor) * shape_color;
          vec4 temp_color = shape_color;
          temp_color.w = factor;
          gl_FragColor = temp_color;
        }`;
    }
}

