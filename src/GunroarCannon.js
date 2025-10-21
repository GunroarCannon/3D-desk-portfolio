console.log("Loading GunroarCannon classes and functions")
import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

class SimpleFPSControls {
    
  constructor(camera, domElement, engine=null) {
      this.camera = camera;
      this.domElement = domElement;
      this.isDragging = false;

      this.engine = engine;
      
      // Adjustable values
      this.sensitivity = 0.01;    // Mouse/touch sensitivity
      this.keySensitivity = 2; // speed for keyboard rotation
      this.maxPitch = Math.PI / 3; // 60 degrees up/down
      this.minPitch = -Math.PI / 3; // 60 degrees up/down
      this.maxYaw = Math.PI / 2;   // 90 degrees left/right ← ADD THIS
      this.minYaw = -Math.PI / 2;  // 90 degrees left/right ← ADD THIS
      
      this.pitch = 0; // Vertical rotation
      this.yaw = 0;   // Horizontal rotation

      this.keys = {};
      
      this.init();
      this.shiftPressed = false;
  }
  
  init() {
          
      document.addEventListener('keydown', this.onKeyDown.bind(this));
      document.addEventListener('keyup', this.onKeyUp.bind(this));
      

      // Mouse events for PC
      //this.domElement
      document.addEventListener('mousedown', this.onMouseDown.bind(this));
      document.addEventListener('mousemove', this.onMouseMove.bind(this));
      document.addEventListener('mouseup', this.onMouseUp.bind(this));
      
      // Touch events for mobile
      this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
      document.addEventListener('touchmove', this.onTouchMove.bind(this),{passive:false});
      document.addEventListener('touchend', this.onTouchEnd.bind(this), {passive: false});
      
      // Prevent context menu
      this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
      
      this.domElement.style.cursor = 'grab';
  }

  onKeyDown(e) {
      this.keys[e.key.toLowerCase()] = true
      if (e.key === 'Shift' || e.keyCode === 16) {
          this.shiftPressed = true;
          // Temporarily disable pointer events on HTML elements when Shift is held
          document.querySelectorAll('.interactive-panel, iframe').forEach(el => {
              el.style.pointerEvents = 'none';
          });
      }
      
      this.updateCamera();
  }

  onKeyUp(e) {
      this.keys[e.key.toLowerCase()] = false;
      if (e.key === 'Shift' || e.keyCode === 16) {
          this.shiftPressed = false;
          // Re-enable pointer events on HTML elements
          document.querySelectorAll('.interactive-panel, iframe').forEach(el => {
              el.style.pointerEvents = 'auto';
          });
      }
  }
  
  onMouseDown(e) {
    if (this.engine.selectedBody) return;
      if (this.shiftPressed||true) {
          this.isDragging = true;
          this.domElement.style.cursor = 'grabbing'; 
          document.querySelectorAll('.interactive-panel, iframe').forEach(el => {
              el.style.pointerEvents = 'none';
          });
      }
  }
  
  onMouseMove(e) {
    if (this.engine.selectedBody) return;
      if (!this.isDragging) return;
      
      this.yaw -= e.movementX * this.sensitivity;
      this.pitch -= e.movementY * this.sensitivity;
      
      // Constrain vertical look
      this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
      
      this.updateCamera();
  }
  
  onMouseUp() {
    if (this.engine.selectedBody) return;
      this.isDragging = false;
      this.domElement.style.cursor = 'grab';
      
          document.querySelectorAll('.interactive-panel, iframe').forEach(el => {
              el.style.pointerEvents = 'auto';
          });
  }
  
  onTouchStart(e) {
    if (this.engine.selectedBody) return;
      this.isDragging = true;
      this.lastTouchX = e.touches[0].clientX;
      this.lastTouchY = e.touches[0].clientY;
      e.preventDefault();
  }
  
  onTouchMove(e) {
    if (this.engine.selectedBody) return;
      if (!this.isDragging) return;
      
      const deltaX = e.touches[0].clientX - this.lastTouchX;
      const deltaY = e.touches[0].clientY - this.lastTouchY;
      
      this.yaw -= deltaX * this.sensitivity;
      this.pitch -= deltaY * this.sensitivity;
      
      // Constrain vertical look
      this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
      
      this.lastTouchX = e.touches[0].clientX;
      this.lastTouchY = e.touches[0].clientY;
      this.updateCamera();
      e.preventDefault();
  }
  
  onTouchEnd() {
      this.isDragging = false;
  }

  updateCamera() {
    if (this.engine.selectedBody) return;
    // Apply keyboard input
    if (this.keys['arrowup'] || this.keys['w']) this.pitch += this.keySensitivity * 0.01;
    if (this.keys['arrowdown'] || this.keys['s']) this.pitch -= this.keySensitivity * 0.01;
    if (this.keys['arrowleft'] || this.keys['a']) this.yaw += this.keySensitivity * 0.01;
    if (this.keys['arrowright'] || this.keys['d']) this.yaw -= this.keySensitivity * 0.01;

    // Clamp rotations
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
    this.yaw = Math.max(this.minYaw, Math.min(this.maxYaw, this.yaw));

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }
  update(deltaTime=1/60) {
    if (this.engine.selectedBody||true) return;
    // deltaTime is in seconds, usually passed from your render loop
    const speed = -this.keySensitivity; // units per second
    let moveX = 0, moveY = 0;

    if (this.keys['arrowup'] || this.keys['w']) moveY = -1;
    if (this.keys['arrowdown'] || this.keys['s']) moveY = 1;
    if (this.keys['arrowleft'] || this.keys['a']) moveX = -1;
    if (this.keys['arrowright'] || this.keys['d']) moveX = 1;

    // Apply rotation smoothly
    this.yaw += moveX * speed * deltaTime;
    this.pitch += moveY * speed * deltaTime;

    // Clamp rotations
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
    this.yaw = Math.max(this.minYaw, Math.min(this.maxYaw, this.yaw));

    // Apply to camera
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
}

}

class GunroarMesh {
  constructor(engine, type, options) {
    this.engine = engine;
    this.id = Math.random().toString(36).substr(2, 9);
    this.type = type;
    this.isLoadedModel = type === 'loaded';

    this._options = options||{};
    
    if (options.customMesh) {
      // Use provided custom mesh (from loaded model)
      this.mesh = options.customMesh;
      this.mesh.name = options.name || `mesh_${this.id}`;
      console.log("custom mesh",this.mesh.name)
    } else {
      // Create primitive mesh
      this.mesh = this._createThreeMesh(type, options);
    }
    
    this.engine.scene.add(this.mesh);
    
    // Create physics body if requested
    if (options.physics && this.engine.withPhysics) {
      this.physicsBody = this._createPhysicsBody(type, options);
      this.engine.world.addBody(this.physicsBody);
        
      this.physicsBody.object = this;
    }
    
    // Store animations if available
    if (this.mesh.userData.animations) {
      this.animations = this.mesh.userData.animations;
      this.mixer = this.mesh.userData.mixer;
    }
    
  }

  _createThreeMesh(type, options) {
    let geometry;
    
    switch(type) {
      case 'box':
        geometry = new THREE.BoxGeometry(...(options.size || [1, 1, 1]));
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(options.radius || 1);
        break;
      case 'buffer':
        geometry = new THREE.BufferGeometry();
        const vertices =new Float32Array(options.vertices);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex([0,1, 2, 2,3, 0])
        geometry.computeVertexNormals();

      case 'cylinder':
        geometry = new THREE.CylinderGeometry(
          options.radiusTop || 1, 
          options.radiusBottom || 1, 
          options.height || 1
        );
        break;
    }

    const material = options.material || new THREE.MeshStandardMaterial({ 
      color: options.color || 0x00ff00 
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    if (options.position) {
      mesh.position.set(...options.position);
    }
    
    return mesh;
  }

  _createPhysicsBody(type, options) {
    let shape;
    let body;
    
    switch(type) {
      case 'box':
        const halfExtents = options.size ? 
          new CANNON.Vec3(options.size[0]/2, options.size[1]/2, options.size[2]/2) :
          new CANNON.Vec3(0.5, 0.5, 0.5);
        shape = new CANNON.Box(halfExtents);
        break;
      case 'sphere':
        shape = new CANNON.Sphere(options.radius || 1);
        break;
    }

    body = new CANNON.Body({
      mass: options.mass || 1,
      position: options.position ? 
        new CANNON.Vec3(...options.position) : 
        new CANNON.Vec3(0, 0, 0)
    });
    console.error("mass", body.mass)
    body.obj = this;
    body.addShape(shape);
    return body;
  }

  setPosition(position) {
    try {
      this.mesh.position.set(...position);

    } catch(error){
      this.mesh.position.set(position.x, position.y, position.z);
    }
    if (this.physicsBody) {
      this.physicsBody.position.set(...position);
    }
  }

  applyForce(force, worldPoint) {
    if (this.physicsBody) {
      const cannonForce = new CANNON.Vec3(...force);
      const cannonPoint = worldPoint ? new CANNON.Vec3(...worldPoint) : this.physicsBody.position;
      this.physicsBody.applyForce(cannonForce, cannonPoint);
    }
  }

  
  // Getter methods
  getPosition() {
    return {
      x: this.mesh.position.x,
      y: this.mesh.position.y,
      z: this.mesh.position.z,
      array: [this.mesh.position.x, this.mesh.position.y, this.mesh.position.z]
    };
  }

  getRotation() {
    return {
      x: this.mesh.rotation.x,
      y: this.mesh.rotation.y,
      z: this.mesh.rotation.z,
      array: [this.mesh.rotation.x, this.mesh.rotation.y, this.mesh.rotation.z]
    };
  }

  getScale() {
    return {
      x: this.mesh.scale.x,
      y: this.mesh.scale.y,
      z: this.mesh.scale.z,
      array: [this.mesh.scale.x, this.mesh.scale.y, this.mesh.scale.z]
    };
  }

  getQuaternion() {
    return this.mesh.quaternion.clone();
  }

  getWorldPosition() {
    const position = new THREE.Vector3();
    this.mesh.getWorldPosition(position);
    return {
      x: position.x,
      y: position.y,
      z: position.z,
      array: [position.x, position.y, position.z]
    };
  }

  getWorldRotation() {
    const rotation = new THREE.Euler();
    this.mesh.getWorldRotation(rotation);
    return {
      x: rotation.x,
      y: rotation.y,
      z: rotation.z,
      array: [rotation.x, rotation.y, rotation.z]
    };
  }

  // Setter methods with physics sync
  setRotation(rotation) {
    if (Array.isArray(rotation)) {
      this.mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    } else {
      this.mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    }
    
    if (this.physicsBody) {
      this.physicsBody.quaternion.setFromEuler(
        this.mesh.rotation.x,
        this.mesh.rotation.y,
        this.mesh.rotation.z
      );
    }
  }

  setScale(scale) {
    if (Array.isArray(scale)) {
      this.mesh.scale.set(scale[0], scale[1], scale[2]);
    } else {
      this.mesh.scale.set(scale.x, scale.y, scale.z);
    }
    // Note: Physics bodies typically don't support scale changes easily
  }

  // Movement helpers
  translate(translation) {
    if (Array.isArray(translation)) {
      this.mesh.translateX(translation[0]);
      this.mesh.translateY(translation[1]);
      this.mesh.translateZ(translation[2]);
    } else {
      this.mesh.translateX(translation.x);
      this.mesh.translateY(translation.y);
      this.mesh.translateZ(translation.z);
    }
    
    if (this.physicsBody) {
      this.physicsBody.position.copy(this.mesh.position);
    }
  }

  rotate(rotation) {
    if (Array.isArray(rotation)) {
      this.mesh.rotateX(rotation[0]);
      this.mesh.rotateY(rotation[1]);
      this.mesh.rotateZ(rotation[2]);
    } else {
      this.mesh.rotateX(rotation.x);
      this.mesh.rotateY(rotation.y);
      this.mesh.rotateZ(rotation.z);
    }
    
    if (this.physicsBody) {
      this.physicsBody.quaternion.copy(this.mesh.quaternion);
    }
  }

  getDimensions() {
    const box = new THREE.Box3().setFromObject(this.mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    return { width: size.x, height: size.y, depth: size.z };
  }

  // Animation methods for loaded models
  playAnimation(name, options = {}) {
    if (!this.mixer || !this.animations) {
      console.warn('No animations available for this mesh');
      return;
    }
    
    const clip = THREE.AnimationClip.findByName(this.animations, name);
    if (!clip) {
      console.warn(`Animation "${name}" not found`);
      return;
    }
    
    const action = this.mixer.clipAction(clip);
    
    if (options.fadeOut) {
      this.mixer.stopAllAction();
    }
    
    action.reset();
    action.setLoop(options.loop || THREE.LoopRepeat, options.loopCount);
    action.clampWhenFinished = options.clampWhenFinished || true;
    action.timeScale = options.speed || 1;
    action.fadeIn(options.fadeIn || 0.5);
    action.play();
    
    return action;
  }

  stopAllAnimations() {
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
  }

  updateAnimations(deltaTime) {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }

  // Enhanced physics for complex meshes
  enablePhysics(options=null) {
    options = options || this._options;
    if (!this.engine.withPhysics) {
      console.warn('Physics not enabled in engine');
      return;
    }
    
    if (this.physicsBody) {
      console.warn('Physics already enabled for this mesh');
      return;
    }
    
    const physicsOptions = {
      mass: options.mass || this._options.mass || 1,
      position: this.mesh.position,
      ...options
    };
    console.error("nabling ph")
    
    // For complex loaded models, use bounding box for physics shape
    if (this.isLoadedModel) {
      const box = new THREE.Box3().setFromObject(this.mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      
      const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
      const shape = new CANNON.Box(halfExtents);
      
      this.physicsBody = new CANNON.Body(physicsOptions);
      this.physicsBody.addShape(shape);
    } else {
      this.physicsBody = this._createPhysicsBody(this.type, physicsOptions);
    }
    
    this.engine.world.addBody(this.physicsBody);
    this.physicsBody.object = this;
  }

  disablePhysics() {
    if (this.physicsBody) {
      this.engine.world.removeBody(this.physicsBody);
      //this.physicsBody = null;
    }
  }
}

class GunroarCannon {
  constructor(config = {}) {
    this.canvas = config.canvas;
    this.physicsPaused = false;
    this.withPhysics = config.withPhysics || false;
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer(this.canvas && { canvas: this.canvas }||{antialias:true});
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    document.body.appendChild(this.renderer.domElement);
    console.log("renderer dom added")
        
    //this.camera.position.set(0,0,5);
    this._setupDefaultLighting();

    if (this.withPhysics) {
      this.world = new CANNON.World();
      this.world.gravity.set(0, -9.82*0.1, 0);
    }
    
    this.controls = null;
    this.objects = new Map();
    this.animate();
  }


  _setupDefaultLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    // Directional light for shadows and highlights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    
    // Optional: Add a hemisphere light for more natural lighting
    const hemisphereLight = new THREE.HemisphereLight(0x443333, 0x111122, 0.3);
    this.scene.add(hemisphereLight);
  }

  // Light management methods
  addLight(type, options = {}) {
    let light;
    
    switch(type) {
      case 'ambient':
        light = new THREE.AmbientLight(
          options.color || 0x404040, 
          options.intensity || 0.6
        );
        break;
        
      case 'directional':
        light = new THREE.DirectionalLight(
          options.color || 0xffffff, 
          options.intensity || 0.8
        );
        if (options.position) {
          light.position.set(...options.position);
        }
        light.castShadow = options.castShadow !== false;
        break;
        
      case 'point':
        light = new THREE.PointLight(
          options.color || 0xffffff, 
          options.intensity || 1,
          options.distance || 0,
          options.decay || 2
        );
        if (options.position) {
          light.position.set(...options.position);
        }
        break;
        
      case 'spot':
        light = new THREE.SpotLight(
          options.color || 0xffffff,
          options.intensity || 1,
          options.distance || 0,
          options.angle || Math.PI / 3,
          options.penumbra || 0,
          options.decay || 2
        );
        if (options.position) {
          light.position.set(...options.position);
        }
        if (options.target) {
          light.target.position.set(...options.target);
          this.scene.add(light.target);
        }
        break;
        
      case 'hemisphere':
        light = new THREE.HemisphereLight(
          options.skyColor || 0x443333,
          options.groundColor || 0x111122,
          options.intensity || 0.3
        );
        break;
    }
    
    this.scene.add(light);
    return light;
  }

  removeLight(light) {
    this.scene.remove(light);
    if (light.target) {
      this.scene.remove(light.target);
    }
  }

  addBox(options = {}) {
    return this._createMesh('box', options);
  }

  addBuffer(options = {}) {
    return this._createMesh('buffer', options)
  }

  addSphere(options = {}) {
    return this._createMesh('sphere', options);
  }

  addCylinder(options = {}) {
    return this._createMesh('cylinder', options);
  }

  _createMesh(type, options) {
    const meshObject = new GunroarMesh(this, type, options);
    this.objects.set(meshObject.id, meshObject);
    return meshObject;
  }

  addControls(type = "orbit") {
    this.removeControls();
    
    switch(type) {
      case "orbit":
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        break;
      case "firstPerson":
        this.controls = new SimpleFPSControls(this.camera, this.renderer.domElement, this)
        // First-person controls implementation
        break;
    }
  }

  removeControls() {
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
  }

   moveCameraToMeshObject(meshObject, options = {}) {
    const position = meshObject.getWorldPosition();
    const offset = options.offset || [0, 2, 5]; // Default offset: above and behind
    
    this.camera.position.set(
      position.x + offset[0],
      position.y + offset[1],
      position.z + offset[2]
    );
    
    // Look at the object
    if (options.lookAt !== false) {
      this.camera.lookAt(position.x, position.y, position.z);
    }
    
    // Update controls target if they exist
    if (this.controls && this.controls.target) {
      this.controls.target.set(position.x, position.y, position.z);
      this.controls.update();
    }
  }

  setCameraPosition(position) {
    if (Array.isArray(position)) {
      this.camera.position.set(position[0], position[1], position[2]);
    } else {
      this.camera.position.set(position.x, position.y, position.z);
    }
    
    if (this.controls) {
      this.controls.update();
    }
  }

  setCameraTarget(target) {
    if (Array.isArray(target)) {
      this.camera.lookAt(target[0], target[1], target[2]);
    } else {
      this.camera.lookAt(target.x, target.y, target.z);
    }
    
    if (this.controls && this.controls.target) {
      if (Array.isArray(target)) {
        this.controls.target.set(target[0], target[1], target[2]);
      } else {
        this.controls.target.set(target.x, target.y, target.z);
      }
      this.controls.update();
    }
  }

  getCameraPosition() {
    return {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
      array: [this.camera.position.x, this.camera.position.y, this.camera.position.z]
    };
  }

  // Animation helpers
  animateCameraToMeshObject(meshObject, duration = 1000, options = {}) {
    const targetPosition = meshObject.getWorldPosition();
    const offset = options.offset || [0, 2, 5];
    const finalPosition = {
      x: targetPosition.x + offset[0],
      y: targetPosition.y + offset[1],
      z: targetPosition.z + offset[2]
    };

    const startPosition = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    };

    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function
      const ease = this._getEasingFunction(options.easing || "linear"); // Quadratic ease out

      this.camera.position.x = startPosition.x + (finalPosition.x - startPosition.x) * ease(progress);
      this.camera.position.y = startPosition.y + (finalPosition.y - startPosition.y) * ease(progress);
      this.camera.position.z = startPosition.z + (finalPosition.z - startPosition.z) * ease(progress);

      if (options.lookAt !== false) {
        this.camera.lookAt(targetPosition.x, targetPosition.y, targetPosition.z);
      }

      if (this.controls) {
        this.controls.update();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  updatePhysics(delta) {
    
    if (this.physicsPaused) return;
    // Update physics
    if (this.withPhysics) {
      this.world.step(1/60, delta, 3);
      
      // Sync physics bodies with meshes
      this.objects.forEach(obj => {
        if (obj.physicsBody) {
          obj.mesh.position.copy(obj.physicsBody.position);
          obj.mesh.quaternion.copy(obj.physicsBody.quaternion);
  
        }
      });
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    this.updatePhysics()

    // Update controls
    if (this.controls) this.controls.update();

   // this.renderer.render(this.scene, this.camera);
  }


  // Easing functions library
  static EASING_FUNCTIONS = {
    // Linear
    'linear': (t) => t,
    
    // Quadratic
    'quadIn': (t) => t * t,
    'quadOut': (t) => t * (2 - t),
    'quadInOut': (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    
    // Cubic
    'cubicIn': (t) => t * t * t,
    'cubicOut': (t) => (--t) * t * t + 1,
    'cubicInOut': (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
    
    // Quartic
    'quartIn': (t) => t * t * t * t,
    'quartOut': (t) => 1 - (--t) * t * t * t,
    'quartInOut': (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
    
    // Quintic
    'quintIn': (t) => t * t * t * t * t,
    'quintOut': (t) => 1 + (--t) * t * t * t * t,
    'quintInOut': (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,
    
    // Sinusoidal
    'sineIn': (t) => 1 - Math.cos(t * Math.PI / 2),
    'sineOut': (t) => Math.sin(t * Math.PI / 2),
    'sineInOut': (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    
    // Exponential
    'expoIn': (t) => Math.pow(2, 10 * (t - 1)),
    'expoOut': (t) => 1 - Math.pow(2, -10 * t),
    'expoInOut': (t) => {
      if (t === 0) return 0;
      if (t === 1) return 1;
      if ((t /= 0.5) < 1) return 0.5 * Math.pow(2, 10 * (t - 1));
      return 0.5 * (-Math.pow(2, -10 * --t) + 2);
    },
    
    // Circular
    'circIn': (t) => 1 - Math.sqrt(1 - t * t),
    'circOut': (t) => Math.sqrt(1 - (--t) * t),
    'circInOut': (t) => {
      if ((t /= 0.5) < 1) return -0.5 * (Math.sqrt(1 - t * t) - 1);
      return 0.5 * (Math.sqrt(1 - (t -= 2) * t) + 1);
    },
    
    // Elastic
    'elasticIn': (t) => {
      const s = 1.70158;
      const p = 0.3;
      if (t === 0) return 0;
      if (t === 1) return 1;
      return -(Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * (2 * Math.PI) / p));
    },
    'elasticOut': (t) => {
      const s = 1.70158;
      const p = 0.3;
      if (t === 0) return 0;
      if (t === 1) return 1;
      return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
    },
    'elasticInOut': (t) => {
      const s = 1.70158;
      const p = 0.3 * 1.5;
      if (t === 0) return 0;
      if ((t /= 0.5) === 2) return 1;
      if (t < 1) return -0.5 * (Math.pow(2, 10 * (t -= 1)) * Math.sin((t - s) * (2 * Math.PI) / p));
      return Math.pow(2, -10 * (t -= 1)) * Math.sin((t - s) * (2 * Math.PI) / p) * 0.5 + 1;
    },
    
    // Back
    'backIn': (t) => {
      const s = 1.70158;
      return t * t * ((s + 1) * t - s);
    },
    'backOut': (t) => {
      const s = 1.70158;
      return --t * t * ((s + 1) * t + s) + 1;
    },
    'backInOut': (t) => {
      const s = 1.70158 * 1.525;
      if ((t /= 0.5) < 1) return 0.5 * (t * t * ((s + 1) * t - s));
      return 0.5 * ((t -= 2) * t * ((s + 1) * t + s) + 2);
    },
    
    // Bounce
    'bounceIn': (t) => 1 - GunroarCannon.EASING_FUNCTIONS.bounceOut(1 - t),
    'bounceOut': (t) => {
      if (t < (1 / 2.75)) {
        return 7.5625 * t * t;
      } else if (t < (2 / 2.75)) {
        return 7.5625 * (t -= (1.5 / 2.75)) * t + 0.75;
      } else if (t < (2.5 / 2.75)) {
        return 7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375;
      } else {
        return 7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375;
      }
    },
    'bounceInOut': (t) => {
      if (t < 0.5) return GunroarCannon.EASING_FUNCTIONS.bounceIn(t * 2) * 0.5;
      return GunroarCannon.EASING_FUNCTIONS.bounceOut(t * 2 - 1) * 0.5 + 0.5;
    },
    
    // Smooth Step (commonly used in 3D)
    'smoothStep': (t) => t * t * (3 - 2 * t),
    'smootherStep': (t) => t * t * t * (t * (t * 6 - 15) + 10)
  };
  

  // Helper method to get easing function
  _getEasingFunction(easing) {
    if (typeof easing === 'function') {
      return easing;
    }
    
    if (typeof easing === 'string') {
      const easingFunc = GunroarCannon.EASING_FUNCTIONS[easing];
      if (easingFunc) {
        return easingFunc;
      } else {
        console.warn(`Easing function "${easing}" not found. Using linear easing.`);
        return GunroarCannon.EASING_FUNCTIONS.linear;
      }
    }
    
    // Default to linear
    return GunroarCannon.EASING_FUNCTIONS.linear;
  }

  // Updated animateCameraToMeshObject method
  animateCameraToMeshObject(meshObject, duration = 1000, options = {}) {
    const targetPosition = meshObject.getWorldPosition();
    const offset = options.offset || [0, 2, 5];
    const finalPosition = {
      x: targetPosition.x + offset[0],
      y: targetPosition.y + offset[1],
      z: targetPosition.z + offset[2]
    };

    const startPosition = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z
    };

    const startTime = performance.now();
    const easingFunction = this._getEasingFunction(options.easing);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easedProgress = easingFunction(progress);

      this.camera.position.x = startPosition.x + (finalPosition.x - startPosition.x) * easedProgress;
      this.camera.position.y = startPosition.y + (finalPosition.y - startPosition.y) * easedProgress;
      this.camera.position.z = startPosition.z + (finalPosition.z - startPosition.z) * easedProgress;

      if (options.lookAt !== false) {
        this.camera.lookAt(targetPosition.x, targetPosition.y, targetPosition.z);
      }

      if (this.controls) {
        this.controls.update();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else if (options.onComplete) {
        options.onComplete();
      }
    };

    requestAnimationFrame(animate);
  }

  // Generic animation method for any property
  animateTo(target, duration = 1000, options = {}) {
    const startValues = { ...target };
    const endValues = options.endValues || {};
    const easing = options.easing || 'linear';
    const onUpdate = options.onUpdate;
    const onComplete = options.onComplete;

    const startTime = performance.now();
    const easingFunction = this._getEasingFunction(easing);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFunction(progress);

      // Update target properties
      Object.keys(endValues).forEach(key => {
        if (startValues[key] !== undefined) {
          target[key] = startValues[key] + (endValues[key] - startValues[key]) * easedProgress;
        }
      });

      if (onUpdate) {
        onUpdate(easedProgress);
      }

      if (this.controls) {
        this.controls.update();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else if (onComplete) {
        onComplete();
      }
    };

    requestAnimationFrame(animate);
  }


  

  //Mesh loading from files
  
  // File loader method
  async loadMesh(path, options = {}) {
    const fileExtension = path.split('.').pop().toLowerCase();
    
    try {
      let meshObject;
      
      switch(fileExtension) {
        case 'gltf':
        case 'glb':
          meshObject = await this._loadGLTF(path, options);
          break;
        case 'obj':
          console.log("obj loading")
          meshObject = await this._loadOBJ(path, options);
          break;
        case 'fbx':
          meshObject = await this._loadFBX(path, options);
          break;
        case 'stl':
          meshObject = await this._loadSTL(path, options);
          break;
        case 'dae':
          meshObject = await this._loadCollada(path, options);
          break;
        case 'ply':
          meshObject = await this._loadPLY(path, options);
          break;
        default:
          throw new Error(`Unsupported file format: ${fileExtension}`);
      }
      
      // Apply options
      if (options.position) {
        meshObject.setPosition(options.position);
      }
      
      if (options.scale) {
        meshObject.setScale(options.scale);
      }
      
      if (options.rotation) {
        meshObject.setRotation(options.rotation);
      }
      
      if (options.physics && this.withPhysics) {
        meshObject.enablePhysics(options.physicsOptions);
      }
      
      if (options.done) {
        options.done(meshObject)
      }

      this.objects.set(meshObject.id, meshObject);
      return meshObject;
      
    } catch (error) {
      console.error(`Error loading mesh from ${path}:`, error);
      throw error;
    }
  }

  // GLTF/GLB loader
  async _loadGLTF(path, options) {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    
    return new Promise((resolve, reject) => {
      loader.load(
        path,
        (gltf) => {
          const scene = gltf.scene;
          
          // Handle animations
          if (gltf.animations && gltf.animations.length > 0) {
            scene.userData.animations = gltf.animations;
            scene.userData.mixer = new THREE.AnimationMixer(scene);
          }
          
          const meshObject = new GunroarMesh(this, 'loaded', {
            customMesh: scene,
            name: options.name || path.split('/').pop()
          });
          
          resolve(meshObject);
        },
        (progress) => {
          if (options.onProgress) {
            options.onProgress(progress);
          }
        },
        (error) => {
          reject(error);
        }
      );
    });
  }
// OBJ/MTL loader
  async _loadOBJ(path, options) {
    const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
    let { MTLLoader } = await import('three/examples/jsm/loaders/MTLLoader.js');
    
    return new Promise(async (resolve, reject) => {
      try {
        let materials = null;
        
          console.log("MTL loading")
        // Load MTL if provided
        if (options.mtl) {
          const mtlLoader = new MTLLoader();
          mtlLoader.setResourcePath("") ;
          mtlLoader.setPath("");
          console.log("MTL loading")
          materials = await new Promise((mtlResolve, mtlReject) => {
            mtlLoader.load(options.mtl, (mtl) => {
              console.log("Mtl loaded")
              mtl.preload();
              mtlResolve(mtl);
            }, null, mtlReject);
          });
        }
        
        const objLoader = new OBJLoader();
        if (materials) {
          objLoader.setMaterials(materials);
          console.log("Loaded MTL materials:", materials.materials);

          console.log("materials set")
        }
        
        objLoader.load(
          path,
          (object) => {
            console.log("meshOBJ loaded")
            const meshObject = new GunroarMesh(this, 'loaded', {
              customMesh: object,
              name: options.name || path.split('/').pop()
            });
            
            resolve(meshObject);
          },
          (progress) => {
            console.log("progressing obj load...")
            if (options.onProgress) {
              options.onProgress(progress);
            }
          },
          (error) => {
            reject(error);
          }
        );
        
      } catch (error) {
        reject(error);
      }
    });
  }
  // FBX loader
  async _loadFBX(path, options) {
    const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
    const loader = new FBXLoader();
    
    return new Promise((resolve, reject) => {
      loader.load(
        path,
        (object) => {
          const meshObject = new GunroarMesh(this, 'loaded', {
            customMesh: object,
            name: options.name || path.split('/').pop()
          });
          
          resolve(meshObject);
        },
        (progress) => {
          if (options.onProgress) {
            options.onProgress(progress);
          }
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  // STL loader
  async _loadSTL(path, options) {
    const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
    const loader = new STLLoader();
    
    return new Promise((resolve, reject) => {
      loader.load(
        path,
        (geometry) => {
          const material = new THREE.MeshStandardMaterial({ 
            color: options.color || 0x808080,
            metalness: options.metalness || 0.2,
            roughness: options.roughness || 0.8
          });
          
          const mesh = new THREE.Mesh(geometry, material);
          mesh.castShadow = options.castShadow !== false;
          mesh.receiveShadow = options.receiveShadow !== false;
          
          const meshObject = new GunroarMesh(this, 'loaded', {
            customMesh: mesh,
            name: options.name || path.split('/').pop()
          });
          
          resolve(meshObject);
        },
        (progress) => {
          if (options.onProgress) {
            options.onProgress(progress);
          }
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  // Collada loader
  async _loadCollada(path, options) {
    const { ColladaLoader } = await import('three/examples/jsm/loaders/ColladaLoader.js');
    const loader = new ColladaLoader();
    
    return new Promise((resolve, reject) => {
      loader.load(
        path,
        (collada) => {
          const meshObject = new GunroarMesh(this, 'loaded', {
            customMesh: collada.scene,
            name: options.name || path.split('/').pop()
          });
          
          resolve(meshObject);
        },
        (progress) => {
          if (options.onProgress) {
            options.onProgress(progress);
          }
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  // PLY loader
  async _loadPLY(path, options) {
    const { PLYLoader } = await import('three/examples/jsm/loaders/PLYLoader.js');
    const loader = new PLYLoader();
    
    return new Promise((resolve, reject) => {
      loader.load(
        path,
        (geometry) => {
          const material = new THREE.MeshStandardMaterial({
            color: options.color || 0xffffff,
            vertexColors: geometry.hasAttribute('color')
          });
          
          const mesh = new THREE.Mesh(geometry, material);
          
          const meshObject = new GunroarMesh(this, 'loaded', {
            customMesh: mesh,
            name: options.name || path.split('/').pop()
          });
          
          resolve(meshObject);
        },
        (progress) => {
          if (options.onProgress) {
            options.onProgress(progress);
          }
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  // Batch loading multiple files
  async loadMeshes(meshesConfig) {
    const promises = meshesConfig.map(config => 
      this.loadMesh(config.path, config.options)
    );
    
    return Promise.all(promises);
  }

}

// Create interactive HTML panel
function createInteractiveHTML() {
  const htmlElement = document.createElement('div');
  htmlElement.className = 'interactive-panel';
  htmlElement.innerHTML = `
      <div style="width: 300px; height: 250px; background: rgba(40,40,60,0.95); color: white; padding: 20px; border-radius: 15px; border: 3px solid #4CAF50; box-shadow: 0 0 20px rgba(76,175,80,0.5);">
          <h3 style="margin: 0 0 15px 0; color: #4CAF50;">Control Panel</h3>
          <form id="myForm">
              <input type="text" id="username" placeholder="Enter your name" style="margin: 8px 0; padding: 10px; width: 100%; border: 1px solid #ccc; border-radius: 5px; background: rgba(255,255,255,0.1); color: white;">
              <br>
              <select id="colorSelect" style="margin: 8px 0; padding: 10px; width: 100%; border: 1px solid #ccc; border-radius: 5px; background: rgba(255,255,255,0.1); color: white;">
                  <option value="red">Red</option>
                  <option value="green">Green</option>
                  <option value="blue">Blue</option>
                  <option value="yellow">Yellow</option>
              </select>
              <br>
              <button type="button" id="submitBtn" style="margin: 8px 0; padding: 12px; width: 100%; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                  Submit Data
              </button>
              <button type="button" id="resetBtn" style="margin: 4px 0; padding: 10px; width: 100%; background: #ff4444; color: white; border: none; border-radius: 5px; cursor: pointer;">
                  Reset
              </button>
          </form>
          <div id="output" style="margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; min-height: 20px;"></div>
      </div>
  `;
  
  // Interactive JavaScript
  const button = htmlElement.querySelector('#submitBtn');
  const resetBtn = htmlElement.querySelector('#resetBtn');
  const output = htmlElement.querySelector('#output');
  const input = htmlElement.querySelector('#username');
  const select = htmlElement.querySelector('#colorSelect');
  
  button.onclick = function() {
      if (input.value.trim()) {
          output.innerHTML = `Hello <span style="color: ${select.value}">${input.value}</span>! Welcome to the 3D world!`;
          output.style.color = 'white';
      } else {
          output.innerHTML = 'Please enter your name!';
          output.style.color = '#ff4444';
      }
  };
  
  resetBtn.onclick = function() {
      input.value = '';
      select.value = 'red';
      output.innerHTML = 'Form reset!';
      output.style.color = '#4CAF50';
  };
  
  return htmlElement;
}

function createIFramePanel(url, options = {}) {
  // Default options
  const config = {
      width: 1200,
      height: 800,
      scale: 0.001,
      position: { x: 0, y: 1.6, z: -2 },
      allowFullscreen: true,
      showBorder: true,
      ...options
  };

  // Create container
  const container = document.createElement('div');
  container.style.width = `${config.width}px`;
  container.style.height = `${config.height}px`;
  container.style.background = 'white';
  container.style.borderRadius = '10px';
  container.style.overflow = 'hidden';
  container.style.opacity = '1';
  
  if (config.showBorder) {
      container.style.border = '2px solid #333';
      container.style.boxShadow = '0 0 20px rgba(0,0,0,0.3)';
  }

  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.src = url;
  
  if (config.allowFullscreen) {
      iframe.allowFullscreen = true;
      iframe.setAttribute('allow', 'camera; microphone; geolocation; fullscreen');
  }

  container.appendChild(iframe);
  
  // Create CSS3D object
  const cssObject = new THREE.CSS3DObject(container);
  cssObject.position.set(config.position.x, config.position.y, config.position.z);
  cssObject.scale.set(config.scale, config.scale, config.scale);
  
  // Enable interactions
  container.style.pointerEvents = 'auto';
  console.log("done making CSS")
  
  return cssObject;
}

function createEnhancedBrowserPanel(startUrl = 'https://google.com') {
  const browser = document.createElement('div');
  browser.style.width = '1400px';
  browser.style.height = '1000px';
  browser.style.background = '#2c2c2c';
  browser.style.borderRadius = '15px';
  browser.style.overflow = 'hidden';
  browser.style.boxShadow = '0 0 40px rgba(0,0,0,0.6)';
  browser.style.fontFamily = 'Arial, sans-serif';
  
  browser.innerHTML = `
      <div style="background: linear-gradient(to bottom, #565656, #454545); padding: 15px; border-bottom: 1px solid #666; display: flex; align-items: center; gap: 10px;">
          <div style="display: flex; gap: 5px;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background: #ff5f57;"></div>
              <div style="width: 12px; height: 12px; border-radius: 50%; background: #ffbd2e;"></div>
              <div style="width: 12px; height: 12px; border-radius: 50%; background: #28ca42;"></div>
          </div>
          <input type="text" id="urlBar" value="${startUrl}" 
                 style="flex: 1; padding: 10px; border: none; border-radius: 20px; background: #2c2c2c; color: white; font-size: 14px;"
                 placeholder="Enter URL...">
          <button onclick="navigateToUrl()"
                  style="padding: 8px 20px; background: #007cba; color: white; border: none; border-radius: 15px; cursor: pointer; font-size: 14px;">
              ↵ Go
          </button>
      </div>
      <iframe id="browserFrame" 
              src="${startUrl}"
              style="width: 100%; height: calc(100% - 60px); border: none;"
              allowfullscreen
              allow="camera; microphone; geolocation">
      </iframe>
  `;
  
  // Global functions for the browser controls
  window.navigateToUrl = function() {
      const url = document.getElementById('urlBar').value;
      // Add http:// if missing
      const fullUrl = url.startsWith('http') ? url : 'https://' + url;
      document.getElementById('browserFrame').src = fullUrl;
      document.getElementById('urlBar').value = fullUrl;
  };
  
  // Enter key support
  browser.querySelector('#urlBar').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') window.navigateToUrl();
  });
  browser.style.pointerEvents = 'auto';
  browser.style.touchAction = 'auto';
  
  const cssObject = new THREE.CSS3DObject(browser);
  cssObject.position.set(0, 1.6, -2);
  cssObject.scale.set(0.0006, 0.0006, 0.0006); // Adjusted scale for larger browser
  scene.add(cssObject);
  
  return cssObject;
}


export {GunroarCannon, SimpleFPSControls, createIFramePanel, createEnhancedBrowserPanel};
/**
 * @author zz85 / https://github.com/zz85/threejs-cannon-es
 * @author gunroar / https://github.com/gunroar/threejs-cannon-es
 **/