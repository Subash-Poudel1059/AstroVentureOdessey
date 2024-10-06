import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js';

import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

// Set up scene, camera, and renderer
const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 10000);
camera.position.z = 10; // Adjusted camera position to give a wider view
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

// Add Orbit Controls
new OrbitControls(camera, renderer.domElement);

// Add Earth group and textures
const earthGroup = new THREE.Group();
earthGroup.rotation.z = -23.4 * Math.PI / 180;
scene.add(earthGroup);

const loader = new THREE.TextureLoader();
const earthMaterial = new THREE.MeshPhongMaterial({
  map: loader.load("./textures/00_earthmap1k.jpg"),
  specularMap: loader.load("./textures/02_earthspec1k.jpg"),
  bumpMap: loader.load("./textures/01_earthbump1k.jpg"),
  bumpScale: 0.04,

});
const earthGeometry = new THREE.IcosahedronGeometry(1, 12);
const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
earthGroup.add(earthMesh);

// Add starfield
const stars = getStarfield({ numStars: 3000 });
scene.add(stars);

// Add lights
const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// Load first exoplanet model (Kepler-186F)
const gltfLoader = new GLTFLoader();
let exoplanetObject1;

gltfLoader.load(
  './models/exoplanet/scene.gltf',
  function (gltf) {
    exoplanetObject1 = gltf.scene;
    exoplanetObject1.scale.set(1.5, 1.5, 1.5);
    exoplanetObject1.position.set(278, 0, 0); // Increased the distance from the Sun

    exoplanetObject1.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: loader.load('./models/exoplanet/textures/planet_diffuse.png'),
          metalnessMap: loader.load('./models/exoplanet/textures/planet_specularGlossiness.png'),
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
          depthWrite: false,
        });

        const cloudsMaterial = new THREE.MeshStandardMaterial({
          map: loader.load('./models/exoplanet/textures/clouds_diffuse.png'),
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const cloudsMesh = new THREE.Mesh(child.geometry, cloudsMaterial);
        cloudsMesh.scale.set(1.02, 1.02, 1.02);
        exoplanetObject1.add(cloudsMesh);
      }
    });

    scene.add(exoplanetObject1);
  },
  function (xhr) {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded (Exoplanet)');
  },
  function (error) {
    console.error(error);
  }
);

// Load second exoplanet model (Kepler-62F)
let exoplanetObject2;

gltfLoader.load(
  './models/exoplanet2/scene.gltf',
  function (gltf) {
    exoplanetObject2 = gltf.scene;
    exoplanetObject2.scale.set(1.2, 1.2, 1.2);
    exoplanetObject2.position.set(100, -43, 0); // Increased distance in opposite direction

    exoplanetObject2.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: loader.load('./models/exoplanet2/textures/Material.001_baseColor.png'),
          metalnessMap: loader.load('./models/exoplanet2/textures/Material.001_emissives.png'),
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
          depthWrite: false,
        });

        const cloudsMaterial = new THREE.MeshStandardMaterial({
          map: loader.load('./models/exoplanet2/textures/Material.001_normal.png'),
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const cloudsMesh = new THREE.Mesh(child.geometry, cloudsMaterial);
        cloudsMesh.scale.set(1.02, 1.02, 1.02);
        exoplanetObject2.add(cloudsMesh);
      }
    });

    scene.add(exoplanetObject2);
  },
  function (xhr) {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded (Exoplanet 2)');
  },
  function (error) {
    console.error(error);
  }
);

// Load Sun model
let sunObject;
gltfLoader.load(
  './models/sun/scene.gltf',
  function (gltf) {
    sunObject = gltf.scene;
    sunObject.scale.set(3, 3, 3); // Adjusted scale for the Sun
    sunObject.position.set(50, 0, 0); // Keep Sun at origin

    sunObject.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          map: loader.load('./models/sun/textures/material_1_baseColor.png'),
          emissiveMap: loader.load('./models/sun/textures/material_1_transmission.png'),
          emissiveIntensity: 1.5,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
        });
      }
    });

    scene.add(sunObject);
  },
  function (xhr) {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded (Sun)');
  },
  function (error) {
    console.error(error);
  }
);

// Raycaster and mouse interaction setup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const infoBox = document.getElementById('info-box');

function showInfoBox(content, event) {
  infoBox.innerHTML = content;
  infoBox.style.left = event.clientX + 'px';
  infoBox.style.top = event.clientY + 'px';
  infoBox.style.display = 'block';
}

function hideInfoBox() {
  infoBox.style.display = 'none';
}

function onMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects([earthMesh, exoplanetObject1, exoplanetObject2, sunObject], true);

  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;

    if (clickedObject === earthMesh) {
      showInfoBox("1 coordinate in axis=2 Light Year away. Kepler 186f is 557.7LY away so its coordinate will be nearly 278 in axis. Similarly LP791 is 86LY away. SO its coordinate is -43 on axis", event);
    } else if (clickedObject.parent === exoplanetObject1) {
      showInfoBox("Kepler-186F: A mysterious distant world orbiting a faraway star.", event);
    } else if (clickedObject.parent === exoplanetObject2) {
      showInfoBox("lp_791-18d: Another exoplanet with intriguing possibilities.", event);
    } else if (clickedObject.parent === sunObject) {
      showInfoBox("Sun: The star at the center of our solar system, providing light and heat.", event);
    }
  } else {
    hideInfoBox();
  }
}

window.addEventListener('click', onMouseClick, false);

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  earthMesh.rotation.y += 0.002;
  if (exoplanetObject1) exoplanetObject1.rotation.y += 0.002;
  if (exoplanetObject2) exoplanetObject2.rotation.y += 0.002;
  if (sunObject) sunObject.rotation.y += 0.002;

  stars.rotation.y -= 0.0012;

  renderer.render(scene, camera);
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
