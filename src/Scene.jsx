import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import CannonDebugger from 'cannon-es-debugger'
import React, {
    useEffect,
    useState,
    useRef
} from 'react'
import {
    Canvas,
    useThree,
    useFrame
} from '@react-three/fiber'
import {
    Html,
    useGLTF
} from '@react-three/drei'
import {
    GunroarCannon,
    SimpleFPSControls
} from './GunroarCannon.js'

// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export default function Scene() {
    return ( <
        Canvas shadows camera = {
            {
                position: [0, 5, 10],
                fov: 50
            }
        }
        style = {
            {
                width: '100vw',
                height: '100vh',
                background: '#101010'
            }
        } >
        <
        ambientLight intensity = {
            0.5
        }
        /> <
        directionalLight position = {
            [0, 3, 0]
        }
        intensity = {
            0.7
        }
        /> <
        MainScene / >
        </Canvas>
    )
}

function MainScene() {
    const {
        camera,
        gl,
        scene
    } = useThree()
    const [engine] = useState(() => new GunroarCannon({
        withPhysics: true
    }))               
    const [cannonDebugger] = useState(() => new CannonDebugger(engine.scene, engine.world, {
                  color: 0x00ff00,
                  scale: 1.0,
  onInit: (body, mesh, shape) => {
    // mark it
    mesh.userData.isCannonDebugMesh = true
    console.log(mesh.userData.isCannonDebugMesh)
  }
                }))
                
    const controlsRef = useRef(null)

    const [debugMeshes, setDebugMeshes] = useState([])
    const [screenMesh, setScreenMesh] = useState(null)



    useEffect(() => {
        controlsRef.current = new SimpleFPSControls(camera, gl.domElement,engine)
        // fixed timestep for cannon
        const FIXED_STEP = 1 / 60;
        let pendingLoads = 0;
        // helper to mark loads
        function startLoad() { pendingLoads++; engine.physicsPaused = true; }
        function finishLoad() {
          pendingLoads = Math.max(0, pendingLoads - 1);
          if (pendingLoads === 0) {
            // all loads finished — unpause and settle
            engine.physicsPaused = false;
            //settlePhysics();
          }
        }


        const clickables = [];
        function makeClickable(object) {
          if (!object.physicsBody) throw Error("Bad clickable")
          object.mesh.userData.isClickable = true
          object.mesh.physicsBody = object.physicsBody
          clickables.push(object.mesh);
          console.log("made clickable")
        }
        let selectedBody = null;
        let dragOffset = new CANNON.Vec3();
        let plane = new THREE.Plane(); // plane to drag along
        let intersection = new THREE.Vector3();

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // recommended thresholds if you're using Points/Lines in scene (optional)
        raycaster.params.Line.threshold = 1;
        raycaster.params.Points.threshold = 1;

        window.addEventListener('click', (event) => {
          // 1) get canvas rect precisely (works with R3F Canvas)
          const canvas = gl.domElement; // in R3F use gl.domElement; otherwise your renderer.domElement
          const rect = canvas.getBoundingClientRect();

          // 2) mouse coords relative to canvas and normalized
          const x = (event.clientX - rect.left) / rect.width;
          const y = (event.clientY - rect.top) / rect.height;
          mouse.x = x * 2 - 1;
          mouse.y = - (y * 2 - 1);

          // 3) sync camera matrices & paper mesh transform
          camera.updateMatrixWorld(true); // ensure camera world matrix is up-to-date

          for (const obj of clickables) {
            obj.position.copy(obj.physicsBody.position);
            obj.quaternion.copy(obj.physicsBody.quaternion);
            //obj.geometry.computeBoundingSphere(); // ensure bounds are valid
            //obj.geometry.computeBoundingBox();
          }

          // 4) set ray and test (recursive = true to catch nested geometry)
          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObjects(clickables, true);

          if (!intersects.length) return; // no hit

          let hit = intersects[0].object;
          let target = hit;
          while (target && !target.physicsBody) target = target.parent;
          if (!target) return; // no physics linked

          hit = target;
          const obj = hit;
          const physicsBody = obj.physicsBody;

          // 5) gentle realistic impulse (tuned)
          physicsBody.velocity.set(0, 0, 0);
          physicsBody.angularVelocity.set(0, 0, 0);

          // direction based on hit normal + some randomness for realism
          const normal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);
          normal.transformDirection(obj.matrixWorld); // face normal -> world space

          // blend normal with camera forward to feel like "flick at clicked point"
          const cameraForward = new THREE.Vector3();
          camera.getWorldDirection(cameraForward);

          const m = obj.userData.isMouse ? 0 : 1;
          // if (m==0) console.error("mouse moved");

          const impulseDir = new CANNON.Vec3(
            (normal.x * 0.6 + cameraForward.x * 0.4) * (Math.random() * 0.5 + 0.3),
            (Math.abs(normal.y) * 0.7 + 0.3) * (Math.random() * 0.6 + 0.6) * m,
            (normal.z * 0.6 + cameraForward.z * 0.4) * (Math.random() * 0.5 + 0.3),
          ).scale(0.02);//*(m==0) ? 0.1:1);

          // small torque for flutter
          const torque = new CANNON.Vec3(
            (Math.random() - 0.5) * 0.06*m,
            (Math.random() - 0.5) * 0.06 * m,
            (Math.random() - 0.5) * 0.06*m
          ).scale(0.1);

          console.log(m==0, torque, impulseDir)

          
          physicsBody.applyImpulse(impulseDir, new CANNON.Vec3().copy(physicsBody.position));
          if (m!=0) physicsBody.applyTorque(torque);
          if (m==30) {
            const po = physicsBody.obj||physicsBody.object; console.log(po.getQuaternion(), po.getRotation(), po, physicsBody.object)
            po.setRotation(po.mesh.rotation.x, 0, po.mesh.rotation.z)
          }
        });
        window.addEventListener('mousedown', (event) => {
          const canvas = gl.domElement;
          const rect = canvas.getBoundingClientRect();
          mouse.x = (event.clientX - rect.left) / rect.width * 2 - 1;
          mouse.y = - (event.clientY - rect.top) / rect.height * 2 + 1;

          raycaster.setFromCamera(mouse, camera);
          const intersects = raycaster.intersectObjects(clickables, true);
          if (!intersects.length) return;

          let hit = intersects[0].object;
          while (hit && !hit.physicsBody) hit = hit.parent;
          if (!hit) return;

          selectedBody = hit.physicsBody;
          selectedBody.userData = hit.userData;
          engine.selectedBody = true;

          // small impulse effect on tap
          selectedBody.velocity.set(0,0,0);
          selectedBody.angularVelocity.set(0,0,0);
          const cameraForward = new THREE.Vector3();
          camera.getWorldDirection(cameraForward);
          
          const m = selectedBody.userData.isMouse ? 0 : 1;
          if (m==0) console.error("mouse selected")
          const impulse = new CANNON.Vec3(
            cameraForward.x*0.02,
            cameraForward.y*0.02*m + 0.05*m,
            cameraForward.z*0.02*m
          );
          
            
            if (m!=0) selectedBody.applyImpulse(impulse, selectedBody.position);

            // calculate drag plane (parallel to camera view)
            plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), 
                                              new THREE.Vector3().copy(selectedBody.position));
          });
          window.addEventListener('mousemove', (event) => {
            if (!selectedBody) return;

            const canvas = gl.domElement;
            const rect = canvas.getBoundingClientRect();
            mouse.x = (event.clientX - rect.left) / rect.width * 2 - 1;
            mouse.y = - (event.clientY - rect.top) / rect.height * 2 + 1;

            raycaster.setFromCamera(mouse, camera);

            // intersect drag plane
            raycaster.ray.intersectPlane(plane, intersection);

            // move physics body towards pointer smoothly
            const targetPos = new CANNON.Vec3(intersection.x, intersection.y, intersection.z);
            let delta = targetPos.vsub(selectedBody.position).scale(10/Math.max(selectedBody.mass,1)); // tweak force
            //keyb
            const maxDistance = selectedBody.mass>=10 ? 0.1 : 0.3
            if (delta.length()>maxDistance) delta = delta.scale(maxDistance/delta.length());
            const m = selectedBody.userData.isMouse ? 0 : 1;
            delta.y *= m;
            selectedBody.velocity.copy(delta);
          });
          window.addEventListener('mouseup', () => {
            selectedBody = null;
            engine.selectedBody = false;
          });

        // Load desk
        const desk = engine.loadMesh('./plaindesk.obj', {
            mtl: './plaindesk.mtl',
            position: [2, 10, 0],
            scale: [0.2, 0.2, 0.2],
            physics: false,
            done:  (desk) => {

                //setScreenMesh(desk)

                console.log("adding scren=en")


                const screen = engine.loadMesh('./screen.obj', {
                    mtl: './screen.mtl',
                    position: [2, 10, 0],
                    scale: [0.2, 0.2, 0.2],
                    physics: false,
                    done: (screen) => {

                        setScreenMesh(screen)
                        console.log("screen loaded")
                    }
                })
                engine.scene.remove(screen);

                // // Load screen separately (isolated)
                // const loader = new THREE.OBJLoader()
                // loader.load('./screen.obj', (obj) => {
                //   obj.position.set(2, 10, 0)
                //   obj.scale.set(0.2, 0.2, 0.2)
                //   scene.add(obj)
                //   setScreenMesh(obj)
                // })

                const seatPos = desk.mesh.localToWorld(new THREE.Vector3(
                    0.0967,
                    7.371,
                    0.57));
                engine.camera = camera
                engine.setCameraPosition(seatPos || desk.mesh.localToWorld(center));
                engine.camera.rotation.set(-0.66, -0.01, 0)//(new THREE.Vector3(-0.66, -0.01, 0))
                console.log("set")

                //physics

                engine.world.gravity.set(0, -0.4, 0)
                engine.world.broadphase = new CANNON.NaiveBroadphase();
                engine.world.allowSleep = true;

                // 2. GLOBAL material with ZERO restitution
                const zeroBounceMaterial = new CANNON.Material('zeroBounce');
                engine.world.defaultMaterial = zeroBounceMaterial;

                // 3. WORLD contact material - THIS IS CRITICAL
                engine.world.defaultContactMaterial = new CANNON.ContactMaterial(
                  zeroBounceMaterial,
                  zeroBounceMaterial,
                  {
                    friction: 0.3,
                    restitution: 0.0, // ZERO bounce globally
                    contactEquationStiffness: 1e8,    // Higher stiffness for hard contacts
                    contactEquationRelaxation: 3,     // Lower relaxation for less bounce
                    frictionEquationStiffness: 1e8,
                    frictionEquationRelaxation: 3
                  }
                );

                // 4. Remove ALL solver tolerance - use fixed iterations
                engine.world.solver.iterations = 15;

                

                // 🟩 Create desk as physics box
                const deskPoints = {
                    A: new THREE.Vector3(-12.159, 4.76, -0.88),
                    B: new THREE.Vector3(-8.58, 4.76, 3.77),
                    C: new THREE.Vector3(8.171, 4.76, 3.77),
                    D: new THREE.Vector3(11.92, 4.76, -0.88),
                }

                // Convert all desk points to world space first
                const worldPoints = {
                    A: desk.mesh.localToWorld(deskPoints.A.clone()),
                    B: desk.mesh.localToWorld(deskPoints.B.clone()),
                    C: desk.mesh.localToWorld(deskPoints.C.clone()),
                    D: desk.mesh.localToWorld(deskPoints.D.clone())
                }

                // Now find min/max in world space
                const min = worldPoints.A.clone().min(worldPoints.B).min(worldPoints.C).min(worldPoints.D)
                const max = worldPoints.A.clone().max(worldPoints.B).max(worldPoints.C).max(worldPoints.D)
                const size = new THREE.Vector3().subVectors(max, min)
                const center = new THREE.Vector3().addVectors(max, min).multiplyScalar(0.5)
                // 🟫 Desk box (thin) table
                const deskBox = engine.addBox({
                    size: [size.x, 0.1, size.z+3], // thin height
                    position: [center.x,center.y,center.z-.5  ],//desk.mesh.localToWorld(center), //[center.x, center.y, center.z],
                    color: 0x3333ff,
                    physics: true,
                    mass: 0, // static
                  })
                deskBox.physicsBody.type = CANNON.Body.STATIC

                /*const verticesTable1 = [
                  //side 1 screen
                  -9.51705265045166, 9.04316520690918, -1.5577189922332764
                  -9.51705265045166, 5.255600929260254, -1.5577189922332764
                  -3.960563898086548, 5.255600929260254, -4.9164018630981445
                  -3.960563898086548, 9.04316520690918, -4.9164018630981445

                  //middle screen
                  -3.797441005706787, 10.161821365356445, -4.876062870025635
                  -3.797441005706787, 5.827054977416992, -4.876062870025635
                  3.6332950592041016, 5.827041149139404, -4.876062870025635
                  3.6332950592041016, 10.161806106567383, -4.876062870025635

                  //side 2 screen
                  3.794404983520508, 9.04316520690918, -4.900463104248047
                  3.794405937194824, 5.255602836608887, -4.900463104248047
                  8.860984802246094, 5.255602836608887, -0.8402850031852722
                  8.860984802246094, 9.04316520690918, -0.8402850031852722

                ]
                */

                deskBox.mesh.material.transparent = true
                deskBox.mesh.material.opacity = 0.1
                
                desk.mesh.transparent = true
                desk.mesh.opacity = 0.1
                
                console.log("next mouse paper")
                const deskMaterial = new CANNON.Material('desk');
                const paperMaterial = new CANNON.Material('paper');

                // engine.scene.remove(desk.mesh)
                const lmanager = new THREE.LoadingManager();

                lmanager.onProgress = (u, loaded, total) => {
                  console.warn("loaded ", loaded, total);
                }
                const tloader = new THREE.TextureLoader(lmanager);
                const paperCPP = tloader.load("./textures/papers/cpp.png");
                const paperLua = tloader.load("./textures/papers/lua.png");
                const paperSketch = tloader.load("./textures/papers/sketch.png");
                const paperWelcome = tloader.load("./textures/papers/welcome.png");

                const plainMaterial = new THREE.MeshStandardMaterial({color:0xffffff});
                
                lmanager.onLoad = () => {

                for (let i=0; i<14; i++) {

                  // 📄 Paper (small thin box above desk)
                  const paper = engine.addBox({
                      size: [0.3,0.01,0.5],
                      //-2 to -0.7
                      position: [center.x-0.7, center.y + .3, center.z-.4],
                      material:[
                        plainMaterial, plainMaterial,
                        new THREE.MeshStandardMaterial({map:
                          (i==3) ? paperWelcome :
                          (i%4==0) ? paperCPP :
                          (i%4==1) ? paperLua :
                          (i%4==2) ? paperSketch :
                          paperSketch
                        }),plainMaterial,plainMaterial,plainMaterial
                      ],
                      color: 0xffffff,
                      physics: true,
                      mass: 0.31,
                  })
                  paper.setRotation([0,4+Math.PI,0]);
                  paper.setScale([1,0.01,1]);
                  //paper.disablePhysics()
                  
                  // 5. AGGRESSIVE DAMPING - CRITICAL FOR NO BOUNCE
                  paper.physicsBody.linearDamping = 0.99;    // Near maximum damping
                  paper.physicsBody.angularDamping = 0.99;   // Near maximum damping
                  
                  //paper.physicsBody.linearDamping = 0.8
                  //paper.physicsBody.angularDamping = 0.9
                  paper.physicsBody.material = paperMaterial;
                  paper.physicsBody.allowSleep = true
                  paper.physicsBody.sleepSpeedLimit = 0.001
                  paper.physicsBody.sleepTimeLimit = 0.5
                  engine.paper = i==3 ? paper : engine.paper;

                  if (engine.paper != paper) {
                   // paper.physicsBody.rotation.y += Math.PI; 
                  }
                  makeClickable(paper);
                }

                const deskPaperContactMaterial = new CANNON.ContactMaterial(
                  deskMaterial,
                  paperMaterial,
                  {
                    friction: 0.4,        // Reduced for less "stickiness"
                    restitution: 0.0,     // Zero bounce
                    contactEquationStiffness: 1e6,   // Reduced for stability
                    contactEquationRelaxation: 4,    // Increased for better convergence
                  }

                );
                
                const deskZeroContactMaterial = new CANNON.ContactMaterial(
                  deskMaterial,
                  zeroBounceMaterial,
                  {
                    friction: 0.3,
                    restitution: 0.0, // ZERO bounce globally
                    contactEquationStiffness: 1e8,    // Higher stiffness for hard contacts
                    contactEquationRelaxation: 3,     // Lower relaxation for less bounce
                    frictionEquationStiffness: 1e8,
                    frictionEquationRelaxation: 3
                  }

                );

                
                const zeroPaperContactMaterial = new CANNON.ContactMaterial(
                  paperMaterial,
                  zeroBounceMaterial,
                  {
                    friction: 0.3,
                    restitution: 0.0, // ZERO bounce globally
                    contactEquationStiffness: 1e8,    // Higher stiffness for hard contacts
                    contactEquationRelaxation: 3,     // Lower relaxation for less bounce
                    frictionEquationStiffness: 1e8,
                    frictionEquationRelaxation: 3
                  }

                );

                engine.world.addContactMaterial(zeroPaperContactMaterial);
                engine.world.addContactMaterial(deskPaperContactMaterial);
                engine.world.addContactMaterial(deskZeroContactMaterial)

                deskBox.physicsBody.material = deskMaterial;
                console.log(deskBox.physicsBody.mass,"massssss")
                deskBox.physicsBody.mass = 0
                deskBox.physicsBody.updateMassProperties()
                // 🧩 Debug wireframes for physics boxes
                /*const meshes = [deskBox.mesh, paper.mesh, mouseBox.mesh].map((mesh) => {
                    const wire = new THREE.LineSegments(
                        new THREE.EdgesGeometry(mesh.geometry),
                        new THREE.LineBasicMaterial({
                            color: 0xffffff
                        })
                    )
                    mesh.add(wire)
                    return wire
                })
                setDebugMeshes(meshes)*/


                engine.world.solver.iterations = 20
                engine.world.solver.tolerance = 0.001
                // 1️⃣ Create shared instances once



                // 🧱 Optional: Add a movable "mouse" box
                console.log("adding mouse")
                const mouseBox =  engine.loadMesh("./mouse.obj",{
                    mtl: "./mouse.mtl",
                    size: desk.mesh.localToWorld(new THREE.Vector3(0.788,1.19,0.48)),
                    scale:[0.2,0.2,0.2],
                    position: desk.mesh.localToWorld(new THREE.Vector3(3.5227, 4.8732, -1.9068)),//[center.x + 1.5, center.y + 0.5, center.z + 0.5],
                    color: 0x00ff00,
                    physics: true,
                    mass: 0.2,
                    restitution: 1,
                    done: (obj)=>{
                      obj.mouse = true
                      obj.mesh.userData.isMouse = true
                      makeClickable(obj)
                      engine.mouse = obj
                      obj.physicsBody.linearDamping = 0.95;
                      console.error(obj.physicsBody.mass)
                      obj.physicsBody.mass = 3
                      obj.physicsBody.angularDamping = 0.95;
                      obj.mesh.position.copy(obj.physicsBody.position);
                      obj.mesh.quaternion.copy(obj.physicsBody.quaternion);
                      console.log("mousey")
                    }
                })

                const ksize = desk.mesh.localToWorld(new THREE.Vector3(4.82, 2.24, 0.508))
                engine.paper.setPosition(desk.mesh.localToWorld(new THREE.Vector3(-0.33, 5.26+2.3 ,-1.5275)))
               // engine.paper.setPosition([engine.paper.mesh.position.x,engine.paper.mesh.position.y+ksize.y,engine.paper.mesh.position.z])
                engine.paper.setRotation([0,0,0])                
                const keyboard =  engine.loadMesh("./keyboard.obj",{
                    mtl: "./keyboard.mtl",
                    size: desk.mesh.localToWorld(new THREE.Vector3(4.82, 2.24, 0.508)),
                    scale:[0.2,0.2,0.2],
                    position: desk.mesh.localToWorld(new THREE.Vector3(-0.33, 5.26 ,-2.6275)),//[center.x + 1.5, center.y + 0.5, center.z + 0.5],
                    color: 0x00ff00,
                    physics: true,
                    mass: 20,
                    done: (obj)=>{
                      makeClickable(obj) 
                      engine.k = obj;
                      obj.physicsBody.linearDamping = 0.5;
                      obj.physicsBody.angularDamping = 0.5;
                      obj.physicsBody.material = zeroBounceMaterial;
                      obj.mesh.position.copy(obj.physicsBody.position);
                      obj.mesh.quaternion.copy(obj.physicsBody.quaternion);
                    }
                })
              };

              const walls = engine.loadMesh("./black_walls.obj", {
                mtl: "./black_walls.mtl",
                size: desk.mesh.localToWorld(new THREE.Vector3(50,50,50)),
                //size: desk.mesh.localToWorld(new THREE.Vector3(49.6, 55.4, 47.8)),
                scale: [0.2, 0.2, 0.2],
                position: desk.mesh.localToWorld(new THREE.Vector3(0, 0, 0)),
                physics: false,
                done: (obj) => {
                  obj.mesh.traverse((child) => {
                    if (child.isMesh) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach((mat) => {
                      mat.side = THREE.DoubleSide;
                      mat.needsUpdate = true;
                    })}
                  })
                  ///engine.setCameraPosition(obj.mesh.position || desk.mesh.localToWorld(center))
                  //engine.camera.position.z += 15
                }
              });
              engine.addLight("directional", {position:[0,0,0]})
                engine.desk = desk;
                engine.zoom = false;

// Screen vertices
  const screens = [
  // side 1 (reordered for outward normal)
  [
    [-9.517, 9.043, -1.558],   // 0
    [-3.961, 9.043, -4.916],   // 1
    [-3.961, 5.256, -4.916],   // 2
    [-9.517, 5.256, -1.558]    // 3
  ],
  // middle (reordered for outward normal)
  [
    [-3.797, 10.162, -4.876],  // 0
    [3.633, 10.162, -4.876],   // 1
    [3.633, 5.827, -4.876],    // 2
    [-3.797, 5.827, -4.876]    // 3
  ],
  // side 2 (reordered for outward normal)
  [
    [3.794, 9.043, -4.900],    // 0
    [8.861, 9.043, -0.840],    // 1
    [8.861, 5.256, -0.840],    // 2
    [3.794, 5.256, -4.900]     // 3
  ]
];

screens.forEach((screenVerts, i) => {
  // Transform local vertices to world
  const worldVerts = screenVerts.map(v => {
    const vec = new THREE.Vector3(...v);
    desk.mesh.localToWorld(vec);
    return new CANNON.Vec3(vec.x, vec.y, vec.z);
  });

  // Create convex hull shape
  const shsape = new CANNON.ConvexPolyhedron({
    vertices: worldVerts,
    // Define faces with CCW ordering
    faces: [
  [0, 1, 2],
  [0, 2, 3]
]
  });const verts = worldVerts;
const thickness = 0.02;
// Compute center as before
const center = verts.reduce((acc, v) => acc.vadd(v), new CANNON.Vec3()).scale(1 / verts.length);

// Create a local "plane" orientation from the 4 points
const edge1 = verts[1].vsub(verts[0]);  // horizontal direction
const edge2 = verts[2].vsub(verts[0]);  // vertical direction

// Compute the plane's normal
const normal = edge1.cross(edge2).unit();

// Now make an orthonormal basis (right, up, forward)
const right = edge1.unit();
const up = normal.cross(right).unit(); // ensure perpendicular

// Convert basis vectors into a rotation matrix
const mat = new THREE.Matrix4();
  mat.makeBasis(right, up, normal); // sets columns [xAxis, yAxis, zAxis]
  const quat = new THREE.Quaternion();
  quat.setFromRotationMatrix(mat);


// Convert rotation matrix to quaternion
//const quat = new CANNON.Quaternion();
//quat.setFromRotationMatrix(rotMatrix);

const shape = new CANNON.Box(
  new CANNON.Vec3(
    (verts[1].x - verts[0].x) / 2+(i==1 ? 0 : 0.2),
    (verts[0].y - verts[2].y) / 2,
    thickness / 2
  )
);

const ccenter = verts.reduce(
  (acc, v) => acc.vadd(v),
  new CANNON.Vec3(0, 0, 0)
).scale(1 / verts.length);


  // Create static body
  const body = new CANNON.Body({
    mass: 0,
    shape,
    material: new CANNON.Material('screen')
  });
  body.position.copy(center)
  body.quaternion.copy(quat)

  engine.world.addBody(body);
  console.log(body.mass,"mass");  

  // Optional: add a visible Three mesh
  const mesh = engine.addBox({
    vertices: screenVerts.flat(),
    size:[
    (verts[1].x - verts[0].x) / 2,
    (verts[0].y - verts[2].y) / 2,
    thickness / 2],
    color: 0x111111,
    physics: false
  });
  mesh.mesh.position.copy(body.position);
  mesh.mesh.quaternion.copy(body.quaternion);
  engine.scene.remove(mesh.mesh)
 // engine.scene.remove(desk.mesh)
});


screens.forEach((verts, i) => {
 /// createScreenBody(engine, verts, { color: 0x4444ff });
});

            }
        })
        return () => engine.dispose?.()
    }, [engine, gl, camera, scene])
    const iframeRef = useRef();

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const blurIframe = () => setTimeout(() => {
      console.log("blur")
      iframe.blur()
    }, 0);
    iframe.addEventListener('mouseup', blurIframe);
    console.log("ifrrrrrrrrrrrrrrrrrrrrrrrrrrrame ")

    return () => iframe.removeEventListener('mousedown', blurIframe);
  }, [iframeRef.current]);

    useFrame((_, delta) => {     
              // TEMP: check where paper is each frame
        //if (engine.desk&&engine.k?.mesh) console.log(engine.desk.mesh.worldToLocal(engine.paper?.mesh.position))
        if (engine.paper?.physicsBody) {
          const paper = engine.paper;
          const pos = paper.physicsBody.position;
          if (pos.y <engine.desk.mesh.position.y||pos.y>engine.desk.mesh.position.y+2) {
            console.log('Paper fell through:', pos);
            paper.physicsBody.velocity.set(0, 0, 0);
            paper.physicsBody.position.set(0, 5, 0); // reset above desk
          }
          //console.log(paper.physicsBody.position)
        }
       if (engine.zoom) engine.camera.position.z += .1;
        //console.log(engine.paper?.mesh.position, engine.camera.rotation)
        controlsRef.current?.update(delta)
        engine.updatePhysics(delta)
        //cannonDebugger.update()

        // Sync wireframes to physics meshes (if they move)
        debugMeshes.forEach((wire) => {
            if (wire.parentnil) {
                // wire.position.copy(wire.parent.position)
               // wire.quaternion.copy(wire.parent.quaternion)
            }
        })


    })

    const ww = 1850;
    const hh = 1090;
    const sc = 1.55;

    return ( <>
        <
        primitive object = {
            engine.scene
        }
        /> {
            screenMesh && ( <
                group position = {
                    screenMesh.mesh.localToWorld(new THREE.Vector3(-0.08, 8.0, -4.82)) || screenMesh.mesh.position
                }
                rotation = {
                    screenMesh.mesh.rotation
                }
                scale = {
                    screenMesh.mesh.scale
                } >
                <
                Html transform occlude = "blending" 
  position={[0, 0, 0.001]}
                distanceFactor = {
                    1
                }
                style = {
                    {
                        width: `${ww*sc}px`,
                        height: `${hh*sc}px`,
                        border: '0px solid #333',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        boxShadow: '0 0 20px rgba(0,0,0,0.3)',
                    }
                } >
                <
                div style = {
                    {
                        width: '100%',
                        height: '100%',
                        transform: 'scale(1.8) translateX(-21%)', // shrink contents to fit
                        transformOrigin: '0 0',
                    }
                } >
                <
                iframe src = "https://gunroar.vercel.app" ref={iframeRef}
                style = {
                    {
                        width: '100%',
                        height: '100%',
                        border: 'none',
                    }
                }
                allow = "camera; microphone; geolocation; fullscreen" /
                >
                </div> </Html> </group>
            )
        } </>
    )
}