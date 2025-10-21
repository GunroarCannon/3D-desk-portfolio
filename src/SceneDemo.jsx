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
        controlsRef.current = new SimpleFPSControls(camera, gl.domElement)

        // Load desk
        const desk = engine.loadMesh('./desk.obj', {
            mtl: './desk.mtl',
            position: [2, 10, 0],
            scale: [0.2, 0.2, 0.2],
            physics: false,
            done: (desk) => {

                //setScreenMesh(desk)


                const screen = engine.loadMesh('./screen.obj', {
                    mtl: './screen.mtl',
                    position: [2, 10, 0],
                    scale: [0.2, 0.2, 0.2],
                    physics: false,
                    done: (screen) => {

                        setScreenMesh(screen)
                    }
                })

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
                console.log("set")

                //physics

                engine.world.gravity.set(0, -0.4, 0)

                // 🟩 Create desk as physics box
                const deskPoints = {
                    A: new THREE.Vector3(-12.159, 4.76, -0.88),
                    B: new THREE.Vector3(-8.58, 4.76, 3.77),
                    C: new THREE.Vector3(8.171, 4.76, 3.77),
                    D: new THREE.Vector3(11.92, 4.76, -0.88),
                }

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
                    position: [center.x,center.y,center.z-1],//desk.mesh.localToWorld(center), //[center.x, center.y, center.z],
                    color: 0x3333ff,
                    physics: true,
                    mass: 0, // static
                })
                deskBox.mesh.material.transparent = true
                deskBox.mesh.material.opacity = 0.1
                
                desk.mesh.transparent = true
                desk.mesh.opacity = 0.1
              //  engine.scene.remove(desk.mesh)
                deskBox.physicsBody.type = CANNON.Body.STATIC

                // 📄 Paper (small thin box above desk)
                const paper = engine.addBox({
                    size: [0.3,0.01,0.5],
                    position: [center.x, center.y + .3, center.z-.4],
                    color: 0xffffff,
                    physics: true,
                    mass: 0.31,
                })
                paper.setScale([1,0.01,1])

                // 🧱 Optional: Add a movable "mouse" box
                const mouseBox = engine.addBox({
                    size: [0.3, 0.1, 0.5],
                    position: [center.x + 1.5, center.y + 0.5, center.z + 0.5],
                    color: 0x00ff00,
                    physics: true,
                    mass: 0.2,
                })
                const deskMaterial = new CANNON.Material('desk');
                const paperMaterial = new CANNON.Material('paper');

                // 5. AGGRESSIVE DAMPING - CRITICAL FOR NO BOUNCE
                paper.physicsBody.linearDamping = 0.99;    // Near maximum damping
                paper.physicsBody.angularDamping = 0.99;   // Near maximum damping

                mouseBox.physicsBody.linearDamping = 0.95;
                mouseBox.physicsBody.angularDamping = 0.95;
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

                engine.world.addContactMaterial(deskPaperContactMaterial);

                deskBox.physicsBody.material = deskMaterial;
                paper.physicsBody.material = paperMaterial;
                // 🧩 Debug wireframes for physics boxes
                const meshes = [deskBox.mesh, paper.mesh, mouseBox.mesh].map((mesh) => {
                    const wire = new THREE.LineSegments(
                        new THREE.EdgesGeometry(mesh.geometry),
                        new THREE.LineBasicMaterial({
                            color: 0xffffff
                        })
                    )
                    mesh.add(wire)
                    return wire
                })
                setDebugMeshes(meshes)
                //paper.physicsBody.linearDamping = 0.8
                //paper.physicsBody.angularDamping = 0.9
                paper.physicsBody.allowSleep = true
                paper.physicsBody.sleepSpeedLimit = 0.001
                paper.physicsBody.sleepTimeLimit = 0.5

                engine.world.solver.iterations = 20
                engine.world.solver.tolerance = 0.001
                // 1️⃣ Create shared instances once
const clickables = [];
function makeClickable(object) {
  if (!object.physicsBody) throw Error("Bad clickable")
  object.mesh.userData.isClickable = true
  object.mesh.physicsBody = object.physicsBody
  clickables.push(object.mesh);
}
makeClickable(paper);
makeClickable(mouseBox)
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
    obj.geometry.computeBoundingSphere(); // ensure bounds are valid
    obj.geometry.computeBoundingBox();
  }

  // 4) set ray and test (recursive = true to catch nested geometry)
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickables, false);

  if (!intersects.length) return; // no hit

  const hit = intersects[0].object;
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

  const impulseDir = new CANNON.Vec3(
    (normal.x * 0.6 + cameraForward.x * 0.4) * (Math.random() * 0.5 + 0.3),
    (Math.abs(normal.y) * 0.7 + 0.3) * (Math.random() * 0.6 + 0.6),
    (normal.z * 0.6 + cameraForward.z * 0.4) * (Math.random() * 0.5 + 0.3),
  ).scale(0.02);

  // small torque for flutter
  const torque = new CANNON.Vec3(
    (Math.random() - 0.5) * 0.06,
    (Math.random() - 0.5) * 0.06,
    (Math.random() - 0.5) * 0.06
  ).scale(0.1);

  physicsBody.applyImpulse(impulseDir, new CANNON.Vec3().copy(physicsBody.position));
  physicsBody.applyTorque(torque);
});





        
            }
        })
        return () => engine.dispose?.()
    }, [engine, gl, camera, scene])

    useFrame((_, delta) => {     
              // TEMP: check where paper is each frame
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

        controlsRef.current?.update(delta)
        engine.updatePhysics?.(delta)
        cannonDebugger.update()

        // Sync wireframes to physics meshes (if they move)
        debugMeshes.forEach((wire) => {
            if (wire.parentnil) {
                wire.position.copy(wire.parent.position)
                wire.quaternion.copy(wire.parent.quaternion)
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
                        transform: 'scale(1)', // shrink contents to fit
                        transformOrigin: '0 0',
                    }
                } >
                <
                iframe src = "https://gunroar.vesrcel.app"
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