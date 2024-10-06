import * as THREE from "three";
import { OrbitControls } from 'jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js';
import getStarfield from "../3dspace/threejs-earth-main/src/getStarfield.js";
im

// Set up scene, camera, and renderer
const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 10000);
// camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

// Add Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Smooth rotation
controls.dampingFactor = 0.1;   // Sensitivity of damping
controls.enablePan = true;      // Allow panning (move the camera)
controls.panSpeed = 0.5;        // Pan speed
controls.screenSpacePanning = true; // Pan the camera, not the target

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
const stars = getStarfield({ numStars: 1000 });
scene.add(stars);

// Add lights
const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// Function to get the query parameter value (planet Name)
function getPlanetFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('planet');
}

// Get the selected planet Name from the URL
const selectedPlanet = getPlanetFromURL();

// Function to load exoplanets and add clickable labels, limited to 50 units around the camera
async function loadExoplanets() {
  const maxDistance = 50; // Limit exoplanets to within 50 units around the camera

  try {
    const response = await fetch('./get_planets.php'); // Adjust the path if necessary
    const planets = await response.json();

    const gltfLoader = new GLTFLoader();

    planets.forEach(planet => {
      const { Name, size_earth_radii, xcoordinates, ycoordinates, zcoordinates } = planet;

      const distanceFromCamera = Math.sqrt(
        Math.pow(xcoordinates - camera.position.x, 2) +
        Math.pow(ycoordinates - camera.position.y, 2) +
        Math.pow(zcoordinates - camera.position.z, 2)
      );

      // Only add exoplanet if it's within 50 units of the camera
      if (distanceFromCamera <= maxDistance) {
        // Load planet model
        gltfLoader.load(
          `./models/exoplanet/${Name}/scene.gltf`,
          function (gltf) {
            const exoplanetObject = gltf.scene;
            exoplanetObject.scale.set(size_earth_radii, size_earth_radii, size_earth_radii);
            exoplanetObject.position.set(xcoordinates, ycoordinates, zcoordinates);
            exoplanetObject.Name = `Exoplanet_${Name}`; // Give a Name for identification

            // Apply textures
            exoplanetObject.traverse((child) => {
              if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                  map: loader.load(`./models/exoplanet/${Name}/textures/planet_diffuse.png`),
                  metalnessMap: loader.load(`./models/exoplanet/${Name}/textures/planet_specularGlossiness.png`),
                  transparent: true,
                  opacity: 0.8,
                  side: THREE.DoubleSide,
                  depthWrite: false,
                });

                // Add clouds
                const cloudsMaterial = new THREE.MeshStandardMaterial({
                  map: loader.load(`./models/exoplanet/${Name}/textures/clouds_diffuse.png`),
                  transparent: true,
                  opacity: 0.5,
                  side: THREE.DoubleSide,
                  depthWrite: false,
                });
                const cloudsMesh = new THREE.Mesh(child.geometry, cloudsMaterial);
                cloudsMesh.scale.set(1.02, 1.02, 1.02);
                exoplanetObject.add(cloudsMesh);
              }
            });

            // Add label for the exoplanet
            const label = createLabel(Name);
            label.position.copy(exoplanetObject.position.clone().add(new THREE.Vector3(0, 1.5 * size_earth_radii, 0)));
            exoplanetObject.add(label);

            scene.add(exoplanetObject);

            // If this is the selected planet, move the camera to its position
            if (Name === selectedPlanet) {
              jumpToPlanet(exoplanetObject); // Jump to the planet
            }
          },
          function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded (Exoplanet: ' + Name + ')');
          },
          function (error) {
            console.error(error);
          }
        );
      }
    });
  } catch (error) {
    console.error('Error loading exoplanet data:', error);
  }
}

// Function to create a label for each exoplanet
function createLabel(Name) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const fontSize = 50;
  context.font = `${fontSize}px Arial`;
  context.fillStyle = 'white';
  context.fillText(Name, 0, fontSize);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(2, 1, 1);
  return sprite;
}

// Load Exoplanet data
loadExoplanets();

// Add raycaster and mouse vector
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Get the info-box div
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

// Add event listener for mouse click
window.addEventListener('click', onMouseClick, false);

function onMouseClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  
  const intersects = raycaster.intersectObjects([earthMesh], true);
  
  const exoplanetObjects = scene.children.filter(child => child.isMesh && child.Name.startsWith("Exoplanet"));
  
  intersects.push(...raycaster.intersectObjects(exoplanetObjects, true));

  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;

    if (clickedObject === earthMesh) {
      showInfoBox("Earth: Our home planet with a 23.5° axial tilt.", event);
    } else if (clickedObject.Name.startsWith("Exoplanet")) {
      showInfoBox(`${clickedObject.Name}: A mysterious distant world orbiting a faraway star.`, event);
      jumpToPlanet(clickedObject); // Jump to the planet
    }
  } else {
    hideInfoBox(); // Hide the info box if nothing was clicked
  }
}

// Function to smoothly jump to the selected planet
function jumpToPlanet(planet) {
  const targetPosition = new THREE.Vector3();
  planet.getWorldPosition(targetPosition);

  const duration = 1; // Duration of the jump in seconds
  const startPosition = camera.position.clone();

  let startTime;

  function animateJump(time) {
    if (!startTime) startTime = time;
    const elapsed = (time - startTime) / 1000; // Convert ms to seconds

    if (elapsed < duration) {
      const t = elapsed / duration; // Normalized time [0,1]
      camera.position.lerpVectors(startPosition, targetPosition.clone().add(new THREE.Vector3(0, 2, -5)), t); 
      camera.lookAt(targetPosition);

      // Update the OrbitControls target during the jump
      controls.target.set(targetPosition.x, targetPosition.y, targetPosition.z);
      controls.update(); // Sync OrbitControls with camera movement

      // Request the next frame to continue animation
      requestAnimationFrame(animateJump);
    } else {
      // Once the jump is complete, set final camera position and controls
      camera.position.copy(targetPosition.clone().add(new THREE.Vector3(0, 2, -5)));
      camera.lookAt(targetPosition);

      // Set final OrbitControls target and update
      controls.target.set(targetPosition.x, targetPosition.y, targetPosition.z);
      controls.update();
    }
  }

  // Start the animation
  requestAnimationFrame(animateJump);
}

// Animation loop
function animate() {
   requestAnimationFrame(animate);

   earthMesh.rotation.y += 0.002;
   stars.rotation.y -= 0.0012;

   renderer.render(scene, camera);
   controls.update(); // Ensure controls are updated in each frame
}

animate();

// Handle window resize
window.addEventListener('resize', () => {
   camera.aspect = window.innerWidth / window.innerHeight;
   camera.updateProjectionMatrix();
   renderer.setSize(window.innerWidth, window.innerHeight);
});

// Configure mouse button controls:
// Left mouse for rotating (orbiting), Right mouse for panning (moving)
controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE, // Orbit (rotate)
  RIGHT: THREE.MOUSE.PAN,   // Pan (move)
};
// Function to show the info panel
function showInfoPanel(planetName, planetData) {
  const infoPanel = document.getElementById('info-panel');
  const title = document.getElementById('info-title');
  const contentElement = document.getElementById('info-content');

  title.textContent = planetName;
  planetData.mass_earths=1.71

  // Format planetData into HTML
  const planetDescription = `
    <strong>Mass:</strong> ${planetData.mass_earths} Earth masses<br>
    <strong>Radius:</strong> ${planetData.size_earth_radii} Earth radii<br>
    <strong>Orbital Period:</strong> ${planetData.location_days} days<br>
    <strong>Orbital Radius:</strong> ${planetData.orbital_radius_AU} AU<br>
    <strong>Description:</strong> ${planetData.description}<br>
    <strong>Discovery Date:</strong> ${planetData.discovery_date}<br>
    <strong>Discovery Method:</strong> ${planetData.discovery_method}
  `;

  contentElement.innerHTML = planetDescription;

  infoPanel.style.display = 'block';
}

// Function to hide the info panel
function hideInfoPanel() {
  const infoPanel = document.getElementById('info-panel');
  infoPanel.style.display = 'none';
}

// Function to fetch planet data from the server
async function fetchPlanetData(planetName) {
  try {
    // Make a request to get_planet_data.php with the planetName as a query parameter
    const response = await fetch(`./get_planet_data.php?planet=${encodeURIComponent(planetName)}`);
    const planetData = await response.json();

    if (planetData && !planetData.error) {
      showInfoPanel(planetName, planetData); // Show info panel with the planet data
    } else {
      showInfoPanel(planetName, { description: 'No additional data available.' });
    }
  } catch (error) {
    console.error('Error fetching planet data:', error);
    showInfoPanel(planetName, { description: 'Error fetching data.' });
  }
}

// index.js

if (selectedPlanet) {
  // Fetch and display data for the selected planet
  fetchPlanetData(selectedPlanet);
}
// Inside loadExoplanets function
if (Name === selectedPlanet) {
  jumpToPlanet(exoplanetObject); // Jump to the planet
  fetchPlanetData(Name); // Fetch and display data
}

