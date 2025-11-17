// Copyright 2025 The Manifold Authors.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {describe, expect, test} from 'vitest';

describe('Browser Compatibility', () => {
  test('Core utilities should work without Node.js', async () => {
    // Test that isNode and isWebWorker utilities work correctly
    const {isNode, isWebWorker} = await import('../lib/util.js');
    
    // In vitest environment, we're in Node.js
    expect(typeof isNode).toBe('function');
    expect(typeof isWebWorker).toBe('function');
    
    // These should not throw even if process is undefined
    expect(isNode()).toBe(true);  // We're in Node.js test environment
    expect(isWebWorker()).toBe(false);
  });

  test('WASM module loader should be importable', async () => {
    // Test that the WASM loader can be imported without Node.js dependencies
    const wasm = await import('../lib/wasm.js');
    
    expect(wasm.getManifoldModule).toBeDefined();
    expect(wasm.instantiateManifold).toBeDefined();
    expect(wasm.setWasmUrl).toBeDefined();
  });

  test('Manifold can be instantiated', async () => {
    const {getManifoldModule} = await import('../lib/wasm.js');
    
    const module = await getManifoldModule();
    
    expect(module).toBeDefined();
    expect(module.Manifold).toBeDefined();
    expect(module.CrossSection).toBeDefined();
  });

  test('Bundler should conditionally use Node.js modules', async () => {
    // The bundler should only use Node.js modules when running in Node.js
    const bundler = await import('../lib/bundler.js');
    
    expect(bundler.bundleCode).toBeDefined();
    expect(bundler.setWasmUrl).toBeDefined();
    
    // These should not throw during import
    expect(typeof bundler.bundleCode).toBe('function');
  });
});
