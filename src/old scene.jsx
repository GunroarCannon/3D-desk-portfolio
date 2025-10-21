import * as THREE from 'three'
import React, { useEffect, useState, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import {  Html } from '@react-three/drei'
import { GunroarCannon, SimpleFPSControls } from './GunroarCannon.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 🔹 Utility hook for converting pixel sizes → world units
function useWorldScale(iframeWidth, iframeHeight, iframeZ) {
  const { camera, size } = useThree()
  const [scale, setScale] = useState({ width: 1, height: 1 })

  useEffect(() => {
    const computeScale = () => {
      const distance = Math.abs(camera.position.z - iframeZ)
      const vFOV = THREE.MathUtils.degToRad(camera.fov)
      const visibleHeight = 2 * Math.tan(vFOV / 2) * distance
      const visibleWidth = visibleHeight * camera.aspect
      const pixelsPerWorldUnitY = size.height / visibleHeight

      const worldWidth = iframeWidth / pixelsPerWorldUnitY
      const worldHeight = iframeHeight / pixelsPerWorldUnitY

      setScale({ width: worldWidth, height: worldHeight })
    }

    computeScale()
    window.addEventListener('resize', computeScale)
    return () => window.removeEventListener('resize', computeScale)
  }, [camera, size, iframeWidth, iframeHeight, iframeZ])

  return scale
}

export default function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 5, 10], fov: 50 }}
      style={{ width: '100vw', height: '100vh', background: '#101010' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 3, 0]} />
      <MainScene />
      {/* <OrbitControls /> */}
    </Canvas>
  )
}

function MainScene() {
  const { camera, gl } = useThree()
  const [engine] = useState(() => new GunroarCannon({ withPhysics: false }))
  const [iframeData, setIframeData] = useState(null)

  const controlsRef = useRef(null)

  useEffect(() => {
    // Attach custom FPS controls once DOM is ready
    controlsRef.current = new SimpleFPSControls(camera, gl.domElement)
    // Your measurement logic
    let y = 10.049
    let z = -4.8233

    const topRight = [3.5275, y, z]
    const bottomLeft = [-3.6883, 6.22, z]

    const center = new THREE.Vector3()
      .addVectors(new THREE.Vector3(...topRight), new THREE.Vector3(...bottomLeft))
      .multiplyScalar(0.5)

    const scaleFactor = 0.2
    const width = 7.2 * scaleFactor
    const height = 3.82 * scaleFactor

    const box = engine.addBox({
      size: [1, 1, 1],
      position: [0, 5, 0],
      physics: true,
      mass: 1,
      color: 0xff0000
    })

    engine.loadMesh('./desk.obj', {
      mtl: './desk.mtl',
      position: [2, 10, 0],
      scale: [0.2, 0.2, 0.2],
      physics: true
    }).then(sphere => {
      const r = 194 // just scale multiplier for iframe pixel size
      const pos = sphere.mesh.localToWorld(center)
      pos.z = pos.z+.03

      setIframeData({
        url: 'https://example.com',
        width: width * r,
        height: height * r,
        position: pos,
        z
      })

      if (false) {

          box.setPosition(pos)
          engine.scene.remove(box.mesh)
          engine.scene.remove(sphere)
          engine.setCameraPosition(sphere.mesh.localToWorld(center))
      }
       else {
          const seatPos = sphere.mesh.localToWorld(new THREE.Vector3(
            0.0967,
            7.371,
            0.57));
          engine.camera = camera
          engine.setCameraPosition(seatPos||sphere.mesh.localToWorld(center));
       }
    })

    return () => engine.dispose?.()
  }, [engine])

  // Engine update loop
  useFrame((_, delta) => {
    controlsRef.current?.update(delta);
    engine.update?.(delta);
  })

  const iframeWidth = iframeData?.width || 1
  const iframeHeight = iframeData?.height || 1
  const iframeZ = iframeData?.z || 0
  const scale = useWorldScale(iframeWidth, iframeHeight, iframeZ)

  const [hidden, setHidden] = useState(false)

  
  return (
    <>
      <primitive object={engine.scene} />
      {iframeData && (
        <Html
          position={[
            iframeData.position.x,
            iframeData.position.y,
            iframeData.position.z
          ]}
          onOcclude={(visible) => setHidden(!visible)}
          transform
          occlude
          style={{
            width: `${iframeData.width}px`,
            height: `${iframeData.height}px`,
            border: '2px solid #333',
            borderRadius: '10px',
            overflow: 'hidden',
            boxShadow: '0 0 20px rgba(0,0,0,0.3)',
            transform: `scale(${scale.width * 0.1})`, // tweak 0.1 as needed
             transformOrigin: 'center',
                      
            opacity: hidden ? 1 : 0.3
          }}
        >
          <iframe
            src={iframeData.url}
            style={{ width: '100%', height: '100%', border: 'none' }}
            allow="camera; microphone; geolocation; fullscreen"
          />
        </Html>
      )}
    </>
  )
}
