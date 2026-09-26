"""Temporary, repository-scoped history publisher; never invokes Git or updates main.

Input is reviewed source edits, not executable code. All object bytes and tree results
are checked against their expected Git hashes. Ref changes use GraphQL beforeOid.
Remove this helper when the reviewed rebased history replaces the staging checkout.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.request

REPO = "Macrofold/OpenLegend"
MAIN = "da02629d9f0a29a9e24473ff2ab995977a79be1a"
SOURCE = "a6c070997e2c993fde3ee65eedc572e4bada28d2"
FEATURE = "refs/heads/feature/invention-repertoire-foundation"
STAGE = "refs/heads/rebase/invention-production-integration"
REPOSITORY_ID = "R_kgDOUg8Hzw"
ZERO = "0" * 40
ROOT = Path(__file__).parent
PLAN = json.loads((ROOT / "replay.json").read_text())
TOKEN = os.environ["GITHUB_TOKEN"]
EXPECTED = os.environ["GITHUB_SHA"]
assert os.environ["GITHUB_REPOSITORY"] == REPO
assert os.environ["GITHUB_REF"] == FEATURE
assert PLAN["main"] == MAIN and PLAN["source"] == SOURCE
assert PLAN["stage"] == STAGE
assert 0 < len(PLAN["commits"]) <= 110
assert isinstance(PLAN["publishFeature"], bool)
if PLAN["publishFeature"]:
    assert len(PLAN["commits"]) == 105
    assert PLAN["commits"][-1]["original"] == SOURCE

last_write = 0.0
writes = 0
cache = {}
blobs = PLAN["blobs"]
published = dict(PLAN.get("published", {}))
result = {"main": MAIN, "source": SOURCE, "expectedFeature": EXPECTED,
          "published": published, "stage": STAGE, "completed": False}


def api(path, body=None, missing=False):
    global last_write, writes
    assert path == "/graphql" or path.startswith(f"/repos/{REPO}/git/")
    if body is not None:
        writes += 1
        if writes > 300:
            raise RuntimeError("Bounded publication request allowance exhausted.")
        time.sleep(max(0, 1.1 - (time.monotonic() - last_write)))
        last_write = time.monotonic()
    request = urllib.request.Request(
        "https://api.github.com" + path,
        data=None if body is None else json.dumps(body).encode(),
        headers={"Authorization": "Bearer " + TOKEN,
                 "Accept": "application/vnd.github+json",
                 "Content-Type": "application/json",
                 "X-GitHub-Api-Version": "2022-11-28"},
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read(20_000_001)
            if len(raw) > 20_000_000:
                raise RuntimeError("GitHub response exceeded its bound.")
            value = json.loads(raw)
    except urllib.error.HTTPError as error:
        if missing and error.code == 404:
            return None
        raise RuntimeError(f"GitHub request failed with HTTP {error.code}: {path}") from None
    if isinstance(value, dict) and value.get("errors"):
        raise RuntimeError("GitHub rejected the atomic ref update; no fallback force is permitted.")
    return value


def ref(name):
    value = api(f"/repos/{REPO}/git/ref/" + name.removeprefix("refs/"), missing=True)
    return ZERO if value is None else value["object"]["sha"]


def move(name, before, after):
    assert name in (STAGE, FEATURE)
    api("/graphql", {
        "query": "mutation($input:UpdateRefsInput!){updateRefs(input:$input){clientMutationId}}",
        "variables": {"input": {"repositoryId": REPOSITORY_ID,
            "refUpdates": [{"name": name, "beforeOid": before, "afterOid": after,
                            "force": name == FEATURE}]}}
    })
    if ref(name) != after:
        raise RuntimeError("Ref verification failed after publication.")


def git_hash(kind, data):
    return hashlib.sha1(f"{kind} {len(data)}\0".encode() + data).hexdigest()


def content(sha, depth=0):
    if depth > 120:
        raise RuntimeError("Source edit dependency depth exceeded.")
    if sha in cache:
        return cache[sha]
    if sha in blobs:
        change = blobs[sha]
        data = content(change["base"], depth + 1)
        lines = data.decode("utf-8").splitlines(keepends=True)
        previous_end = 0
        for edit in change["edits"]:
            start, end = edit["start"], edit["start"] + edit["remove"]
            if not (previous_end <= start <= end <= len(lines)):
                raise RuntimeError("Invalid or overlapping reviewed source edits.")
            previous_end = end
        for edit in reversed(change["edits"]):
            start = edit["start"]
            lines[start:start + edit["remove"]] = edit["text"].splitlines(keepends=True)
        data = "".join(lines).encode()
    else:
        value = api(f"/repos/{REPO}/git/blobs/{sha}")
        if value["encoding"] != "base64":
            raise RuntimeError("Unexpected source encoding.")
        data = base64.b64decode(value["content"])
    if git_hash("blob", data) != sha:
        raise RuntimeError("Reviewed source content hash mismatch.")
    cache[sha] = data
    return data


try:
    if ref("refs/heads/main") != MAIN or ref(FEATURE) != EXPECTED:
        raise RuntimeError("A planning baseline moved; publication refused.")
    stage_before = PLAN.get("stageBefore", ZERO)
    if ref(STAGE) != stage_before:
        raise RuntimeError("The checkpoint branch moved; publication refused.")
    main_tree = api(f"/repos/{REPO}/git/commits/{MAIN}")["tree"]["sha"]
    for index, entry in enumerate(PLAN["commits"]):
        original = api(f"/repos/{REPO}/git/commits/{entry['original']}")
        if original["tree"]["sha"] != entry["originalTree"]:
            raise RuntimeError("Original source tree mismatch.")
        parents = [published[p]["commit"] if p in published else MAIN
                   for p in entry["parents"]]
        parents = list(dict.fromkeys(parents))
        if not parents:
            raise RuntimeError("A replayed commit needs its recorded parent.")
        parent_tree = published[entry["parents"][0]]["tree"] if entry["parents"][0] in published else main_tree
        prior = published.get(entry["original"])
        if prior:
            existing = api(f"/repos/{REPO}/git/commits/{prior['commit']}")
            if (existing["tree"]["sha"] != entry["tree"] or
                    [p["sha"] for p in existing["parents"]] != parents):
                raise RuntimeError("Existing replay checkpoint does not match the reviewed plan.")
        else:
            tree_entries = []
            for change in entry["changes"]:
                path = change["path"]
                if path.startswith("/") or ".git" in Path(path).parts or ".." in Path(path).parts:
                    raise RuntimeError("Unsafe source path.")
                item = {"path": path, "mode": change["mode"], "type": "blob"}
                sha = change["sha"]
                if sha in blobs:
                    item["content"] = content(sha).decode("utf-8")
                else:
                    item["sha"] = sha
                tree_entries.append(item)
            if tree_entries:
                tree = api(f"/repos/{REPO}/git/trees", {"base_tree": parent_tree, "tree": tree_entries})["sha"]
            else:
                tree = parent_tree
            if tree != entry["tree"]:
                raise RuntimeError("Rebased tree differs from the reviewed tree.")
            message = original["message"].rstrip()
            if "[skip ci]" not in message:
                message = "[skip ci] " + message
            message += f"\n\nRebased-from: {entry['original']}\nRebased-onto: {MAIN}\n"
            created = api(f"/repos/{REPO}/git/commits", {
                "message": message, "tree": tree, "parents": parents,
                "author": {key: original["author"][key] for key in ("name", "email", "date")},
                "committer": {"name": "github-actions[bot]",
                    "email": "41898282+github-actions[bot]@users.noreply.github.com",
                    "date": PLAN["committerDate"]}
            })
            published[entry["original"]] = {"commit": created["sha"], "tree": tree}
        head = published[entry["original"]]["commit"]
        if index == len(PLAN["commits"]) - 1:
            move(STAGE, stage_before, head)
            stage_before = head
        print(f"Prepared {index + 1}/{len(PLAN['commits'])}: {entry['original'][:8]} -> {head[:8]}", flush=True)
        result["lastPrepared"] = head
        (ROOT / "replay-result.json").write_text(json.dumps(result, indent=2))
    if PLAN["publishFeature"]:
        if ref("refs/heads/main") != MAIN:
            raise RuntimeError("Main changed during preparation; publication refused.")
        move(FEATURE, EXPECTED, head)
        result["featureHead"] = head
    result["stageHead"] = head
    result["completed"] = True
finally:
    result["requestsWritten"] = writes
    (ROOT / "replay-result.json").write_text(json.dumps(result, indent=2))
