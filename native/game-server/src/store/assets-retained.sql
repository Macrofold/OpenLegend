, exact_manifests AS (
    SELECT r.payload::jsonb AS description
    FROM closure c JOIN asset_revisions r USING (revision_key, manifest_sha256)
), declared_files AS MATERIALIZED (
    SELECT f.value AS payload
    FROM exact_manifests c CROSS JOIN LATERAL jsonb_each(c.description->'manifest'->'files') f
    UNION ALL
    SELECT c.description->'manifestArtifact' FROM exact_manifests c
    LIMIT 20001
)
SELECT 1
FROM root r
JOIN asset_world_bindings b USING (revision_key, manifest_sha256)
JOIN asset_authority a ON a.id = 'current' AND a.complete = 1
WHERE b.world_id = $3 AND b.payload::jsonb->'reference' = $4::jsonb
  AND NULLIF(b.payload::jsonb->'principal'->>'accountId', '') IS NOT NULL
  AND (SELECT complete FROM required_closure)
  AND (SELECT count(*) FROM dependencies) <= 10000
  AND (SELECT count(*) FROM declared_files) <= 20000
  AND NOT EXISTS (
      SELECT 1 FROM closure c
      WHERE NOT EXISTS (
          SELECT 1 FROM asset_pins p
          WHERE p.owner_kind = $5 AND p.owner_id = $6
            AND p.revision_key = c.revision_key
            AND p.manifest_sha256 = c.manifest_sha256
      )
  )
  AND NOT EXISTS (
      SELECT 1 FROM declared_files f
      WHERE NOT EXISTS (
          SELECT 1 FROM asset_pin_files p
          WHERE p.owner_kind = $5 AND p.owner_id = $6
            AND p.artifact_key = concat('[',to_json(f.payload->>'boundary')::text,',',
                                             to_json(f.payload->>'accessDomain')::text,',',
                                             to_json(f.payload->>'sha256')::text,']')
            AND p.payload::jsonb = f.payload
      )
  )
