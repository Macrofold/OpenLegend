SELECT 1
FROM root r
JOIN asset_authority a ON a.id = 'current' AND a.complete = 1
WHERE (($5 = 'world' AND EXISTS (
          SELECT 1 FROM asset_world_bindings b
          WHERE b.world_id = $3 AND b.revision_key = r.revision_key
            AND b.manifest_sha256 = r.manifest_sha256 AND b.payload::jsonb->'reference' = $4::jsonb
            AND NULLIF(b.payload::jsonb->'principal'->>'accountId', '') IS NOT NULL
       )) OR ($5 = 'save' AND EXISTS (
          SELECT 1 FROM asset_save_claims s
          WHERE s.world_id = $3 AND s.status = 'published' AND s.payload::jsonb = $4::jsonb
            AND concat('[',to_json(s.world_id)::text,',',to_json(s.save_id)::text,']') = $6
       )))
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
