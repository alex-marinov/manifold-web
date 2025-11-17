/**
 * Cloudflare Worker example for manifold-3d
 * 
 * This worker demonstrates how to use manifold-3d in a Cloudflare Worker
 * to perform 3D geometry operations on-demand.
 * 
 * Deployment:
 * 1. Install Wrangler: npm install -g wrangler
 * 2. Create wrangler.toml (see below)
 * 3. Deploy: wrangler deploy
 * 
 * Usage:
 * GET /cube?size=10          - Create a cube
 * GET /sphere?radius=5       - Create a sphere
 * GET /boolean?op=subtract   - Perform boolean operation
 */

import Module from 'manifold-3d/manifold.js';

// Initialize WASM module (will be reused across requests in the same isolate)
let wasmModule = null;

async function getWasmModule() {
  if (!wasmModule) {
    wasmModule = await Module();
    wasmModule.setup();
  }
  return wasmModule;
}

/**
 * Handle cube creation
 */
async function handleCube(request, wasm) {
  const url = new URL(request.url);
  const size = parseFloat(url.searchParams.get('size') || '10');
  
  const cube = wasm.Manifold.cube([size, size, size]);
  const mesh = cube.getMesh();
  
  const result = {
    type: 'cube',
    size,
    vertices: mesh.numVert,
    triangles: mesh.numTri,
    volume: cube.volume(),
    surfaceArea: cube.surfaceArea(),
  };
  
  cube.delete();
  
  return new Response(JSON.stringify(result, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle sphere creation
 */
async function handleSphere(request, wasm) {
  const url = new URL(request.url);
  const radius = parseFloat(url.searchParams.get('radius') || '5');
  const segments = parseInt(url.searchParams.get('segments') || '64');
  
  const sphere = wasm.Manifold.sphere(radius, segments);
  const mesh = sphere.getMesh();
  
  const result = {
    type: 'sphere',
    radius,
    segments,
    vertices: mesh.numVert,
    triangles: mesh.numTri,
    volume: sphere.volume(),
    surfaceArea: sphere.surfaceArea(),
  };
  
  sphere.delete();
  
  return new Response(JSON.stringify(result, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle boolean operations
 */
async function handleBoolean(request, wasm) {
  const url = new URL(request.url);
  const operation = url.searchParams.get('op') || 'subtract';
  
  const cube = wasm.Manifold.cube([10, 10, 10], true);
  const sphere = wasm.Manifold.sphere(6, 64);
  
  let result;
  switch (operation) {
    case 'add':
      result = cube.add(sphere);
      break;
    case 'subtract':
      result = cube.subtract(sphere);
      break;
    case 'intersect':
      result = cube.intersect(sphere);
      break;
    default:
      return new Response('Invalid operation', { status: 400 });
  }
  
  const mesh = result.getMesh();
  
  const response = {
    type: 'boolean',
    operation,
    cubeVolume: cube.volume(),
    sphereVolume: sphere.volume(),
    resultVolume: result.volume(),
    resultVertices: mesh.numVert,
    resultTriangles: mesh.numTri,
  };
  
  cube.delete();
  sphere.delete();
  result.delete();
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Main worker handler
 */
export default {
  async fetch(request, env, ctx) {
    try {
      // Initialize WASM module
      const wasm = await getWasmModule();
      
      const url = new URL(request.url);
      const path = url.pathname;
      
      // Route requests
      switch (path) {
        case '/':
          return new Response(
            'Manifold 3D Cloudflare Worker\n\n' +
            'Available endpoints:\n' +
            '  GET /cube?size=10\n' +
            '  GET /sphere?radius=5&segments=64\n' +
            '  GET /boolean?op=subtract\n' +
            '    (operations: add, subtract, intersect)\n',
            { headers: { 'Content-Type': 'text/plain' } }
          );
        
        case '/cube':
          return await handleCube(request, wasm);
        
        case '/sphere':
          return await handleSphere(request, wasm);
        
        case '/boolean':
          return await handleBoolean(request, wasm);
        
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
};
