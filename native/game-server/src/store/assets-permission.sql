, members AS MATERIALIZED (
    SELECT f.artifact_key, CASE WHEN f.artifact_key = $4 THEN f.payload END AS payload
    FROM closure c JOIN asset_revision_files f USING (revision_key)
    LIMIT 20001
)
SELECT a.generation
FROM asset_authority a CROSS JOIN root r
WHERE a.id = 'current' AND a.complete = 1
  AND (SELECT complete FROM required_closure)
  AND (SELECT count(*) FROM dependencies) <= 10000
  AND (SELECT count(*) FROM members) <= 20000
  AND NOT EXISTS (
    SELECT 1
    FROM closure c
    LEFT JOIN asset_domains d USING (boundary, access_domain)
    LEFT JOIN asset_rights g ON g.revision_key = c.revision_key
                            AND g.manifest_sha256 = c.manifest_sha256
    WHERE c.visibility IS NULL OR c.visibility NOT IN ('public','restricted')
       OR (d.payload::jsonb->>'visibility') IS DISTINCT FROM c.visibility
       OR jsonb_typeof(g.payload::jsonb->'uses') IS DISTINCT FROM 'array'
       OR NOT coalesce(g.payload::jsonb->'uses' ?
                    CASE WHEN r.visibility = 'public' THEN 'public-runtime'
                         ELSE 'private-runtime' END, false)
       OR (c.visibility = 'restricted' AND NOT EXISTS (
           SELECT 1 FROM asset_grants p
           WHERE p.boundary = c.boundary AND p.access_domain = c.access_domain
             AND p.account_id = $3 AND jsonb_typeof(p.permissions::jsonb) = 'array'
             AND p.permissions::jsonb ? 'read'))
       OR EXISTS (
           SELECT 1 FROM asset_restrictions w
           WHERE w.kind = 'revision' AND
                 w.subject_key = concat('[',to_json(c.revision_key)::text,',',
                                            to_json(c.manifest_sha256)::text,']'))
  )
  AND NOT EXISTS (
    SELECT 1 FROM members m
    WHERE EXISTS (
       SELECT 1 FROM asset_restrictions w
       WHERE w.kind = 'artifact' AND w.subject_key = m.artifact_key
    ) OR EXISTS (
       SELECT 1 FROM asset_delivery_removals w
       WHERE w.status = 'pending' AND w.artifact_key = m.artifact_key
    )
  )
  AND ($4::text IS NULL OR (
    EXISTS (SELECT 1 FROM members WHERE artifact_key = $4 AND payload::jsonb = $5::jsonb)
    AND NOT EXISTS (
        SELECT 1 FROM members WHERE artifact_key = $4 AND payload::jsonb <> $5::jsonb)
  ))
