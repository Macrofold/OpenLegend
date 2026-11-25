#!/bin/bash
set -euo pipefail
exec >> /var/log/openlegend-verification-bootstrap.log 2>&1
bootstrap_started_ms=$(date +%s%3N)
export DEBIAN_FRONTEND=noninteractive
install -d -m 755 /opt/openlegend-verification /var/lib/openlegend-verification
trap 'verification_status=$?; printf "{\"exitCode\":%s}\n" "$verification_status" > /var/lib/openlegend-verification/bootstrap-failure.json; exit "$verification_status"' ERR
tools_cache_hit=1
if ! test -f /var/lib/openlegend-verification/tools-__TOOLS_RECIPE__; then
tools_cache_hit=0
sed -i 's|http://|https://|g' /etc/apt/sources.list.d/ubuntu.sources
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl xz-utils python3-boto3 git postgresql-16 postgresql-16-pgvector
node_version=24.13.0
cd /tmp
curl --fail --location --silent --show-error "https://nodejs.org/dist/v${node_version}/node-v${node_version}-linux-x64.tar.xz" -o node.tar.xz
curl --fail --location --silent --show-error "https://nodejs.org/dist/v${node_version}/SHASUMS256.txt" -o node.sha256
grep " node-v${node_version}-linux-x64.tar.xz$" node.sha256 | sed "s|node-v${node_version}-linux-x64.tar.xz|node.tar.xz|" | sha256sum --check -
tar -xJf node.tar.xz -C /usr/local --strip-components=1
mkdir -p /var/lib/openlegend-verification/cache/corepack
export COREPACK_HOME=/var/lib/openlegend-verification/cache/corepack
corepack enable
corepack prepare pnpm@10.33.0 --activate
id olverify >/dev/null 2>&1 || useradd --create-home --shell /bin/bash olverify
install -d -m 755 /opt/openlegend-verification /var/lib/openlegend-verification
install -d -o olverify -g olverify -m 755 /var/lib/openlegend-verification/cache
chown -R olverify:olverify /var/lib/openlegend-verification/cache
touch /var/lib/openlegend-verification/tools-__TOOLS_RECIPE__
fi
cat > /usr/local/bin/ol-verification-fetch <<'FETCH'
__FETCH_SOURCE__
FETCH
chmod 755 /usr/local/bin/ol-verification-fetch
# Cached boots still inspect the same pinned package-manager store as case execution.
export COREPACK_HOME=/var/lib/openlegend-verification/cache/corepack
cat > /opt/openlegend-verification/workspace-check.mjs <<'WORKSPACE'
__WORKSPACE_CHECK__
WORKSPACE
ol-verification-fetch '__BUCKET__' '__SUPERVISOR_KEY__' /opt/openlegend-verification/supervisor.mjs '__SUPERVISOR_DIGEST__'
printf '%s  %s\n' '__SUPERVISOR_DIGEST__' /opt/openlegend-verification/supervisor.mjs | sha256sum --check -
cat > /etc/openlegend-verification.json <<'JSON'
{"slot":"__SLOT__","table":"__TABLE__","bucket":"__BUCKET__","functionName":"__FUNCTION__"}
JSON
chmod 600 /etc/openlegend-verification.json
# Fixture SQL can start PostgreSQL-side programs; they share the case process network boundary.
cat > /etc/systemd/system/ol-verification-untrusted.slice <<'SLICE'
[Unit]
Description=OpenLegend fixture and case processes
[Slice]
IPAddressDeny=169.254.169.254
IPAddressDeny=fd00:ec2::254
SLICE
mkdir -p /etc/systemd/system/postgresql@.service.d
cat > /etc/systemd/system/postgresql@.service.d/verification.conf <<'POSTGRES'
[Service]
Slice=ol-verification-untrusted.slice
POSTGRES
systemctl daemon-reload
systemctl enable --now postgresql
systemctl restart postgresql@16-main
if ! runuser -u postgres -- psql -Atc "SELECT 1 FROM pg_roles WHERE rolname='olverify'" | grep -q 1; then
  runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "CREATE ROLE olverify WITH LOGIN SUPERUSER;"
fi
# This isolated host accepts only its disposable role over loopback. No public DB listener.
grep -q '^host all olverify 127.0.0.1/32 trust$' /etc/postgresql/16/main/pg_hba.conf || sed -i '1ihost all olverify 127.0.0.1/32 trust' /etc/postgresql/16/main/pg_hba.conf
systemctl reload postgresql
cat > /etc/systemd/system/ol-verification-watchdog.service <<'UNIT'
[Unit]
Description=OpenLegend verification lease watchdog
[Service]
Type=simple
Restart=on-failure
RestartSec=5
Environment=OPENLEGEND_WORKER_SLOT=__SLOT__
Environment=AWS_REGION=us-east-2
ExecStart=/usr/local/bin/node /opt/openlegend-verification/supervisor.mjs watchdog
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable ol-verification-watchdog.service
if test "${OPENLEGEND_IMAGE_PREPARE:-0}" != 1; then systemctl restart ol-verification-watchdog.service; fi
printf 'ready %s\n' "$(date --utc --iso-8601=seconds)"

BOOTSTRAP_STARTED_MS="$bootstrap_started_ms" BOOTSTRAP_TOOLS_REUSED="$tools_cache_hit" /usr/local/bin/node --input-type=module <<'METADATA'
import {writeFileSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
let packageSeed;
try { packageSeed=JSON.parse(readFileSync('/var/lib/openlegend-verification/prepared.json','utf8')).packageSeed; }
catch(error) { if(error.code!=='ENOENT') throw error; }
writeFileSync('/var/lib/openlegend-verification/prepared.json',JSON.stringify({
  node:process.version, pnpm:execFileSync('pnpm',['--version'],{encoding:'utf8'}).trim(),
  postgres:execFileSync('psql',['--version'],{encoding:'utf8'}).trim(),
  packages:execFileSync('dpkg-query',['-W','postgresql-16-pgvector','python3-boto3'],{encoding:'utf8'}),
  recipe:'__RECIPE__', bootstrapStartedAt:Number(process.env.BOOTSTRAP_STARTED_MS),
  preparedAt:Date.now(), architecture:process.arch,
  toolsReused:process.env.BOOTSTRAP_TOOLS_REUSED==='1', packageSeed
}));
METADATA

rm -f /var/lib/openlegend-verification/bootstrap-failure.json
systemctl disable --now apt-daily.timer apt-daily-upgrade.timer || true

if test "${OPENLEGEND_IMAGE_PREPARE:-0}" != 1; then
  systemctl is-active --quiet ol-verification-watchdog.service
  shutdown -c
fi
