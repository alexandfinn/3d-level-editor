import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

class ThumbnailGenerator {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private thumbnailCache: Map<string, string>;
  private size: number;

  constructor(size: number = 60) {
    if (typeof window === 'undefined') {
      throw new Error('ThumbnailGenerator can only be initialized in the browser');
    }

    this.size = size;
    // Create canvas and setup renderer
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;
    
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
    });
    this.renderer.setSize(size, size);
    this.renderer.setClearColor(0x000000, 0);
    
    // Setup scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1000);
    this.camera.position.set(3, 3, 3);
    this.camera.lookAt(0, 0, 0);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(ambientLight, directionalLight);
    
    this.thumbnailCache = new Map();
  }

  private centerAndScaleModel(model: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.5 / maxDim;
    
    model.position.set(-center.x, -center.y, -center.z);
    model.scale.set(scale, scale, scale);
  }

  async generateThumbnail(modelPath: string): Promise<string> {
    const cacheKey = `${modelPath}-${this.size}`;
    // Check cache first
    if (this.thumbnailCache.has(cacheKey)) {
      return this.thumbnailCache.get(cacheKey)!;
    }

    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      
      loader.load(
        modelPath,
        (gltf) => {
          try {
            // Clear previous scene content
            while(this.scene.children.length > 2) { // Keep lights
              this.scene.remove(this.scene.children[0]);
            }
            
            const model = gltf.scene.clone();
            this.centerAndScaleModel(model);
            this.scene.add(model);
            
            // Render and get base64
            this.renderer.render(this.scene, this.camera);
            const thumbnail = this.canvas.toDataURL('image/png');
            
            // Cache the result
            this.thumbnailCache.set(cacheKey, thumbnail);
            
            resolve(thumbnail);
          } catch (error) {
            reject(error);
          }
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  dispose() {
    this.renderer.dispose();
    this.thumbnailCache.clear();
  }
}

// Create size-specific instances
const thumbnailGenerators = new Map<number, ThumbnailGenerator>();

export function getThumbnailGenerator(size: number = 60): ThumbnailGenerator {
  if (typeof window === 'undefined') {
    throw new Error('getThumbnailGenerator can only be called in the browser');
  }

  if (!thumbnailGenerators.has(size)) {
    thumbnailGenerators.set(size, new ThumbnailGenerator(size));
  }
  return thumbnailGenerators.get(size)!;
} 