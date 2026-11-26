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
