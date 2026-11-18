-- The Source publication owner writes the normalized exact dependency and
-- file memberships atomically. Use them within a single current SQL cut.
WITH root AS (
    SELECT r.revision_key, r.manifest_sha256, r.boundary, r.access_domain,
           r.payload::jsonb->'destination'->>'visibility' AS visibility,
           r.payload::jsonb->'manifest'->'dependencies' AS required
    FROM asset_revisions r
    WHERE r.revision_key = $1 AND r.manifest_sha256 = $2
      AND r.boundary = 'runtime' AND r.payload::jsonb->'manifest'->>'kind' = 'release'
), dependencies AS MATERIALIZED (
    SELECT child_key, child_sha256
    FROM asset_dependencies WHERE parent_key = $1 LIMIT 10001
), closure AS MATERIALIZED (
    SELECT revision_key, manifest_sha256, boundary, access_domain, visibility, required FROM root
    UNION ALL
    SELECT d.child_key, d.child_sha256, r.boundary, r.access_domain,
           r.payload::jsonb->'destination'->>'visibility',
           r.payload::jsonb->'manifest'->'dependencies'
    FROM dependencies d
    LEFT JOIN asset_revisions r
        ON r.revision_key = d.child_key AND r.manifest_sha256 = d.child_sha256
), required_closure AS (
    SELECT NOT EXISTS (
       SELECT 1 FROM closure c
       WHERE jsonb_typeof(c.required) IS DISTINCT FROM 'array'
       OR EXISTS (
           SELECT 1 FROM jsonb_array_elements(
               CASE WHEN jsonb_typeof(c.required) = 'array' THEN c.required ELSE '[]'::jsonb END
           ) dep
           WHERE NOT EXISTS (
               SELECT 1 FROM asset_dependencies d
               WHERE d.parent_key = $1 AND d.child_key = concat('[',to_json(dep->'owner'->>'kind')::text,',',
                                                to_json(dep->'owner'->>'id')::text,',',
                                                to_json(dep->>'assetId')::text,',',
                                                to_json(dep->>'revisionId')::text,']')
                 AND d.child_sha256 = dep->>'manifestSha256'))
    ) AS complete
)
