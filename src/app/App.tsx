import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// ---------------------------------------------------------------------------
// Breakpoint hook
// ---------------------------------------------------------------------------
type BP = "mobile" | "tablet" | "desktop";

function getBP(w: number): BP {
  return w < 640 ? "mobile" : w < 1024 ? "tablet" : "desktop";
}

function useBreakpoint(): BP {
  const [bp, setBp] = useState<BP>(() => getBP(typeof window !== "undefined" ? window.innerWidth : 1024));
  useEffect(() => {
    const update = () => setBp(getBP(window.innerWidth));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return bp;
}

// Cloud world-space position per breakpoint
const CLOUD_POS: Record<BP, [number, number, number]> = {
  mobile:  [0,    3.6, 0],   // high enough to clear HTML content
  tablet:  [2.0,  1.0, 0],
  desktop: [3.0,  1.2, 0],
};

// ---------------------------------------------------------------------------
// Full-screen Three.js background + cloud
// ---------------------------------------------------------------------------
function BackgroundScene() {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ nx: 0, ny: 0 });
  const bpRef    = useRef<BP>(getBP(typeof window !== "undefined" ? window.innerWidth : 1024));

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // --- renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0d1520, 1);
    el.appendChild(renderer.domElement);

    // --- scene & camera ---
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 10);

    // --- background plane — sized to always cover the full frustum ---
    const planeMat = new THREE.MeshStandardMaterial({ color: 0x14243a, roughness: 1, metalness: 0 });
    // At z=-3 the camera distance is 13; compute visible extents with generous padding
    const planeZ = -3;
    const dist   = camera.position.z - planeZ; // 13
    const hh     = dist * Math.tan((camera.fov / 2) * (Math.PI / 180));
    const hw     = hh * (window.innerWidth / window.innerHeight);
    const plane  = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.max(hw * 2 + 4, 80), Math.max(hh * 2 + 4, 80)),
      planeMat
    );
    plane.position.z = planeZ;
    scene.add(plane);

    // --- base ambient (dim blue) ---
    scene.add(new THREE.AmbientLight(0x1a2d50, 1.2));

    // --- static hemisphere for soft sky/ground gradient on everything ---
    const hemi = new THREE.HemisphereLight(0xc8d8f0, 0x0a1020, 0.6);
    scene.add(hemi);

    // --- yellow point light — follows mouse, illuminates plane + cloud ---
    const pointLight = new THREE.PointLight(0xffdd44, 60, 40, 1.4);
    pointLight.position.set(0, 3, 5);
    scene.add(pointLight);

    // Raycaster + virtual plane for accurate mouse → world unprojection
    const raycaster  = new THREE.Raycaster();
    const lightPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -5); // z=5 plane
    const lightTarget = new THREE.Vector3();

    // --- subtle fill from opposite side so cloud isn't pitch-black ---
    const fill = new THREE.DirectionalLight(0x6080c0, 0.4);
    fill.position.set(-4, 2, 5);
    scene.add(fill);

    // --- cloud (scaled down, white-ish) ---
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xf0f4ff, roughness: 0.6, metalness: 0 });
    const cloud    = new THREE.Group();

    const blobs: [number, number, number, number][] = [
      [0,     0,     0,    0.65],
      [-0.65,-0.07,  0.10, 0.53],
      [0.65, -0.03,  0.06, 0.55],
      [-0.26, 0.33,  0,    0.44],
      [0.33,  0.30,  0.03, 0.42],
      [-0.97,-0.20,  0,    0.36],
      [1.01, -0.20,  0,    0.34],
      [0,    -0.33,  0.16, 0.40],
    ];
    blobs.forEach(([x, y, z, r]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 28), cloudMat);
      m.position.set(x, y, z);
      cloud.add(m);
    });

    const [cx, cy, cz] = CLOUD_POS[bpRef.current];
    cloud.position.set(cx, cy, cz);
    scene.add(cloud);

    // --- mouse ---
    const onMouse = (e: MouseEvent) => {
      mouseRef.current.nx = (e.clientX / window.innerWidth)  * 2 - 1;
      mouseRef.current.ny = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("mousemove", onMouse);

    // Touch support for mobile
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      mouseRef.current.nx = (t.clientX / window.innerWidth)  * 2 - 1;
      mouseRef.current.ny = -((t.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("touchmove", onTouch, { passive: true });

    // --- resize ---
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      // Resize plane to always cover the frustum
      const d2  = camera.position.z - planeZ;
      const hh2 = d2 * Math.tan((camera.fov / 2) * (Math.PI / 180));
      const hw2 = hh2 * (w / h);
      plane.geometry.dispose();
      plane.geometry = new THREE.PlaneGeometry(Math.max(hw2 * 2 + 4, 80), Math.max(hh2 * 2 + 4, 80));
      const newBp = getBP(w);
      bpRef.current = newBp;
      const [px, py, pz] = CLOUD_POS[newBp];
      cloud.position.set(px, py, pz);
    };
    window.addEventListener("resize", onResize);

    // --- animation ---
    let raf: number;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const { nx, ny } = mouseRef.current;
      // Unproject mouse NDC onto the z=5 world plane for accurate tracking
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
      if (raycaster.ray.intersectPlane(lightPlane, lightTarget)) {
        pointLight.position.copy(lightTarget);
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 z-0" />;
}

// ---------------------------------------------------------------------------
// Chart.js metric card
// ---------------------------------------------------------------------------
function makeSeries(base: number, variance: number, count = 20) {
  return Array.from({ length: count }, (_, i) => ({
    label: `${String((6 + i) % 24).padStart(2, "0")}:00`,
    value: parseFloat((base + (Math.random() - 0.5) * variance * 2).toFixed(2)),
  }));
}

interface MetricCardProps {
  title: string;
  current: string;
  unit: string;
  series: { label: string; value: number }[];
  color: string;
}

function MetricCard({ title, current, unit, series, color }: MetricCardProps) {
  const chartData = {
    labels: series.map((d) => d.label),
    datasets: [
      {
        data: series.map((d) => d.value),
        borderColor: color,
        borderWidth: 1.5,
        backgroundColor: `${color}28`,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 } as const,
    scales: { x: { display: false }, y: { display: false } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0f172a",
        titleColor: "#94a3b8",
        bodyColor: "#f3f4f6",
        callbacks: { label: (c: { parsed: { y: number } }) => `${c.parsed.y}${unit}` },
      },
    },
  };

  return (
    <div className="bg-[#1a2640]/80 backdrop-blur-sm rounded-2xl p-4 sm:p-5 flex flex-col gap-2 flex-1 min-w-0 border border-white/5">
      <h3 className="text-white/90 font-semibold text-sm tracking-wide">{title}</h3>
      <p className="text-white/40 text-xs">
        Aktuell:{" "}
        <span className="text-white/80 font-semibold">{current}{unit}</span>
      </p>
      <div className="h-20 sm:h-24 w-full mt-1">
        <Line data={chartData} options={opts} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Station options
// ---------------------------------------------------------------------------
const STATIONS = ["Schulgarten", "Dachstation", "Messfeld Nord", "Messfeld Süd", "Gewächshaus"];

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export default function App() {
  const [now, setNow]         = useState(new Date());
  const [station, setStation] = useState(STATIONS[0]);
  const bp = useBreakpoint();

  const [tempData]     = useState(() => makeSeries(33.44, 2));
  const [pressureData] = useState(() => makeSeries(1007,  5));
  const [humidityData] = useState(() => makeSeries(43.95, 8));

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fmt = (d: Date) =>
    `${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}, ${d.toLocaleTimeString("de-DE")}`;

  return (
    <>
      <BackgroundScene />

      <div
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-8 gap-6 sm:gap-8"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Station selector */}
        <select
          value={station}
          onChange={(e) => setStation(e.target.value)}
          className="bg-white/10 text-white/70 text-sm px-5 py-1.5 rounded-full border border-white/15 outline-none cursor-pointer backdrop-blur-sm"
        >
          {STATIONS.map((s) => (
            <option key={s} value={s} style={{ background: "#1a2640" }}>
              {s}
            </option>
          ))}
        </select>

        {/* ── Mobile ── */}
        {bp === "mobile" && (
          <div className="flex flex-col items-center gap-5 w-full max-w-sm">
            {/* Reserve vertical space for the 3D cloud sitting at y=3.6 */}
            <div className="h-36" />
            <div className="bg-[#1a2640]/80 backdrop-blur-sm rounded-2xl px-6 py-5 text-white border border-white/5 w-full">
              <div className="flex justify-around items-center">
                <div className="text-center">
                  <p className="text-white/40 text-xs mb-1">Sonnenaufgang</p>
                  <p className="text-xl font-bold tracking-widest">05:19</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <p className="text-white/40 text-xs mb-1">Sonnenuntergang</p>
                  <p className="text-xl font-bold tracking-widest">21:53</p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-white text-3xl font-bold tracking-tight">Wetterstation</h1>
              <p className="text-white/40 text-xs mt-1">letztes Update:</p>
              <p className="text-white/70 text-sm font-semibold">{fmt(now)}</p>
            </div>
          </div>
        )}

        {/* ── Tablet ── */}
        {bp === "tablet" && (
          <div className="flex flex-row items-center gap-6 w-full max-w-2xl">
            <div className="bg-[#1a2640]/80 backdrop-blur-sm rounded-2xl px-5 py-5 text-white text-center border border-white/5 shrink-0">
              <p className="text-white/40 text-xs mb-1">Sonnenaufgang</p>
              <p className="text-xl font-bold tracking-widest mb-3">05:19</p>
              <p className="text-white/40 text-xs mb-1">Sonnenuntergang</p>
              <p className="text-xl font-bold tracking-widest">21:53</p>
            </div>
            <div className="flex items-center gap-4 flex-1">
              <div>
                <h1 className="text-white text-3xl font-bold tracking-tight">Wetterstation</h1>
                <p className="text-white/40 text-xs mt-1">letztes Update:</p>
                <p className="text-white/70 text-sm font-semibold">{fmt(now)}</p>
              </div>
              {/* Spacer where 3D cloud sits at x=2.0 */}
              <div className="w-32 h-24 shrink-0" />
            </div>
          </div>
        )}

        {/* ── Desktop ── */}
        {bp === "desktop" && (
          <div className="flex flex-row items-center gap-8 w-full max-w-4xl">
            <div className="bg-[#1a2640]/80 backdrop-blur-sm rounded-2xl px-7 py-6 text-white text-center border border-white/5 shrink-0">
              <p className="text-white/40 text-xs mb-1">Sonnenaufgang</p>
              <p className="text-2xl font-bold tracking-widest mb-4">05:19</p>
              <p className="text-white/40 text-xs mb-1">Sonnenuntergang</p>
              <p className="text-2xl font-bold tracking-widest">21:53</p>
            </div>
            <div className="flex items-center gap-6 flex-1 pl-2">
              <div>
                <h1 className="text-white text-5xl font-bold tracking-tight leading-tight">
                  Wetterstation
                </h1>
                <p className="text-white/40 text-sm mt-1">letztes Update:</p>
                <p className="text-white/70 font-semibold">{fmt(now)}</p>
              </div>
              {/* Spacer where 3D cloud sits at x=3.0 */}
              <div className="w-44 h-28 shrink-0" />
            </div>
          </div>
        )}

        {/* Metric cards */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 w-full max-w-sm sm:max-w-2xl lg:max-w-4xl">
          <MetricCard title="Temperatur"         current="33.44" unit="°C"   series={tempData}     color="#f59e0b" />
          <MetricCard title="Luftdruck"          current="1007"  unit=" hPa" series={pressureData} color="#60a5fa" />
          <MetricCard title="Luftfeuchtigkeit"   current="43.95" unit="%"    series={humidityData} color="#34d399" />
        </div>
      </div>
    </>
  );
}