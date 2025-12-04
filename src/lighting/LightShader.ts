import * as THREE from 'three'

/**
 * Custom shader for applying RGB lighting to blocks
 * Modifies fragment shader to darken/brighten based on light data
 */
export function createLightShader(
  baseMaterial: THREE.MeshStandardMaterial
): THREE.MeshStandardMaterial {

  baseMaterial.onBeforeCompile = (shader) => {
    // Add uniforms for light data
    shader.uniforms.lightDataTexture = { value: null }  // Set later
    shader.uniforms.chunkSize = { value: 24.0 }
    shader.uniforms.useLighting = { value: 1.0 }  // Toggle for debugging

    // Add uniforms to vertex shader for passing block position
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      varying vec3 vBlockPosition;
      `
    )

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `
      #include <worldpos_vertex>
      vBlockPosition = floor(worldPosition.xyz);
      `
    )

    // Add uniforms to fragment shader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform sampler2D lightDataTexture;
      uniform float chunkSize;
      uniform float useLighting;
      varying vec3 vBlockPosition;
      `
    )

    // Inject lighting calculation AFTER all Three.js lighting
    shader.fragmentShader = shader.fragmentShader.replace(
      'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
      `
      // Sample light data at block position
      // Convert 3D block position to 2D texture coordinates
      // Texture layout: u = x, v = y * depth + z
      vec3 blockPos = vBlockPosition;
      float chunkDepth = chunkSize;

      // Local coordinates within chunk (mod by chunk size)
      float localX = mod(blockPos.x, chunkSize);
      float localY = mod(blockPos.y, 256.0);
      float localZ = mod(blockPos.z, chunkSize);

      // Convert to texture UV (0.0 to 1.0)
      float u = localX / chunkSize;
      float v = (localY * chunkDepth + localZ) / (256.0 * chunkDepth);

      // Sample light data from texture
      // Texture layout: left half = sky RGB, right half = block RGB
      vec2 skyUV = vec2(u, v);
      vec2 blockUV = vec2(u + 0.5, v);  // Offset by 0.5 to sample right half

      vec3 skyLight = texture2D(lightDataTexture, skyUV).rgb / 15.0;      // Sky RGB (0-15 → 0-1)
      vec3 blockLight = texture2D(lightDataTexture, blockUV).rgb / 15.0;  // Block RGB (0-15 → 0-1)

      // DEBUG: Visualize what we're sampling
      // Uncomment to debug:
      // gl_FragColor = vec4(skyLight, 1.0); return;  // Show sky light
      // gl_FragColor = vec4(blockLight * 10.0, 1.0); return;  // Show block light (amplified)
      // gl_FragColor = vec4(vec3(u, v, 0.0), 1.0); return;  // Show UVs

      // Combine sky + block light (take max like Minecraft)
      vec3 finalLight = max(skyLight, blockLight);

      // TEMPORARY: Completely bypass lighting, show original color
      gl_FragColor = vec4(outgoingLight, diffuseColor.a);
      return;  // Skip all lighting

      // (The code below is unreachable - lighting disabled for debugging)
      vec3 finalLight = max(skyLight, blockLight);
      vec3 litColor = outgoingLight * finalLight;
      gl_FragColor = vec4(litColor, diffuseColor.a);
      `
    )

    // Store shader reference for later updates
    baseMaterial.userData.lightShader = shader
  }

  return baseMaterial
}
