#!/usr/bin/env node
/**
 * Validates SCENE_ELEMENT_REGISTRY.json structure and approved file paths.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = join(root, "dev/scene-elements/SCENE_ELEMENT_REGISTRY.json");

function loadRegistry() {
  return JSON.parse(readFileSync(registryPath, "utf8"));
}

function resolveGamePath(rel) {
  if (!rel || typeof rel !== "string") return null;
  if (rel.startsWith("M:/") || rel.startsWith("M:\\")) return null;
  return join(root, rel.replace(/\//g, "\\"));
}

export function auditSceneElementRegistry() {
  const issues = [];
  let registry;

  try {
    registry = loadRegistry();
  } catch (err) {
    return [`Cannot read registry: ${err.message}`];
  }

  if (!Array.isArray(registry.elements) || registry.elements.length === 0) {
    issues.push("registry.elements must be a non-empty array");
    return issues;
  }

  const ids = new Set();
  for (const el of registry.elements) {
    if (!el.id) {
      issues.push("element missing id");
      continue;
    }
    if (ids.has(el.id)) issues.push(`duplicate element id: ${el.id}`);
    ids.add(el.id);

    if (!el.referenceSearch) {
      issues.push(`${el.id}: missing referenceSearch`);
    } else {
      const hasRef =
        (el.referenceSearch.pinterest?.length ?? 0) > 0 ||
        (el.referenceSearch.gameRefs?.length ?? 0) > 0 ||
        (el.referenceSearch.web?.length ?? 0) > 0;
      if (!hasRef) issues.push(`${el.id}: referenceSearch has no pinterest, web, or gameRefs`);
    }

    if (!Array.isArray(el.antiSlop) || el.antiSlop.length === 0) {
      issues.push(`${el.id}: missing antiSlop[] guard list`);
    }

    const status = el.characterMap?.status ?? "missing";
    if (!["approved", "pending", "missing"].includes(status)) {
      issues.push(`${el.id}: invalid characterMap.status "${status}"`);
    }

    if (status === "approved") {
      const checkPaths = [
        el.characterMap?.path,
        el.approvedLayer?.path,
        el.approvedLayer?.pickHero,
      ].filter((p) => p && !p.endsWith("/"));

      const hasResolvable = checkPaths.some((p) => {
        const abs = resolveGamePath(p);
        return abs && existsSync(abs);
      });

      const bakedInBaseplate =
        el.approvedLayer?.compositeSlot === "baseplate" ||
        el.approvedLayer?.compositeSlot === "baseplate-background" ||
        el.approvedLayer?.compositeSlot === "patient-body" ||
        el.characterMap?.role?.includes("baked");

      if (!hasResolvable && !bakedInBaseplate && !el.approvedLayer?.fallback) {
        issues.push(`${el.id}: status approved but no resolvable file path on disk`);
      }
    }
  }

  const runtimePath = join(root, "src/lib/sceneElementRegistry.js");
  if (!existsSync(runtimePath)) {
    issues.push("missing src/lib/sceneElementRegistry.js runtime loader");
  }

  return issues;
}

if (process.argv[1]?.includes("audit-scene-element-registry")) {
  const issues = auditSceneElementRegistry();
  if (issues.length) {
    console.error("scene-element-registry audit failed:");
    for (const issue of issues) console.error(`  - ${issue}`);
    process.exit(1);
  }
  console.log("scene-element-registry audit OK");
}
