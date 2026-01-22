var lastUpdateTime = "nan:nan";
var espNames = [];
const lastUpdateTimeElement = document.getElementById("lastUpdate");
const sunriseElement = document.getElementById("sunrise");
const sunsetElement = document.getElementById("sunset");
const currHumidityElement = document.getElementById("currHumidity");
const currTemperatureElement = document.getElementById("currTemperature");
const currPressureElement = document.getElementById("currPressure");

const espSelectorElement = document.getElementById("espSelector");

// target element: second .no-border-box (if present). We will position the cloud near this box
const targetBox = (function () {
    const boxes = document.querySelectorAll('.no-border-box');
    return boxes && boxes.length > 1 ? boxes[1] : null;
})();

function setNames(names) {
    // Clear existing options first
    espSelectorElement.innerHTML = '';
    
    for (const key in names) {
        if (names.hasOwnProperty(key)) {
            const val = names[key];
            var option = document.createElement("option");
            option.text = val;
            // Extract sender_id from key (e.g., "sender_1" -> "1")
            option.dataset["senderId"] = key.replace('sender_', '');
            espSelectorElement.options.add(option);
        }
    }
}

function updateCurrData(json) {
    console.log('Current data:', json);
    
    // Handle both old format (direct properties) and new format (nested in data)
    const data = json.data || json;
    
    currTemperatureElement.textContent = "Aktuell: " + (data.temperature || 0).toFixed(2) + "°C";
    currHumidityElement.textContent = "Aktuell: " + (data.humidity || 0).toFixed(2) + "%";
    
    // Handle different pressure field names (pressure, bar, gasval)
    const rawPressure = (data.pressure ?? data.bar ?? data.gasval);
    const pressure = rawPressure !== undefined && rawPressure !== null ? parseFloat(rawPressure) : 0;
    const displayPressure = isNaN(pressure) ? 0 : pressure;
    currPressureElement.textContent = "Aktuell: " + displayPressure + " hPa";

    // Handle timestamp (unix_timestamp, unix, or use current time)
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
        lastUpdateTimeElement.innerHTML = "letztes Update: <br>Keine Zeitangabe";
    }

    // Sun position calculations
    const now = (timestamp && timestamp > 0) ? new Date(timestamp * 1000) : new Date();
    
    try {
        const sunrise = SunriseSunsetJS.getSunrise(latitude, longitude, now);
        const sunset = SunriseSunsetJS.getSunset(latitude, longitude, now);
        sunriseElement.textContent = sunrise.getHours().toString().padStart(2, "0") + ":" + 
                                    sunrise.getMinutes().toString().padStart(2, "0");
        sunsetElement.textContent = sunset.getHours().toString().padStart(2, "0") + ":" + 
                                   sunset.getMinutes().toString().padStart(2, "0");
    } catch (error) {
        console.error('Error calculating sun times:', error);
    }
}

function updateChartData(json) {
    console.log('Chart data:', json);
    
    // Handle response format { data: [...] }
    const dataArray = Array.isArray(json) ? json : (json.data || []);
    
    var times = [];
    var temps = [];
    var humidities = [];
    var pressures = [];

    dataArray.forEach(entry => {
        // Handle both unix_timestamp and unix
        const timestamp = entry.unix_timestamp || entry.unix;
        
        if (timestamp && timestamp > 0) {
            const date = new Date(timestamp * 1000);
            if (!isNaN(date.getTime())) {
                times.push(date.toLocaleTimeString('de-DE', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                }));
            } else {
                times.push('--:--');
            }
        } else {
            times.push('--:--');
        }
        
        temps.push(parseFloat(entry.temperature || 0));
        humidities.push(parseFloat(entry.humidity || 0));
        
        // Handle different pressure field names
        const pressure = entry.pressure || entry.bar || entry.gasval || 0;
        pressures.push(parseInt(pressure));
    });

    // Update charts
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

function getCurrentSenderId() {
    const selectedOption = espSelectorElement.options[espSelectorElement.selectedIndex];
    return selectedOption ? selectedOption.dataset.senderId : null;
}

function setNamesAndUpdateOnLoad() {
    fetch("/names")
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(json => {
            setNames(json);
            return getCurrentSenderId();
        })
        .then(senderId => {
            if (!senderId) {
                console.log('No sender selected');
                return;
            }
            
            // Fetch chart data (hourly samples)
            return fetch(`/api/weather/${senderId}?hours=5`)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.json();
                })
                .then(response => updateChartData(response))
                .then(() => {
                    // Fetch current data
                    return fetch(`/api/weather/current/${senderId}`)
                        .then(response => {
                            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                            return response.json();
                        })
                        .then(response => updateCurrData(response));
                });
        })
        .catch(error => {
            console.error("Error loading data:", error);
            lastUpdateTimeElement.innerHTML = "Fehler beim Laden der Daten";
        });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', setNamesAndUpdateOnLoad);

function updateCharts() {
    const senderId = getCurrentSenderId();
    
    if (!senderId) {
        console.log('No sender selected');
        return;
    }

    console.log("Updating charts for sender:", senderId);
    
    // Fetch chart data
    fetch(`/api/weather/${senderId}?hours=5`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(response => updateChartData(response))
        .catch(error => console.error("Error updating chart data:", error));
    
    // Fetch current data
    fetch(`/api/weather/current/${senderId}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(response => updateCurrData(response))
        .catch(error => console.error("Error updating current data:", error));
}

espSelectorElement.onchange = updateCharts;

// Auto-update every 30 seconds
setInterval(updateCharts, 30000);

// ============================================================================
// Three.js Scene Setup
// ============================================================================

import * as THREE from 'three'
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import Chart from 'chart.js/auto'
import SunriseSunsetJS from 'sunrise-sunset-js'

const latitude = 51.0662248, longitude = 6.433219;

const options = {
    plugins: {
        legend: {
            display: true, 
            labels: {
                color: "white"
            }
        }
    }
};

var tempChartctx = document.getElementById("temperatur-chart").getContext("2d");
var tempChart = new Chart(tempChartctx, {
    type: "line", 
    data: {
        labels: [], 
        datasets: [{
            label: "Temperatur in °C",
            backgroundColor: "white",
            borderColor: "white",
            color: "white",
            data: []
        }]
    }, 
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false, 
        plugins: {
            legend: {
                display: true, 
                labels: {
                    color: "white"
                }
            }
        }, 
        scales: {
            y: {
                ticks: {
                    color: "white"
                }, 
                beginAtZero: false
            }, 
            x: {
                ticks: {
                    color: "white"
                }
            }
        }
    }
});

var pressureChartctx = document.getElementById("pressure-chart").getContext("2d");
var pressureChart = new Chart(pressureChartctx, {
    type: "bar", 
    data: {
        labels: [], 
        datasets: [{
            label: "Luftdruck (hPa)",
            backgroundColor: "#259ed9",
            borderColor: "#253949",
            borderWidth: 1.5,
            data: []
        }]
    }, 
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: {
                display: true, 
                labels: {
                    color: "white"
                }
            }
        }, 
        scales: {
            y: {
                ticks: {
                    color: "white"
                }, 
                beginAtZero: false
            }, 
            x: {
                ticks: {
                    color: "white"
                }
            }
        }
    }
});

var humidityChartctx = document.getElementById("humidity-chart").getContext("2d");
var humidityChart = new Chart(humidityChartctx, {
    type: "line", 
    data: {
        labels: [], 
        datasets: [{
            label: "relative Luftfeuchtigkeit (%)",
            backgroundColor: "white",
            borderColor: "white",
            data: []
        }]
    }, 
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: {
                display: true, 
                labels: {
                    color: "white"
                }
            }
        }, 
        scales: {
            y: {
                ticks: {
                    color: "white"
                }, 
                beginAtZero: true
            }, 
            x: {
                ticks: {
                    color: "white"
                }
            }
        }
    }
});

// ============================================================================
// Three.js Animation
// ============================================================================

//Renderer
const renderer = new THREE.WebGLRenderer({
    antialias: true, 
    canvas: document.querySelector("#bg")
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x253949, 1);

//camera
const camera = new THREE.OrthographicCamera(-20, 20, 20, -20, .1, 200);
camera.position.z = 10;

//Loaders
const ModelLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

//Scene
const scene = new THREE.Scene();

//composer
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

//Cloud Model
let cloud;
ModelLoader.load("models/cloud1.gltf", function (gltf) {
    cloud = gltf.scene;
    cloud.scale.set(0.9, 0.9, 0.9);
    const cloudMat = new THREE.MeshToonMaterial({ 
        color: 0xffffff, 
        depthTest: false, 
        depthWrite: false 
    });
    cloud.traverse((o) => {
        if (o.isMesh) o.material = cloudMat;
    });
    cloud.renderOrder = 999;
    scene.add(cloud);
}, function (xhr) {
    console.log((xhr.loaded / xhr.total * 100) + "% loaded");
}, function (error) {
    console.error('Error loading cloud model:', error);
});

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

const backgroundPlaneGeo = new THREE.PlaneGeometry(100, 100, 1, 1);
const backgroundPlaneMat = new THREE.MeshToonMaterial({ color: 0x253949 });
const backgroundPlaneMesh = new THREE.Mesh(backgroundPlaneGeo, backgroundPlaneMat);
backgroundPlaneMesh.position.z = -3;
scene.add(backgroundPlaneMesh);

//Lights
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x87cefa, 2);
scene.add(hemiLight);

const cursorLight = new THREE.PointLight(0xfc9601, 10, 0, 1.5);
scene.add(cursorLight);

//Animation Loop
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

function updateCameraSize() {
    const aspect = window.innerWidth / window.innerHeight;
    const viewSize = 10;

    camera.left = -viewSize * aspect;
    camera.right = viewSize * aspect;
    camera.top = viewSize;
    camera.bottom = -viewSize;

    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    backgroundPlaneMesh.scale.set(viewSize * aspect * 2, viewSize * 2, 1);

    function computeCloudBasePos(viewSize, aspect) {
        const left = -viewSize * aspect;
        const right = viewSize * aspect;
        const top = viewSize;
        const bottom = -viewSize;

        const width = right - left;
        const height = top - bottom;

        const worldX = left + cloudRelativePos.x * width;
        const worldY = top - cloudRelativePos.y * height;
        const worldZ = cloudRelativePos.z;
        return new THREE.Vector3(worldX, worldY, worldZ);
    }

    if (targetBox) {
        const rect = targetBox.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const screenOffsetX = -rect.width * 0.10;
        const shiftedCenterX = centerX + screenOffsetX;
        const nx = shiftedCenterX / window.innerWidth;
        const ny = centerY / window.innerHeight;

        const left = -viewSize * aspect;
        const right = viewSize * aspect;
        const top = viewSize;
        const bottom = -viewSize;

        const worldX = left + nx * (right - left);
        const worldY = top - ny * (top - bottom);
        cloudBasePos.set(worldX, worldY, cloudRelativePos.z);
        
        const refWidth = 420;
        const raw = Math.max(0.01, rect.width / refWidth);
        const scaleFactor = Math.max(0.35, Math.min(1.1, Math.pow(raw, 0.7)));
        if (cloud) cloud.scale.set(baseCloudScale * scaleFactor, baseCloudScale * scaleFactor, baseCloudScale * scaleFactor);
        moveRadius = baseMoveRadius * scaleFactor;
    } else {
        cloudBasePos = computeCloudBasePos(viewSize, aspect);
        const rawWindow = Math.max(0.01, window.innerWidth / 1200);
        const scaleFactor = Math.max(0.35, Math.min(1.1, Math.pow(rawWindow, 0.7)));
        if (cloud) cloud.scale.set(baseCloudScale * scaleFactor, baseCloudScale * scaleFactor, baseCloudScale * scaleFactor);
        moveRadius = baseMoveRadius * scaleFactor;
    }
    if (cloud) cloud.position.copy(cloudBasePos);
}

window.addEventListener('resize', updateCameraSize, false);
updateCameraSize();

function onMouseMove(e) {
    const aspect = window.innerWidth / window.innerHeight;
    let mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    let mouseY = (e.clientY / window.innerHeight) * 2 - 1;

    cursorLight.position.set(mouseX * 10 * aspect, -(mouseY * 10), -2);
}

function onTouchMove(e) {
    const touch = e.touches[0];
    const aspect = window.innerWidth / window.innerHeight;

    let mouseX = (touch.clientX / window.innerWidth) * 2 - 1;
    let mouseY = (touch.clientY / window.innerHeight) * 2 - 1;

    cursorLight.position.set(mouseX * 10 * aspect, -(mouseY * 10), -2);
}

document.body.addEventListener("touchmove", onTouchMove, { passive: true });
document.body.onmousemove = onMouseMove;