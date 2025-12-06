import * as THREE from 'three'

/**
 * Custom shader for applying RGB lighting to blocks
 * Uses proper uniform update pattern for DataTexture
 */
export function createLightShader(
  baseMaterial: THREE.MeshStandardMaterial,
  getTexture?: () => THREE.DataTexture | null
): THREE.MeshStandardMaterial {

  // Store uniform in userData (allows updates after compile)
  baseMaterial.userData.lightDataTexture = { value: getTexture ? getTexture() : null }
  baseMaterial.userData.chunkSize = { value: 24.0 }

  baseMaterial.onBeforeCompile = (shader) => {
    // Reference the userData uniforms (pass by reference!)
    shader.uniforms.lightDataTexture = baseMaterial.userData.lightDataTexture
    shader.uniforms.chunkSize = baseMaterial.userData.chunkSize

    // Add varyings to vertex shader
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
      vBlockPosition = worldPosition.xyz;
      `
    )

    // Add uniforms to fragment shader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `
      #include <common>
      uniform sampler2D lightDataTexture;
      uniform float chunkSize;
      varying vec3 vBlockPosition;
      `
    )

    // Inject at end of main()
    shader.fragmentShader = shader.fragmentShader.replace(
      /}\s*$/,
      `
      // Apply voxel lighting
      vec3 blockPos = floor(vBlockPosition);
      float localX = mod(blockPos.x, chunkSize);
      float localY = mod(blockPos.y, 256.0);
      float localZ = mod(blockPos.z, chunkSize);

      float u = localX / chunkSize;
      float v = (localY * chunkSize + localZ) / (256.0 * chunkSize);

      vec2 skyUV = vec2(u, v);
      vec2 blockUV = vec2(u + 0.5, v);

      // Sample light (Three.js normalizes: 15 → 15/255 = 0.059)
      vec3 skyLight = texture2D(lightDataTexture, skyUV).rgb;
      vec3 blockLight = texture2D(lightDataTexture, blockUV).rgb;

      // Scale back up: max value 15 should equal 1.0
      // (15/255) * (255/15) = 1.0
      skyLight *= (255.0 / 15.0);
      blockLight *= (255.0 / 15.0);

      // Combine lights
      vec3 finalLight = max(skyLight, blockLight);

      // Apply lighting
      gl_FragColor.rgb *= finalLight;
    }
      `
    )

    baseMaterial.userData.lightShader = shader
  }

  return baseMaterial
}
