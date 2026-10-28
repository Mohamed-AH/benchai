// The parts of three.js r160 that assets/map.js uses, bundled into one smaller file.
// After changing which parts map.js uses, rebuild from an empty folder:
//   npm i three@0.160.0 esbuild@0.24.2
//   npx esbuild research/maps/three-entry.js --bundle --minify --format=esm --legal-comments=inline --outfile=assets/three/three-r160-map.min.js
export { Box3, BoxGeometry, CanvasTexture, CatmullRomCurve3, CircleGeometry, Clock, CylinderGeometry, DirectionalLight, Fog, Group, HemisphereLight, Mesh, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, PerspectiveCamera, Plane, PlaneGeometry, Raycaster, SRGBColorSpace, Scene, TextureLoader, TubeGeometry, Vector2, Vector3, WebGLRenderer } from 'three';
export { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
