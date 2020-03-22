/* 3D skateboard model from https://poly.google.com/view/7Dfn4VtTCWY */
/* Rock model from https://poly.google.com/view/dmRuyy1VXEv */

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
var sound;
var glitchPass, composer;

setup();
init();
// draw();

function setup() {
  setupClouds();
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

function setupClouds() {
  var mtlLoader = new THREE.MTLLoader();
  let cloud;
  mtlLoader.setPath("assets/");
  mtlLoader.load("cloud/cloud.mtl", function(materials) {
    materials.preload();

    var objLoader = new THREE.OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.setPath("assets/");
    objLoader.load("cloud/cloud.obj", function(object) {
      cloud = object;
      cloud.position.set(1, -1, -10);
      cloud.scale.set(10, 10, 10);

      scene.add(cloud);
      renderer.render(scene, camera);
    });
  });
}

function setupRockModel() {
  var loader = new THREE.OBJLoader();
  loader.load("assets/PUSHILIN_rock.obj", function(object) {
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
      cubes[i].position.y -= 0.05;
    }
  }

  for (i = 0; i < trees.length; i++) {
    if (trees[i].position.y < -30) {
      scene.remove(trees[i]);
      trees.splice(i, 1);
    } else {
      trees[i].position.y -= 0.05;
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
  //   object.position.x = getRandomArbitrary(-2, 2);
  //   object.position.x = getRandomArbitrary(-10, -2) || getRandomArbitrary(2, 10);

  object.position.x = getRandomArbitrary(-10, 10, "x");
  object.position.y = getRandomArbitrary(50, 0);
  object.position.z = 0;

  object.scale.set(0.4, 0.4, 0.4);
  object.rotation.set(2, 1.58, -0.5);

  cubes.push(object);
  object.name = "box_" + id;
  id++;
  collideMeshList.push(object);

  scene.add(object);
}

function makeRandomTrees() {
  var mtlLoader = new THREE.MTLLoader();
  mtlLoader.setPath("assets/");
  mtlLoader.load("pine/materials.mtl", function(materials) {
    materials.preload();

    var objLoader = new THREE.OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.setPath("assets/");
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
  mtlLoader.setPath("assets/");
  mtlLoader.load("pine/materials.mtl", function(materials) {
    materials.preload();

    var objLoader = new THREE.OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.setPath("assets/");
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
draw();
