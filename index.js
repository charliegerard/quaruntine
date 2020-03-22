const videoWidth = 600;
const videoHeight = 500;
let map;
let leftArmUp = false;
let rightArmUp = false;
let video;
let realForestSelected = false;
let virtualForestSelected = false;
let virtualForestLoaded = false;
let realForestLoaded = false;
let currentBackground = "";

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
  return isAndroid() || isiOS();
}

let sound;

function setupSound() {
  sound = new Howl({
    src: ["forest.m4a"],
    loop: true,
    volume: 1,
    preload: true
  });
}

setupSound();

async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error(
      "Browser API navigator.mediaDevices.getUserMedia not available"
    );
  }

  const video = document.getElementById("video");
  video.width = videoWidth;
  video.height = videoHeight;

  const mobile = isMobile();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: mobile ? undefined : videoWidth,
      height: mobile ? undefined : videoHeight
    }
  });
  video.srcObject = stream;

  return new Promise(resolve => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function loadVideo() {
  const video = await setupCamera();
  video.play();

  return video;
}

const guiState = {
  algorithm: "single-pose",
  input: {
    mobileNetArchitecture: isMobile() ? "0.50" : "0.75",
    outputStride: 16,
    imageScaleFactor: 0.5
  },
  singlePoseDetection: {
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5
  },
  output: {
    showVideo: false,
    showPoints: true
  },
  net: null
};

function setupGui(cameras, net) {
  guiState.net = net;

  if (cameras.length > 0) {
    guiState.camera = cameras[0].deviceId;
  }
}

function detectPoseInRealTime(video, net) {
  const canvas = document.getElementById("output");
  const ctx = canvas.getContext("2d");
  // since images are being fed from a webcam
  const flipHorizontal = true;

  canvas.width = videoWidth;
  canvas.height = videoHeight;

  async function poseDetectionFrame() {
    if (guiState.changeToArchitecture) {
      // Important to purge variables and free up GPU memory
      guiState.net.dispose();

      // Load the PoseNet model weights for either the 0.50, 0.75, 1.00, or 1.01
      // version
      guiState.net = await posenet.load(+guiState.changeToArchitecture);
      guiState.changeToArchitecture = null;
    }

    // Scale an image down to a certain factor. Too large of an image will slow
    // down the GPU
    const imageScaleFactor = guiState.input.imageScaleFactor;
    const outputStride = +guiState.input.outputStride;

    let poses = [];
    let minPoseConfidence;
    let minPartConfidence;
    switch (guiState.algorithm) {
      case "single-pose":
        const pose = await guiState.net.estimateSinglePose(
          video,
          imageScaleFactor,
          flipHorizontal,
          outputStride
        );
        poses.push(pose);

        minPoseConfidence = +guiState.singlePoseDetection.minPoseConfidence;
        minPartConfidence = +guiState.singlePoseDetection.minPartConfidence;
        break;
    }

    ctx.clearRect(0, 0, videoWidth, videoHeight);

    if (guiState.output.showVideo) {
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-videoWidth, 0);
      ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
      ctx.restore();
    }

    // For each pose (i.e. person) detected in an image, loop through the poses
    // and draw the resulting skeleton and keypoints if over certain confidence
    // scores
    poses.forEach(({ score, keypoints }) => {
      if (score >= minPoseConfidence) {
        if (guiState.output.showPoints) {
          const leftWrist = keypoints.find(k => k.part === "leftWrist");
          const rightWrist = keypoints.find(k => k.part === "rightWrist");
          const leftElbow = keypoints.find(k => k.part === "leftElbow");
          const rightElbow = keypoints.find(k => k.part === "rightElbow");

          leftArmUp =
            leftWrist.position.y < leftElbow.position.y ? true : false;
          rightArmUp =
            rightWrist.position.y < rightElbow.position.y ? true : false;

          if (leftWrist.position.x > 550) {
            if (currentBackground === "real") {
              triggerVirtual();
            } else {
              triggerReal();
            }
          }

          if (leftArmUp && rightArmUp) {
            if (player !== undefined && player.playVideo) {
              player.playVideo();
            }
          } else {
            if (player !== undefined && player.pauseVideo) {
              player.pauseVideo();
            }
          }

          // drawKeypoints(
          //   [rightWrist, leftWrist, rightElbow, leftElbow],
          //   minPartConfidence,
          //   ctx
          // );
        }
      }
    });
    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}

async function bindPage() {
  const net = await posenet.load(0.75);
  document.getElementsByClassName("options")[0].disabled = false;
  document.getElementsByClassName("options")[1].disabled = false;
  document.getElementById("loading").style.display = "none";
  document.getElementById("intro-text").style.display = "block";

  let video;

  try {
    video = await loadVideo();
  } catch (e) {
    let info = document.getElementById("info");
    info.textContent =
      "this browser does not support video capture," +
      "or this device does not have a camera";
    info.style.display = "block";
    throw e;
  }

  setupGui([], net);
  detectPoseInRealTime(video, net);
}

navigator.getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;

bindPage();

document.getElementsByClassName("options")[0].onclick = () => {
  sound.play();
  initVideo();

  document.getElementsByTagName("main")[0].classList.add("fade-out");
  document.getElementById("player").style.display = "block";
  document.getElementById("ThreeJS").style.display = "none";
  realForestSelected = true;
  realForestLoaded = true;
  currentBackground = "real";
};

document.getElementsByClassName("options")[1].onclick = () => {
  sound.play();
  draw();
  currentBackground = "virtual";
  document.getElementById("ThreeJS").style.display = "block";
  document.getElementById("player").style.display = "none";

  document.getElementsByTagName("main")[0].style.display = "none";
  virtualForestSelected = true;
};

// switching

function triggerVirtual() {
  if (virtualForestLoaded) {
    document.getElementById("ThreeJS").style.display = "block";
  } else {
    draw();
  }
  draw();
  player.pauseVideo();
  document.getElementById("player").style.display = "none";
  currentBackground = "virtual";
  return;
}

function triggerReal() {
  if (realForestLoaded) {
    document.getElementById("player").style.display = "block";
    player.playVideo();
  } else {
    initVideo();
  }
  document.getElementById("ThreeJS").style.display = "none";
  currentBackground = "real";
  return;
}

// 3D ---------------------------

var container;
var collideMeshList = [];
var cubes = [];
var trees = [];
var crash = false;
var score = 0;
var id = 0;
var crashId = " ";
var lastCrashId = " ";

let scene,
  camera,
  renderer,
  simplex,
  plane,
  geometry,
  xZoom,
  yZoom,
  noiseStrength;
let skateboard, rock, rockMesh;
var gameStarted = false;
var zOrientation = 0;
// var sound;
var glitchPass, composer;

function setup() {
  virtualForestLoaded = true;
  setupRockModel();
  setupScene();
  setupPlane();
  setupLights();
}

function setupScene() {
  scene = new THREE.Scene();

  let res = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(75, res, 0.1, 1000);
  camera.position.set(0, -20, 1);
  camera.rotation.x = -300;

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.autoClear = false;
  renderer.setClearColor(0x000000, 0.0);
  renderer.setClearAlpha(1.0);

  document.body.appendChild(renderer.domElement);
}

function setupRockModel() {
  var loader = new THREE.OBJLoader();
  loader.load("forest/assets/PUSHILIN_rock.obj", function(object) {
    rock = object;
    rock.position.set(1, -18, -0.1);
    rock.rotation.set(2, 1.58, -0.5);
    rock.scale.set(0.4, 0.4, 0.4);

    let material = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      specular: 0x009900,
      shininess: 30,
      flatShading: true
    });
    rock.traverse(function(child) {
      if (child instanceof THREE.Mesh) {
        rockMesh = child;
        rockMesh.material = material;
      }
    });
    if (rock) {
      for (let i = 0; i < 200; i++) {
        setupInitialTrees();
      }
      for (let y = 0; y < 100; y++) {
        setupInitialRocks();
      }
    }
  });
}

function setupPlane() {
  let side = 120;
  geometry = new THREE.PlaneGeometry(100, 100, side, side);

  let material = new THREE.MeshStandardMaterial({
    // color: new THREE.Color("rgb(16,28,89)")
    color: new THREE.Color("rgb(167,159,149)")
  });

  plane = new THREE.Mesh(geometry, material);
  plane.castShadow = true;
  plane.receiveShadow = true;
  scene.add(plane);
}

function setupLights() {
  //   let ambientLight = new THREE.AmbientLight(new THREE.Color("rgb(195,44,110)"));
  //   let ambientLight = new THREE.AmbientLight(
  //     new THREE.Color("rgb(255,255,255)")
  //   );
  //   ambientLight.castShadow = true;
  //   ambientLight.position.set(10, -10, 100);
  //   ambientLight.rotation.set(10, 0, 0);
  //   scene.add(ambientLight);

  //   let spotLight = new THREE.SpotLight(0xffffff);
  //   spotLight.position.set(0, -10, 100);
  //   spotLight.castShadow = true;
  //   scene.add(spotLight);
  var light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.x = -100;
  light.position.y = 100;
  light.position.z = 200;
  //   light.rotation.x = -10;
  scene.add(light);

  var light2 = new THREE.DirectionalLight(0xffffff, 1, 100);
  light2.position.set(0, -10, 100); //default; light shining from top
  light2.castShadow = true; // default false
  scene.add(light2);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function init() {
  scene.fog = new THREE.FogExp2(new THREE.Color("#5a008a"), 0.0003);

  container = document.getElementById("ThreeJS");
  container.appendChild(renderer.domElement);
  renderer.render(scene, camera);

  window.addEventListener("resize", onWindowResize);
}

function draw() {
  let offset = Date.now() * 0.0004;
  if (gameStarted) {
    requestAnimationFrame(draw);
    update();
  }
  if (composer) {
    composer.render();
  }
  renderer.render(scene, camera);
}

function update() {
  //   if (Math.random() < 0.03 && cubes.length < 10) {
  if (Math.random() < 0.03 && cubes.length < 40) {
    makeRandomCube();
  }

  if (Math.random() < 0.03 && trees.length < 500) {
    makeRandomTrees();
  }

  for (i = 0; i < cubes.length; i++) {
    if (cubes[i].position.y < -20) {
      scene.remove(cubes[i]);
      cubes.splice(i, 1);
    } else {
      if (leftArmUp && rightArmUp) {
        cubes[i].position.y -= 0.05;
      }
    }
  }

  for (i = 0; i < trees.length; i++) {
    if (trees[i].position.y < -30) {
      scene.remove(trees[i]);
      trees.splice(i, 1);
    } else {
      if (leftArmUp && rightArmUp) {
        trees[i].position.y -= 0.05;
      }
    }
  }
}

function getRandomArbitrary(min, max, axis) {
  let random;
  if (axis === "x") {
    random = Math.random() * (max - min) + min;

    if (random > -2.7 && random < 2.7) {
      getRandomArbitrary(min, max, axis);
    } else {
      return random;
    }
  } else {
    return Math.random() * (max - min) + min;
  }
}

function makeRandomCube() {
  let material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    specular: 0x009900,
    flatShading: true
  });
  let rockGeometry = new THREE.Geometry().fromBufferGeometry(
    rock.children[0].geometry
  );

  var object = new THREE.Mesh(rockGeometry, material);
  object.receiveShadow = true;
  object.castShadow = true;
  object.position.x = getRandomArbitrary(-10, 10, "x");
  object.position.y = getRandomArbitrary(50, 0);
  object.position.z = 0;

  object.scale.set(0.4, 0.4, 0.4);
  object.rotation.set(2, 1.58, -0.5);

  cubes.push(object);
  object.name = "box_" + id;
  scene.add(object);
}

function makeRandomTrees() {
  var mtlLoader = new THREE.MTLLoader();
  mtlLoader.setPath("forest/assets/");
  mtlLoader.load("pine/materials.mtl", function(materials) {
    materials.preload();

    var objLoader = new THREE.OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.setPath("forest/assets/");
    objLoader.load("pine/model.obj", function(object) {
      spaceship = object;
      spaceship.position.set(1, -10, 4);
      spaceship.rotation.set(1.7, 0, 0);
      spaceship.position.x = getRandomArbitrary(-20, 20, "x");
      spaceship.position.y = getRandomArbitrary(100, 20);

      spaceship.scale.set(3, 3, 3);

      trees.push(spaceship);

      scene.add(spaceship);
      renderer.render(scene, camera);
    });
  });
}

function setupInitialTrees() {
  var mtlLoader = new THREE.MTLLoader();
  mtlLoader.setPath("forest/assets/");
  mtlLoader.load("pine/materials.mtl", function(materials) {
    materials.preload();

    var objLoader = new THREE.OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.setPath("forest/assets/");
    objLoader.load("pine/model.obj", function(object) {
      tree = object;
      tree.position.set(1, -10, 4);
      tree.rotation.set(1.7, 0, 0);
      tree.position.x = getRandomArbitrary(-20, 20, "x");
      tree.position.y = getRandomArbitrary(50, -20);

      tree.scale.set(3, 3, 3);

      trees.push(tree);

      scene.add(tree);
      renderer.render(scene, camera);
    });
  });
}

function setupInitialRocks() {
  let material = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    specular: 0x009900,
    flatShading: true
  });
  let rockGeometry = new THREE.Geometry().fromBufferGeometry(
    rock.children[0].geometry
  );

  var object = new THREE.Mesh(rockGeometry, material);
  object.receiveShadow = true;
  object.castShadow = true;
  object.position.x = getRandomArbitrary(-10, 10, "x");
  object.position.y = getRandomArbitrary(50, -20);
  object.position.z = 0;

  object.scale.set(0.4, 0.4, 0.4);
  object.rotation.set(2, 1.58, -0.5);

  cubes.push(object);
  scene.add(object);
}

gameStarted = true;
// draw();

setup();
init();
document.getElementById("ThreeJS").style.display = "block";
document.getElementById("player").style.display = "none";
