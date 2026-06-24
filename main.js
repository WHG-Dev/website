import * as THREE from 'three'
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import Chart from 'chart.js/auto'
import SunriseSunsetJS from 'sunrise-sunset-js'

// ==================== DOM Elements ====================
const lastUpdateTimeElement = document.getElementById("lastUpdate");
const currTemperatureElement = document.getElementById("currTemperature");
const currHumidityElement = document.getElementById("currHumidity");
const currPressureElement = document.getElementById("currPressure");

// ==================== Chart Configuration ====================
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: {
      display: true,
      labels: {
        color: "white",
        font: {
          size: 12
        }
      }
    }
  },
  scales: {
    y: {
      ticks: {
        color: "white"
      },
      beginAtZero: true,
      grid: {
        color: "rgba(255, 255, 255, 0.1)"
      }
    },
    x: {
      ticks: {
        color: "white"
      },
      grid: {
        color: "rgba(255, 255, 255, 0.1)"
      }
    }
  }
};

// ==================== Initialize Charts ====================
var tempChartctx = document.getElementById("temperatur-chart").getContext("2d");
var tempChart = new Chart(tempChartctx, {
  type: "line",
  data: {
    labels: ["10:00", "11:00", "12:00", "13:00", "14:00"],
    datasets: [{
      label: "Temperatur in °C",
      backgroundColor: "rgba(255, 200, 100, 0.1)",
      borderColor: "rgb(255, 200, 100)",
      borderWidth: 2,
      tension: 0.4,
      data: [15, 16, 17, 17, 16],
      fill: true,
      pointRadius: 4,
      pointBackgroundColor: "rgb(255, 200, 100)",
      pointBorderColor: "white",
      pointBorderWidth: 1
    }]
  },
  options: { ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, beginAtZero: true } } }
});

var pressureChartctx = document.getElementById("pressure-chart").getContext("2d");
var pressureChart = new Chart(pressureChartctx, {
  type: "line",
  data: {
    labels: ["10:00", "11:00", "12:00", "13:00", "14:00"],
    datasets: [{
      label: "mBar Luftdruck",
      backgroundColor: "rgba(100, 200, 255, 0.1)",
      borderColor: "rgb(100, 200, 255)",
      borderWidth: 2,
      tension: 0.4,
      data: [1015, 1013, 1012, 1014, 1016],
      fill: true,
      pointRadius: 4,
      pointBackgroundColor: "rgb(100, 200, 255)",
      pointBorderColor: "white",
      pointBorderWidth: 1
    }]
  },
  options: { ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, beginAtZero: false, suggestedMin: 950, suggestedMax: 1050 } } }
});

var humidityChartctx = document.getElementById("humidity-chart").getContext("2d");
var humidityChart = new Chart(humidityChartctx, {
  type: "line",
  data: {
    labels: ["10:00", "11:00", "12:00", "13:00", "14:00"],
    datasets: [{
      label: "relative Luftfeuchtigkeit",
      backgroundColor: "rgba(100, 255, 200, 0.1)",
      borderColor: "rgb(100, 255, 200)",
      borderWidth: 2,
      tension: 0.4,
      data: [50, 45, 55, 60, 70],
      fill: true,
      pointRadius: 4,
      pointBackgroundColor: "rgb(100, 255, 200)",
      pointBorderColor: "white",
      pointBorderWidth: 1
    }]
  },
  options: { ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, beginAtZero: true } } }
});

// ==================== Data Update Functions ====================
function updateCurrData(json) {
  console.log('Current data:', json);

  const data = json.data || json;

  currTemperatureElement.textContent = "Aktuell: " + (data.temperature || 25.38).toFixed(2) + "°C";
  currHumidityElement.textContent = "Aktuell: " + (data.humidity || 67.68).toFixed(2) + "%";

  const rawPressure = (data.pressure ?? data.bar ?? data.gasval ?? 1009);
  const pressure = rawPressure !== undefined && rawPressure !== null ? parseFloat(rawPressure) : 1009;
  const displayPressure = isNaN(pressure) ? 1009 : pressure;
  currPressureElement.textContent = "Aktuell: " + displayPressure + " hPa";

  const timestamp = data.unix_timestamp || data.unix;
  if (timestamp && timestamp > 0) {
    const date = new Date(timestamp * 1000);
    if (!isNaN(date.getTime())) {
      lastUpdateTimeElement.innerHTML = "letztes Update: <br>" + date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } else {
      lastUpdateTimeElement.innerHTML = "letztes Update: <br>Ungültige Zeit";
    }
  } else {
    lastUpdateTimeElement.innerHTML = "letztes Update: <br>23.06.2026, 21:46:08";
  }
}

function updateChartData(json) {
  console.log(json.data);
  if (!json.data) return;

  var times = [];
  var temps = [];
  var humidities = [];
  var pressures = [];

  json.data.forEach(entry => {
    times.push(new Date(entry.unix * 1000).toLocaleTimeString());
    temps.push(parseFloat(entry.temperature));
    humidities.push(parseFloat(entry.humidity));
    pressures.push(parseInt(entry.pressure));
  });

  humidityChart.data.labels = times;
  humidityChart.data.datasets[0].data = humidities;
  humidityChart.update();

  pressureChart.data.labels = times;
  pressureChart.data.datasets[0].data = pressures;
  pressureChart.update();

  tempChart.data.labels = times;
  tempChart.data.datasets[0].data = temps;
  tempChart.update();
}

// ==================== Three.js Scene Setup ====================
const latitude = 51.0662248, longitude = 6.433219;

let mouseX = 0;
let mouseY = 0;

// Renderer
const bgCanvas = document.querySelector("#bg");
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: bgCanvas,
  alpha: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight * 0.4);
renderer.setClearColor(0x000000, 0);

// Camera (Orthographic)
const camera = new THREE.OrthographicCamera(-20, 20, 20, -20, 0.1, 200);
camera.position.z = 10;

// Loaders
const ModelLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

// Scene
const scene = new THREE.Scene();

// Post-processing
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Cloud Model
let cloud;
ModelLoader.load("models/cloud1.gltf", function (gltf) {
  cloud = gltf.scene;
  cloud.scale.set(0.9, 0.9, 0.9);
  const cloudMat = new THREE.MeshToonMaterial({ color: 0xffffff, depthTest: false, depthWrite: false });
  cloud.traverse((o) => {
    if (o.isMesh) o.material = cloudMat;
  });
  cloud.renderOrder = 999;
  scene.add(cloud);
}, function (xhr) {
  console.log((xhr.loaded / xhr.total * 100) + "% loaded");
}, function (error) {
  console.error("Cloud model loading error:", error);
});

// Cloud animation variables
const cloudRelativePos = { x: 0.85, y: 0.7, z: -5 };
let cloudBasePos = new THREE.Vector3();
const baseCloudScale = 0.9;
const baseMoveRadius = 0.25;
let moveRadius = baseMoveRadius;
const speed = 0.5 + Math.random();
const maxRotation = 10;
let rotationSpeed = 0.0001;
let time = Math.random() * 1000;

function animateCloud(cloud) {
  time += 0.01;
  const offsetX = Math.sin(time * speed) * moveRadius;
  const offsetY = Math.cos(time * speed) * moveRadius;
  const offsetZ = Math.sin(time * speed) * moveRadius;

  cloud.position.set(cloudBasePos.x + offsetX, cloudBasePos.y + offsetY, cloudBasePos.z + offsetZ);

  cloud.rotation.x += (Math.random() - 0.5) * maxRotation * rotationSpeed;
  cloud.rotation.y += (Math.random() - 0.5) * maxRotation * rotationSpeed;
  cloud.rotation.z += (Math.random() - 0.5) * maxRotation * rotationSpeed;

  cloud.rotation.x = THREE.MathUtils.clamp(cloud.rotation.x, -Math.PI / 6, Math.PI / 6);
  cloud.rotation.y = THREE.MathUtils.clamp(cloud.rotation.y, -Math.PI / 6, Math.PI / 6);
  cloud.rotation.z = THREE.MathUtils.clamp(cloud.rotation.z, -Math.PI / 6, Math.PI / 6);
}

// Background plane
const backgroundPlaneGeo = new THREE.PlaneGeometry(100, 100, 1, 1);
const backgroundPlaneMat = new THREE.MeshToonMaterial({ color: 0x1a2d3f });
const backgroundPlaneMesh = new THREE.Mesh(backgroundPlaneGeo, backgroundPlaneMat);
backgroundPlaneMesh.position.z = -3;
scene.add(backgroundPlaneMesh);

// Lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x87cefa, 2);
scene.add(hemiLight);

const cursorLight = new THREE.PointLight(0xfc9601, 10, 0, 1.5);
scene.add(cursorLight);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  if (cloud) {
    animateCloud(cloud);
    if (cursorLight.position.distanceTo(cloud.position) < 5) {
      cloud.scale.set(1.02, 1.02, 1.02);
    } else {
      cloud.scale.set(1, 1, 1);
    }
  }
  composer.render();
}

animate();

// ==================== Responsive Updates ====================
function updateCameraSize() {
  const headerHeight = window.innerHeight * 0.4;
  const aspect = window.innerWidth / headerHeight;
  const viewSize = 10;

  camera.left = -viewSize * aspect;
  camera.right = viewSize * aspect;
  camera.top = viewSize;
  camera.bottom = -viewSize;

  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, headerHeight);
  backgroundPlaneMesh.scale.set(viewSize * aspect * 2, viewSize * 2, 1);

  // Compute cloud base position
  const left = -viewSize * aspect;
  const right = viewSize * aspect;
  const top = viewSize;
  const bottom = -viewSize;

  const width = right - left;
  const height = top - bottom;

  const worldX = left + cloudRelativePos.x * width;
  const worldY = top - cloudRelativePos.y * height;
  const worldZ = cloudRelativePos.z;
  cloudBasePos.set(worldX, worldY, worldZ);

  // Scale cloud based on screen size
  const rawWindow = Math.max(0.01, window.innerWidth / 1200);
  const scaleFactor = Math.max(0.35, Math.min(1.1, Math.pow(rawWindow, 0.7)));
  if (cloud) cloud.scale.set(baseCloudScale * scaleFactor, baseCloudScale * scaleFactor, baseCloudScale * scaleFactor);
  moveRadius = baseMoveRadius * scaleFactor;

  if (cloud) cloud.position.copy(cloudBasePos);
}

window.addEventListener('resize', updateCameraSize, false);
updateCameraSize();

// ==================== Mouse/Touch Events ====================
function onMouseMove(e) {
  const aspect = window.innerWidth / (window.innerHeight * 0.4);
  let mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  let mouseY = (e.clientY / (window.innerHeight * 0.4)) * 2 - 1;

  cursorLight.position.set(mouseX * 10 * aspect, -(mouseY * 10), -2);
}

function onTouchMove(e) {
  const touch = e.touches[0];
  const aspect = window.innerWidth / (window.innerHeight * 0.4);

  let touchX = (touch.clientX / window.innerWidth) * 2 - 1;
  let touchY = (touch.clientY / (window.innerHeight * 0.4)) * 2 - 1;

  cursorLight.position.set(touchX * 10 * aspect, -(touchY * 10), -2);
}

document.body.addEventListener("touchmove", onTouchMove, { passive: true });
document.body.addEventListener("mousemove", onMouseMove);

// ==================== Optional: Data Fetching (if API available) ====================
// Uncomment if you have a backend API
/*
function loadWeatherData() {
  fetch("/api/weather/current/default")
    .then(response => response.json())
    .then(data => updateCurrData(data))
    .catch(error => console.error("Error fetching current data:", error));

  fetch("/api/weather/default")
    .then(response => response.json())
    .then(data => updateChartData(data))
    .catch(error => console.error("Error fetching chart data:", error));
}

// Load on page load and every 30 seconds
window.addEventListener('load', loadWeatherData);
setInterval(loadWeatherData, 30000);
*/
