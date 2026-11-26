, pinned_revisions AS (
    INSERT INTO asset_pins (owner_kind, owner_id, revision_key, manifest_sha256)
    SELECT 'world', $3, revision_key, manifest_sha256 FROM closure
    ON CONFLICT DO NOTHING
), pinned_files AS (
    INSERT INTO asset_pin_files (owner_kind, owner_id, artifact_key, payload)
    SELECT 'world', $3, concat('[',to_json(payload->>'boundary')::text,',',
                                    to_json(payload->>'accessDomain')::text,',',
                                    to_json(payload->>'sha256')::text,']'), payload::text
    FROM declared_files
    ON CONFLICT DO NOTHING
)
INSERT INTO asset_world_bindings (world_id, revision_key, manifest_sha256, payload)
SELECT $3, revision_key, manifest_sha256, $4 FROM root
ON CONFLICT (world_id) DO UPDATE SET revision_key=excluded.revision_key,
    manifest_sha256=excluded.manifest_sha256, payload=excluded.payload
