"""Temporary scoped replay: GitHub objects/atomic ref leases, no Git commands.

The manifest contains data-only, reviewed conflict edits and expected tree hashes.
Ordinary changes use the same diff3 merge exercised locally. No main ref is writable.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
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
assert 0 < len(PLAN["commits"]) <= 105
assert isinstance(PLAN["publishFeature"], bool)
if PLAN["publishFeature"]:
    assert len(PLAN["commits"]) == 105
    assert PLAN["commits"][-1]["original"] == SOURCE

last_write = 0.0
writes = 0
cache = {}
metadata = {}
trees = {}
generated = set()
published = dict(PLAN.get("published", {}))
replayed = {}
source_ids = {entry["original"] for entry in PLAN["commits"]}
excluded = set(PLAN["excludedParents"])
assert not source_ids & excluded
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


def remember(data):
    sha = git_hash("blob", data)
    cache[sha] = data
    generated.add(sha)
    return sha


def content(sha):
    if sha not in cache:
        value = api(f"/repos/{REPO}/git/blobs/{sha}")
        if value["encoding"] != "base64":
            raise RuntimeError("Unexpected source encoding.")
        data = base64.b64decode(value["content"])
        if git_hash("blob", data) != sha:
            raise RuntimeError("Source content hash mismatch.")
        cache[sha] = data
    return cache[sha]


def commit(sha):
    if sha not in metadata:
        metadata[sha] = api(f"/repos/{REPO}/git/commits/{sha}")
    return metadata[sha]


def files(sha):
    tree = commit(sha)["tree"]["sha"]
    if tree not in trees:
        value = api(f"/repos/{REPO}/git/trees/{tree}?recursive=1")
        if value.get("truncated"):
            raise RuntimeError("Incomplete source tree; replay refused.")
        entries = {}
        for entry in value["tree"]:
            if entry["type"] == "tree":
                continue
            path = entry["path"]
            if (entry["type"] != "blob" or path.startswith("/") or
                    ".git" in Path(path).parts or ".." in Path(path).parts):
                raise RuntimeError("Unsupported or unsafe source entry.")
            entries[path] = {"mode": entry["mode"], "sha": entry["sha"]}
        trees[tree] = entries
    return trees[tree]


def resolved(change):
    lines = content(change["base"]).decode("utf-8").splitlines(keepends=True)
    previous_end = 0
    for edit in change["edits"]:
        start, end = edit["start"], edit["start"] + edit["remove"]
        if not (previous_end <= start <= end <= len(lines)):
            raise RuntimeError("Invalid reviewed source edits.")
        previous_end = end
    for edit in reversed(change["edits"]):
        start = edit["start"]
        lines[start:start + edit["remove"]] = edit["text"].splitlines(keepends=True)
    sha = remember("".join(lines).encode())
    if sha != change["sha"]:
        raise RuntimeError("Conflict resolution differs from reviewed source.")
    return sha


def replay(entry, main_files):
    parents = entry["parents"]
    old = files(parents[0])
    after = files(entry["original"])
    target = dict(replayed.get(parents[0], main_files))
    starting = dict(target)
    merged_main = [files(parent) for parent in parents[1:] if parent in excluded]
    resolutions = PLAN["resolutions"].get(entry["original"], {})
    for path in sorted(old.keys() | after.keys()):
        base, theirs = old.get(path), after.get(path)
        if base == theirs:
            continue
        # Current main already supersedes an unchanged imported main ancestor.
        if any(theirs == ancestor.get(path) for ancestor in merged_main):
            continue
        ours = target.get(path)
        if ours == theirs:
            continue
        if ours == base:
            if theirs:
                target[path] = theirs
            else:
                target.pop(path, None)
            continue
        resolution = resolutions.get(path)
        if not ours or not theirs:
            if not resolution:
                raise RuntimeError(f"Unreviewed delete/modify conflict: {path}")
            target[path] = {"mode": (theirs or ours)["mode"], "sha": resolved(resolution)}
            continue
        with tempfile.TemporaryDirectory() as temporary:
            paths = []
            for name, source in zip(("rebased", "old-parent", "original"), (ours, base, theirs)):
                file = Path(temporary) / name
                file.write_bytes(content(source["sha"]) if source else b"")
                paths.append(str(file))
            merged = subprocess.run(
                ["diff3", "-m", "-E", "-L", "rebased", "-L", "old-parent", "-L", "original", *paths],
                capture_output=True, check=False, timeout=60,
            )
        if merged.returncode not in (0, 1):
            raise RuntimeError(f"Source merge failed: {path}")
        sha = remember(merged.stdout)
        if resolution:
            sha = resolved(resolution)
        elif merged.returncode:
            raise RuntimeError(f"Unreviewed source conflict: {path}")
        target[path] = {"mode": theirs["mode"], "sha": sha}
    replayed[entry["original"]] = target
    return starting, target


try:
    if ref("refs/heads/main") != MAIN or ref(FEATURE) != EXPECTED:
        raise RuntimeError("A planning baseline moved; publication refused.")
    stage_before = PLAN.get("stageBefore", ZERO)
    if ref(STAGE) != stage_before:
        raise RuntimeError("The checkpoint branch moved; publication refused.")
    main_tree = commit(MAIN)["tree"]["sha"]
    main_files = files(MAIN)
    for index, entry in enumerate(PLAN["commits"]):
        original = commit(entry["original"])
        if (original["tree"]["sha"] != entry["originalTree"] or
                [parent["sha"] for parent in original["parents"]] != entry["parents"]):
            raise RuntimeError("Original source tree or parents mismatch.")
        if any(parent not in published and parent not in excluded for parent in entry["parents"]):
            raise RuntimeError("A source parent has not been replayed.")
        parents = list(dict.fromkeys(published[p]["commit"] if p in published else MAIN
                                   for p in entry["parents"]))
        if not parents:
            raise RuntimeError("A replayed commit needs its recorded parent.")
        parent_tree = published[entry["parents"][0]]["tree"] if entry["parents"][0] in published else main_tree
        starting, target = replay(entry, main_files)
        prior = published.get(entry["original"])
        if prior:
            existing = commit(prior["commit"])
            if (prior["tree"] != entry["tree"] or existing["tree"]["sha"] != entry["tree"] or
                    [p["sha"] for p in existing["parents"]] != parents):
                raise RuntimeError("Existing replay checkpoint differs from the reviewed plan.")
        else:
            tree_entries = []
            for path in sorted(starting.keys() | target.keys()):
                before, after = starting.get(path), target.get(path)
                if before == after:
                    continue
                item = {"path": path, "mode": (after or before)["mode"], "type": "blob"}
                sha = after["sha"] if after else None
                if sha in generated:
                    item["content"] = content(sha).decode("utf-8")
                else:
                    item["sha"] = sha
                tree_entries.append(item)
            tree = (api(f"/repos/{REPO}/git/trees", {"base_tree": parent_tree, "tree": tree_entries})["sha"]
                    if tree_entries else parent_tree)
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
