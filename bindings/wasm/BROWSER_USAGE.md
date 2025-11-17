# Browser and Cloudflare Workers Usage

This document explains how to use manifold-3d in browser and Cloudflare Workers environments.

## Browser Compatibility

The manifold-3d library is fully compatible with modern browsers and Cloudflare Workers. The library conditionally uses Node.js built-in modules only when running in Node.js environments, making it safe to use in browser contexts.

## Basic Browser Usage

### Using a CDN

You can load manifold-3d directly from a CDN:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Manifold 3D Browser Example</title>
</head>
<body>
    <script type="module">
        // Import from CDN
        import Module from 'https://cdn.jsdelivr.net/npm/manifold-3d@latest/manifold.js';
        
        // Initialize the WASM module
        const wasm = await Module();
        wasm.setup();
        
        // Create a simple cube
        const cube = wasm.Manifold.cube([10, 10, 10]);
        console.log('Cube created with', cube.numVert(), 'vertices');
        
        // Clean up
        cube.delete();
    </script>
</body>
</html>
```

### Using a Bundler (Vite, Webpack, Rollup)

With Vite:

```javascript
import {getManifoldModule, setWasmUrl} from 'manifold-3d/lib/wasm';
import wasmUrl from 'manifold-3d/manifold.wasm?url';

// Configure WASM URL for your bundler
setWasmUrl(wasmUrl);

// Get the module
const module = await getManifoldModule();

// Create geometry
const sphere = module.Manifold.sphere(5, 64);
const cube = module.Manifold.cube([10, 10, 10]);
const result = sphere.add(cube);

console.log('Result has', result.numVert(), 'vertices');

// Clean up
sphere.delete();
cube.delete();
result.delete();
```

**Vite Configuration:**

```javascript
// vite.config.js
export default {
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['manifold-3d']
  }
}
```

### Using with TypeScript

```typescript
import type {ManifoldToplevel} from 'manifold-3d/manifold';
import {getManifoldModule, setWasmUrl} from 'manifold-3d/lib/wasm';

// Set WASM URL if using a bundler
setWasmUrl('/path/to/manifold.wasm');

// Get typed module
const module: ManifoldToplevel = await getManifoldModule();

// Create geometry with full type support
const box = module.Manifold.cube([10, 10, 10], true);
const sphere = module.Manifold.sphere(5, 64);

// Boolean operations
const result = box.subtract(sphere);

// Get mesh data
const mesh = result.getMesh();
console.log('Vertices:', mesh.numVert);
console.log('Triangles:', mesh.numTri);

// Clean up
box.delete();
sphere.delete();
result.delete();
```

## Cloudflare Workers

manifold-3d works in Cloudflare Workers with a few considerations:

```javascript
// worker.js
import Module from 'manifold-3d/manifold.js';

export default {
  async fetch(request, env, ctx) {
    // Initialize WASM
    const wasm = await Module();
    wasm.setup();
    
    // Create geometry
    const cube = wasm.Manifold.cube([10, 10, 10]);
    const mesh = cube.getMesh();
    
    // Clean up
    cube.delete();
    
    // Return response
    return new Response(JSON.stringify({
      vertices: mesh.numVert,
      triangles: mesh.numTri
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

**Important Notes for Cloudflare Workers:**

1. **WASM File Size**: The manifold.wasm file is approximately 465KB. Ensure your Worker has enough memory allocated.

2. **Cold Start**: First invocation will be slower due to WASM initialization. Consider using Durable Objects for persistent instances.

3. **Memory Limits**: Be mindful of Cloudflare's memory limits when creating complex geometry.

4. **Module Format**: Use ES modules format (`export default`) for your worker.

## Web Workers

For computationally intensive operations, you can use manifold-3d in Web Workers:

```javascript
// geometry-worker.js
import Module from 'manifold-3d/manifold.js';

let wasm = null;

self.onmessage = async function(e) {
  // Initialize WASM once
  if (!wasm) {
    wasm = await Module();
    wasm.setup();
  }
  
  const { operation, params } = e.data;
  
  switch(operation) {
    case 'createCube':
      const cube = wasm.Manifold.cube(params.size);
      const mesh = cube.getMesh();
      cube.delete();
      self.postMessage({ mesh });
      break;
    // Add more operations as needed
  }
};
```

```javascript
// main.js
const worker = new Worker('geometry-worker.js', { type: 'module' });

worker.postMessage({
  operation: 'createCube',
  params: { size: [10, 10, 10] }
});

worker.onmessage = function(e) {
  console.log('Mesh created:', e.data.mesh);
};
```

## Common Patterns

### Async Initialization

Always initialize the WASM module asynchronously:

```javascript
import {getManifoldModule} from 'manifold-3d/lib/wasm';

async function init() {
  const module = await getManifoldModule();
  // Now you can use module.Manifold, module.CrossSection, etc.
  return module;
}

init().then(module => {
  // Your code here
});
```

### Memory Management

Remember to clean up objects when done:

```javascript
const cube = module.Manifold.cube([10, 10, 10]);
const sphere = module.Manifold.sphere(5, 64);
const result = cube.add(sphere);

// Use result...

// Clean up to free WASM memory
cube.delete();
sphere.delete();
result.delete();
```

### Error Handling

```javascript
try {
  const module = await getManifoldModule();
  const cube = module.Manifold.cube([10, 10, 10]);
  // ... operations ...
  cube.delete();
} catch (error) {
  console.error('Failed to initialize or use Manifold:', error);
}
```

## Bundle Size Optimization

The WASM binary is approximately 465KB. To optimize loading:

1. **Enable Compression**: Ensure your server sends the `.wasm` file with gzip or brotli compression
2. **CDN**: Use a CDN for faster delivery
3. **Lazy Loading**: Only load the WASM module when needed
4. **Cache**: Set appropriate cache headers for the WASM file

```javascript
// Lazy load only when needed
let manifoldModule = null;

async function getManifold() {
  if (!manifoldModule) {
    const {getManifoldModule} = await import('manifold-3d/lib/wasm');
    manifoldModule = await getManifoldModule();
  }
  return manifoldModule;
}

// Use when needed
button.addEventListener('click', async () => {
  const module = await getManifold();
  // ... use module ...
});
```

## Troubleshooting

### WASM File Not Found

If you get errors about the WASM file not being found, set the WASM URL explicitly:

```javascript
import {setWasmUrl} from 'manifold-3d/lib/wasm';

// For bundlers, use the ?url import
import wasmUrl from 'manifold-3d/manifold.wasm?url';
setWasmUrl(wasmUrl);

// Or set it manually
setWasmUrl('/static/manifold.wasm');
```

### CORS Issues

If loading from a CDN, ensure CORS headers are set correctly. The WASM file must be served with appropriate CORS headers if loaded from a different origin.

### TypeScript Errors

Ensure you have the correct type definitions:

```json
{
  "compilerOptions": {
    "types": ["manifold-3d"]
  }
}
```

## Examples

For complete working examples, see the [examples directory](./examples/).

## Performance Tips

1. **Reuse Objects**: Create geometry once and reuse when possible
2. **Batch Operations**: Combine multiple operations before extracting mesh data
3. **Web Workers**: Use Web Workers for complex operations to avoid blocking the main thread
4. **Memory Management**: Always call `.delete()` on Manifold objects when done

## Limitations

1. **Synchronous APIs**: Some operations are synchronous and may block the main thread for complex geometry
2. **Memory**: WASM memory is separate from JavaScript heap; monitor usage carefully
3. **No Threading**: The browser WASM build doesn't use threading (unlike the Node.js version with TBB)

## Support

For issues, questions, or contributions, visit the [GitHub repository](https://github.com/elalish/manifold).
