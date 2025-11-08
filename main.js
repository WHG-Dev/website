var lastUpdateTime = "nan:nan";
var espNames = [];
const lastUpdateTimeElement = document.getElementById("lastUpdate");
//const azimuthElement = document.getElementById("azimuth");
//const altitudeElement = document.getElementById("altitude");
const sunriseElement = document.getElementById("sunrise");
const sunsetElement = document.getElementById("sunset");
const currHumidityElement = document.getElementById("currHumidity");
const currTemperatureElement = document.getElementById("currTemperature");
const currPressureElement = document.getElementById("currPressure");

const espSelectorElement = document.getElementById("espSelector");

function setNames(names) {
    for (const key in names) {
        if (names.hasOwnProperty(key)) {
            const val = names[key];
            var option = document.createElement("option")
            option.text = val;
            option.dataset["dbName"] = key;
            espSelectorElement.options.add(option);
        }
    }

    /*
    names.forEach(name => {
      if (name != "none"){
        name = name.slice(7); //Entfernt "sender_'"
        var option = document.createElement("option")
        option.text = name
        espSelectorElement.options.add(option);
        espNames.push(name);
        //console.log(espNames);
      }
    });
    */
}

function updateCurrData(json) {
    console.log(json);
    currTemperatureElement.textContent = "Aktuell:" + json.temperature.toFixed(2) + "°C";
    currHumidityElement.textContent = "Aktuell:" + json.humidity.toFixed(2) + "%";
    currPressureElement.textContent = "Aktuell:" + json.bar + "ppm";

    lastUpdateTimeElement.innerHTML = "letztes Update: \<br\>" + json.timestamp;

    const now = new Date(json.unix*1000);
    /*
    const sunPosition = SunCalc.getPosition(now, latitude, longitude);
    const azimuth = (sunPosition.azimuth * 180) / Math.PI;
    const altitude = (sunPosition.altitude * 180) / Math.PI;
    azimuthElement.textContent = azimuth.toFixed(2)+"°";
    altitudeElement.textContent = altitude.toFixed(2)+"°";
    */

    const sunrise = getSunrise(latitude, longitude, now);
    const sunset = getSunset(latitude, longitude, now);
    sunriseElement.textContent = sunrise.getHours().toString().padStart(2, "0") + ":" + sunrise.getMinutes().toString().padStart(2, "0");
    sunsetElement.textContent = sunset.getHours().toString().padStart(2, "0") + ":" + sunset.getMinutes().toString().padStart(2, "0");
}

function updateChartData(json) {
    console.log(json.data);
    var times = [];
    var temps = [];
    var humidities = [];
    var pressures = [];

    json.data.forEach(entry => {
        times.push(entry.timestamp);
        temps.push(parseFloat(entry.temperature));
        humidities.push(parseFloat(entry.humidity));
        pressures.push(parseInt(entry.bar));
    })

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

function setNamesAndUpdateOnLoad() {
    fetch("/names")
        .then(response => response.json())
        //.then(text => {espNames = text["tables"];console.log(text["tables"])})
        .then(json => setNames(json))
        .then(_ => fetch("/api/weather/" + espSelectorElement.options[espSelectorElement.selectedIndex].dataset.dbName)
            .then(response => response.json())
            .then(response => updateChartData(response)))
        .then(_ => fetch("/api/weather/current/" + espSelectorElement.options[espSelectorElement.selectedIndex].dataset.dbName)
            .then(response => response.json())
            .then(response => updateCurrData(response)))
        .catch(error => console.error("Error:", error));
}

//lastUpdateTimeElement.onload = setNamesAndUpdateOnLoad();

function updateCharts() {
    if (espSelectorElement.value.length != 0) {
        console.log("Aendert auf ESP " + espSelectorElement.value);
        fetch("/api/weather/" + espSelectorElement.options[espSelectorElement.selectedIndex].dataset.dbName)
            .then(response => response.json())
            .then(response => updateChartData(response));
        fetch("/api/weather/current/" + espSelectorElement.options[espSelectorElement.selectedIndex].dataset.dbName)
            .then(response => response.json())
            .then(response => updateCurrData(response));
    }
}

espSelectorElement.onchange = updateCharts;

setInterval(updateCharts, 30000);

import Chart from "chart.js/auto"
//import SunCalc from "suncalc"
import {getSunrise, getSunset} from "sunrise-sunset-js";
import * as THREE from "three"
import {EffectComposer} from "three/addons/postprocessing/EffectComposer.js";
import {RenderPass} from "three/addons/postprocessing/RenderPass.js";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";

const options = {
    plugins: {
        legend: {
            display: true, labels: {
                color: "white"
            }
        }
    }
}

var tempChartctx = document.getElementById("temperatur-chart").getContext("2d");
var tempChart = new Chart(tempChartctx, {
    type: "line", data: {
        labels: ["10:00:00", "11:00:00", "12:00:00", "13:00:00", "14:00:00"], datasets: [{
            label: "Temperatur in °C",
            backgroundColor: "white",
            borderColor: "white",
            color: "white",
            data: [15, 16, 17, 17, 16]
        }]
    }, options: {
        responsive: true, animation: false, plugins: {
            legend: {
                display: true, labels: {
                    color: "white"
                }
            }
        }, scales: {
            y: {
                ticks: {
                    color: "white"
                }, beginAtZero: true
            }, x: {
                ticks: {
                    color: "white"
                }
            }
        }
    }
})

var pressureChartctx = document.getElementById("pressure-chart").getContext("2d")
var pressureChart = new Chart(pressureChartctx, {
    type: "bar", data: {
        labels: ["10:00:00", "11:00:00", "12:00:00", "13:00:00", "14:00:00"], datasets: [{
            label: "mBar Luftdruck",
            backgroundColor: "#259ed9",
            borderColor: "#253949",
            borderWidth: 1.5,
            data: [50, 45, 55, 60, 70]
        }]
    }, options: {
        responsive: true, animation: false, plugins: {
            legend: {
                display: true, labels: {
                    color: "white"
                }
            }
        }, scales: {
            y: {
                ticks: {
                    color: "white"
                }, beginAtZero: true
            }, x: {
                ticks: {
                    color: "white"
                }
            }
        }
    }
})


var humidityChartctx = document.getElementById("humidity-chart").getContext("2d")
var humidityChart = new Chart(humidityChartctx, {
    type: "line", data: {
        labels: ["10:00:00", "11:00:00", "12:00:00", "13:00:00", "14:00:00"], datasets: [{
            label: "relative Luftfeuchtigkeit",
            backgroundColor: "white",
            borderColor: "white",
            data: [50, 45, 55, 60, 70]
        }]
    }, options: {
        responsive: true, animation: false, plugins: {
            legend: {
                display: true, labels: {
                    color: "white"
                }
            }
        }, scales: {
            y: {
                ticks: {
                    color: "white"
                }, beginAtZero: true
            }, x: {
                ticks: {
                    color: "white"
                }
            }
        }
    }
})

const latitude = 51.0662248, longitude = 6.433219;
//const data = '{"temperature":22.799999237060547,"humidity":52.200000762939453,"gasval":17,"time":"16:00","hour":16,"name":"H014"}%{"temperature":22.700000762939453,"humidity":53.099998474121094,"gasval":18,"time":"17:00","hour":17,"name":"H014"}%{"temperature":22.5,"humidity":52.599998474121094,"gasval":17,"time":"18:00","hour":18,"name":"H014"}%{"temperature":22.799999237060547,"humidity":52.700000762939453,"gasval":17,"time":"19:00","hour":19,"name":"H014"}%{"temperature":22.799999237060547,"humidity":52.799999237060547,"gasval":17,"time":"20:00","hour":20,"name":"H014"}%H014%none%none%none%none%none%none%none%none%none'
//updateCharts(data);
//setNames(espNames);
//console.log(espNames);

//const currData =  '{"temperature":20.600000381469727,"humidity":55.599998474121094,"gasval":18,"time":"17:12"}';
//updateCurrData(currData);

//Mouse Variablen
let mouseX = 0;
let mouseY = 0;

//Renderer
const renderer = new THREE.WebGLRenderer({
    antialias: true, canvas: document.querySelector("#bg")
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x253949, 1);

//camera
const camera = new THREE.OrthographicCamera(-20, 20, 20, -20, .1, 200);//(90,window.innerWidth / window.innerHeight,.1,5000);
camera.position.z = 10;


//Loaders
const ModelLoader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader()

//Scene
const scene = new THREE.Scene();

//composer
const composer = new EffectComposer(renderer)
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

//Objekte
let cloud
ModelLoader.load("models/cloud1.gltf", function (gltf) {
    cloud = gltf.scene;
    cloud.scale.set(0.9, 0.9, 0.9)
    const cloudMat = new THREE.MeshToonMaterial({color: 0xffffff, depthTest: false, depthWrite: false});
    cloud.traverse((o) => {
        if (o.isMesh) o.material = cloudMat;
    });
    cloud.renderOrder = 999;
    scene.add(cloud);
}, function (xhr) {
    console.log((xhr.loaded / xhr.total * 100) + "% loaded");
}, function (error) {
    console.error(error);
})
const cloudBasePos = new THREE.Vector3(11.5, 4.75, -5);
const moveRadius = .25;
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


//const sunGeo = new THREE.IcosahedronGeometry(2,64);
//const sunMat = new THREE.MeshBasicMaterial({color: 0xffcc33})
//const sunMesh = new THREE.Mesh(sunGeo,sunMat);
//sunMesh.position.x = -15
//sunMesh.position.y = 6
//sunMesh.position.z = -10
//scene.add(sunMesh);

const backgroundPlaneGeo = new THREE.PlaneGeometry(100, 100, 1, 1);
const backgroundPlaneMat = new THREE.MeshToonMaterial({color: 0x253949})
const backgroundPlaneMesh = new THREE.Mesh(backgroundPlaneGeo, backgroundPlaneMat);
backgroundPlaneMesh.position.z = -3;
scene.add(backgroundPlaneMesh);


const div = document.getElementById("temperatur");

//Licht
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x87cefa, 2);
hemiLight.rotateY
hemiLight.translateX
scene.add(hemiLight);

const cursorLight = new THREE.PointLight(0xfc9601, 10, 0, 1.5);
scene.add(cursorLight);

//animation
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
    //renderer.render(scene,camera);
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
    backgroundPlaneMesh.scale.set(viewSize * aspect * 2, /* aspect * */viewSize * 2, 1);
}

window.addEventListener('resize', updateCameraSize, false);
updateCameraSize();

function onMouseMove(e) {
    const aspect = window.innerWidth / window.innerHeight;
    let mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    let mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    //console.log(mouseX,mouseY);

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
