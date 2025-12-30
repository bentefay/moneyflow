/**
 * Tag Hierarchy Utilities
 *
 * Functions for working with hierarchical tag structures.
 * Tags can have parent-child relationships forming a tree structure.
 */

/**
 * Minimal tag interface for hierarchy operations.
 * Compatible with both the full CRDT Tag type and simpler test types.
 */
export interface TagLike {
  id: string;
  name: string;
  parentTagId?: string;
  isTransfer?: boolean;
  deletedAt?: number;
}

/**
 * Tag with computed depth and parent info.
 */
export interface TagWithDepth<T extends TagLike = TagLike> {
  tag: T;
  depth: number;
  parentName?: string;
}

/**
 * Compute the depth of a tag in the hierarchy.
 * Returns 0 for root-level tags.
 */
export function getTagDepth<T extends TagLike>(tagId: string, tags: T[]): number {
  const tagMap = new Map(tags.map((t) => [t.id, t]));

  let depth = 0;
  let currentTag = tagMap.get(tagId);

  // Safety limit to prevent infinite loops from circular references
  const maxDepth = 100;

  while (currentTag?.parentTagId && depth < maxDepth) {
    depth++;
    currentTag = tagMap.get(currentTag.parentTagId);
  }

  return depth;
}

/**
 * Get all ancestors of a tag (from immediate parent to root).
 * Returns empty array for root-level tags.
 */
export function getTagAncestors<T extends TagLike>(tagId: string, tags: T[]): T[] {
  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const ancestors: T[] = [];
  let currentTag = tagMap.get(tagId);

  // Safety limit to prevent infinite loops
  const maxDepth = 100;
  let depth = 0;

  while (currentTag?.parentTagId && depth < maxDepth) {
    const parent = tagMap.get(currentTag.parentTagId);
    if (parent) {
      ancestors.push(parent);
      currentTag = parent;
    } else {
      break;
    }
    depth++;
  }

  return ancestors;
}

/**
 * Get all descendants of a tag (children, grandchildren, etc.).
 * Returns empty array for leaf tags.
 */
export function getTagDescendants<T extends TagLike>(tagId: string, tags: T[]): T[] {
  const childrenMap = new Map<string, T[]>();

  // Build children lookup
  for (const tag of tags) {
    const parentId = tag.parentTagId ?? "";
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(tag);
  }

  const descendants: T[] = [];

  // BFS to collect all descendants
  const queue = [tagId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = childrenMap.get(currentId) ?? [];
    for (const child of children) {
      descendants.push(child);
      queue.push(child.id);
    }
  }

  return descendants;
}

/**
 * Get immediate children of a tag.
 */
export function getTagChildren<T extends TagLike>(tagId: string, tags: T[]): T[] {
  return tags.filter((t) => t.parentTagId === tagId);
}

/**
 * Check if a tag is a descendant of another tag.
 * Returns true if childId is anywhere in the descendant tree of ancestorId.
 */
export function isTagDescendant<T extends TagLike>(
  childId: string,
  ancestorId: string,
  tags: T[]
): boolean {
  if (childId === ancestorId) return false;

  const tagMap = new Map(tags.map((t) => [t.id, t]));
  let currentTag = tagMap.get(childId);

  // Safety limit to prevent infinite loops
  const maxDepth = 100;
  let depth = 0;

  while (currentTag?.parentTagId && depth < maxDepth) {
    if (currentTag.parentTagId === ancestorId) {
      return true;
    }
    currentTag = tagMap.get(currentTag.parentTagId);
    depth++;
  }

  return false;
}

/**
 * Check if setting a parent would create a circular reference.
 * Returns true if the proposed parent is a descendant of the tag.
 */
export function wouldCreateCircularReference<T extends TagLike>(
  tagId: string,
  proposedParentId: string,
  tags: T[]
): boolean {
  if (tagId === proposedParentId) return true;
  return isTagDescendant(proposedParentId, tagId, tags);
}

/**
 * Build a hierarchical list of tags sorted by tree order.
 * Tags are ordered so that parents appear before children,
 * and siblings are sorted alphabetically.
 */
export function buildHierarchicalTagList<T extends TagLike>(tags: T[]): TagWithDepth<T>[] {
  const result: TagWithDepth<T>[] = [];
  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const childrenMap = new Map<string, T[]>();

  // Build children lookup
  for (const tag of tags) {
    const parentId = tag.parentTagId ?? "";
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId)!.push(tag);
  }

  // Sort children alphabetically
  for (const children of childrenMap.values()) {
    children.sort((a, b) => a.name.localeCompare(b.name));
  }

  // DFS traversal
  function traverse(parentId: string, depth: number) {
    const children = childrenMap.get(parentId) ?? [];
    for (const child of children) {
      const parent = parentId ? tagMap.get(parentId) : undefined;
      result.push({
        tag: child,
        depth,
        parentName: parent?.name,
      });
      traverse(child.id, depth + 1);
    }
  }

  traverse("", 0);

  return result;
}

/**
 * Get the full path of a tag (from root to tag).
 * Returns an array of tag names, e.g., ["Food", "Groceries", "Organic"].
 */
export function getTagPath<T extends TagLike>(tagId: string, tags: T[]): string[] {
  const tagMap = new Map(tags.map((t) => [t.id, t]));
  const tag = tagMap.get(tagId);

  if (!tag) return [];

  // Get ancestors (immediate parent first) and reverse to get root-to-parent order
  const ancestors = getTagAncestors(tagId, tags);
  const path = ancestors.reverse().map((a) => a.name);

  // Add the tag itself at the end
  path.push(tag.name);

  return path;
}

/**
 * Get the full path string of a tag (e.g., "Food > Groceries > Organic").
 */
export function getTagPathString<T extends TagLike>(
  tagId: string,
  tags: T[],
  separator: string = " > "
): string {
  return getTagPath(tagId, tags).join(separator);
}

/**
 * Find root tags (tags with no parent).
 */
export function getRootTags<T extends TagLike>(tags: T[]): T[] {
  return tags.filter((t) => !t.parentTagId).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Filter out deleted tags.
 */
export function filterActiveTags<T extends TagLike>(tags: T[]): T[] {
  return tags.filter((t) => !t.deletedAt);
}

/**
 * Validate tag hierarchy integrity.
 * Returns an array of issues found (empty if valid).
 */
export function validateTagHierarchy<T extends TagLike>(tags: T[]): string[] {
  const issues: string[] = [];
  const tagMap = new Map(tags.map((t) => [t.id, t]));

  for (const tag of tags) {
    // Check for missing parent references
    if (tag.parentTagId && !tagMap.has(tag.parentTagId)) {
      issues.push(`Tag "${tag.name}" references non-existent parent ID: ${tag.parentTagId}`);
    }

    // Check for circular references
    if (tag.parentTagId && isTagDescendant(tag.parentTagId, tag.id, tags)) {
      issues.push(`Tag "${tag.name}" has a circular parent reference`);
    }

    // Check for self-reference
    if (tag.parentTagId === tag.id) {
      issues.push(`Tag "${tag.name}" references itself as parent`);
    }
  }

  return issues;
}
