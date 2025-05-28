import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';

const canvas = document.querySelector('canvas#webgl');
const scene = new THREE.Scene();

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
};

const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 100);
camera.position.set(0, 2, 5);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new RGBELoader()
  .setPath('textures/')
  .load('environment.hdr', (texture) => {
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    scene.environment = envMap;
    texture.dispose();
    pmremGenerator.dispose();
  });

const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
gltfLoader.setDRACOLoader(dracoLoader);

let mixer;
let lever, wheel, revealGroup, revealAnimations = {};
let dragging = false, velocity = 0, spinning = false;

gltfLoader.load('models/spin_wheel.glb', (gltf) => {
  scene.add(gltf.scene);
  mixer = new THREE.AnimationMixer(gltf.scene);

  gltf.animations.forEach((clip) => {
    const action = mixer.clipAction(clip);
    action.loop = THREE.LoopOnce;
    action.clampWhenFinished = true;
    revealAnimations[clip.name] = action;
  });

  lever = gltf.scene.getObjectByName('Lever');
  wheel = gltf.scene.getObjectByName('Wheel');
  revealGroup = gltf.scene.getObjectByName('Reveal');
});

function spinWheel() {
  if (spinning || !lever || !wheel) return;

  spinning = true;
  velocity = 0.4 + Math.random() * 0.2;

  revealGroup.visible = false;

  const leverAnim = revealAnimations['LeverAction'];
  if (leverAnim) leverAnim.reset().play();

  const revealAnim = revealAnimations['RevealResult'];
  if (revealAnim) {
    revealAnim.reset();
    revealAnim.paused = true;
  }

  setTimeout(() => {
    if (revealAnim) {
      revealGroup.visible = true;
      revealAnim.paused = false;
      revealAnim.play();
    }
  }, 4000);
}

function onDragStart(event) {
  if (spinning) return;
  dragging = true;
}

function onDragEnd(event) {
  if (dragging) {
    dragging = false;
    spinWheel();
  }
}

canvas.addEventListener('mousedown', onDragStart);
canvas.addEventListener('mouseup', onDragEnd);
canvas.addEventListener('touchstart', onDragStart);
canvas.addEventListener('touchend', onDragEnd);

function tick() {
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);

  if (spinning && wheel) {
    wheel.rotation.z += velocity;
    velocity *= 0.985;
    if (velocity < 0.001) spinning = false;
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

const clock = new THREE.Clock();
tick();

window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

window.start = () => {
  const overlay = document.getElementById('overlay');
  const lottie = document.getElementById('intro-lottie');
  overlay.style.transition = 'opacity 1s';
  overlay.style.opacity = 0;
  setTimeout(() => {
    overlay.style.display = 'none';
    lottie?.remove();
  }, 1000);
};
