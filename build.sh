#!/bin/bash
set -e
npm install -g corepack@latest
corepack enable pnpm
pnpm install
pnpm build:roam
cp dist/* .