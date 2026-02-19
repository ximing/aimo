#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 1.2.3"
  exit 1
fi

input_version="$1"
version="${input_version#v}"
tag="v${version}"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree is not clean. Please commit or stash changes first."
  exit 1
fi

files=("package.json" "apps/client/package.json")

for file in "${files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing file: $file"
    exit 1
  fi

done

if git rev-parse "${tag}" >/dev/null 2>&1; then
  echo "Tag already exists: ${tag}"
  exit 1
fi

for file in "${files[@]}"; do
  node -e "const fs=require('fs'); const path='${file}'; const data=JSON.parse(fs.readFileSync(path,'utf8')); data.version='${version}'; fs.writeFileSync(path, JSON.stringify(data, null, 2) + '\n');"
done

git add "${files[@]}"
git commit -m "chore(release): ${tag}"
git tag "${tag}"

git push origin HEAD
git push origin "${tag}"
