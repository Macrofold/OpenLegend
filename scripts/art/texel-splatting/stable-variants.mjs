// Explicit, bounded modifications to the pinned MIT source, made only in the
// temporary experiment checkout. Original direct/splat modules remain intact.
export function fixedCaptureSource(source) {
  const replace = (before, after) => {
    if (source.split(before).length !== 2) throw new Error(`Pinned splat seam changed: ${before}`);
    source = source.replace(before, after);
  };
  replace('export function createSplat(', 'export function createFixedSplat(');
  replace('time: number;', 'time: number; captureOrigin?: [number, number, number];');
  replace('const EXPANSION = 0.5;', 'const EXPANSION = 0.0;');
  replace(
    'const [cx, cy, cz] = params.cameraPos;',
    `
            if (params.captureOrigin) {
                ts.origin = [...params.captureOrigin];
                probeFrame = 0;
            }
            const [cx, cy, cz] = ts.origin;`,
  );
  replace(
    'const result = updateTransition(ts, cx, cy, cz, params.time);',
    'const result = { triggered: false, crossfading: false, fadeT: 0 };',
  );
  replace(
    'const activeProbes = getActiveProbes(probeFrame, crossfading);',
    'const activeProbes = 1 << PROBE_GRID;',
  );
  replace('const eyeMask = computeFaceMask(fx, fy, fz, EYE_CULL_COS);', 'const eyeMask = 0;');
  replace('const gridMask = computeFaceMask(fx, fy, fz, GRID_CULL_COS);', 'const gridMask = 63;');
  replace(
    '// G-buffer capture per visible face per probe\n            for',
    '// Static capture is reused until the explicit experiment reset.\n            if (probeFrame === 0) for',
  );
  replace('let hsEdge = halfTexel * 1.15 + 0.0005 * tanTheta;', 'let hsEdge = halfTexel;');
  replace(
    'splatSceneData[16] = cx;\n            splatSceneData[17] = cy;\n            splatSceneData[18] = cz;',
    'splatSceneData.set(params.cameraPos, 16);',
  );
  replace(
    'displayPass.draw(3);',
    '// No eye-probe image behind the fixed geometry: holes stay observable.',
  );
  return source;
}

export function orthographic(height, aspect, near = 0.1, far = 200) {
  const result = new Float32Array(16);
  result[0] = 2 / (height * aspect);
  result[5] = 2 / height;
  result[10] = 1 / (near - far);
  result[14] = near / (near - far);
  result[15] = 1;
  return result;
}
