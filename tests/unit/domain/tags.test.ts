/**
 * Tag Hierarchy Tests
 *
 * Unit tests for tag hierarchy traversal and validation functions.
 * Uses table-driven tests for clarity and comprehensive edge case coverage.
 */

import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	buildHierarchicalTagList,
	filterActiveTags,
	getRootTags,
	getTagAncestors,
	getTagChildren,
	getTagDepth,
	getTagDescendants,
	getTagPath,
	getTagPathString,
	isTagDescendant,
	type TagLike,
	validateTagHierarchy,
	wouldCreateCircularReference,
} from "@/lib/domain/tags";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Simplified tag type for testing that matches the essential fields
 * without loro-mirror's $cid injection.
 */
interface TestTag {
	id: string;
	name: string;
	parentTagId?: string;
	isTransfer?: boolean;
	deletedAt?: number;
}

/**
 * Create a minimal test tag
 */
function createTag(
	id: string,
	name: string,
	parentTagId?: string,
	isTransfer = false,
	deletedAt?: number
): TestTag {
	return {
		id,
		name,
		parentTagId,
		isTransfer,
		deletedAt,
	};
}

/**
 * Create a common tag hierarchy for testing:
 *
 * Food (root)
 *   ├── Groceries
 *   │     ├── Organic
 *   │     └── Bulk
 *   └── Restaurants
 *         └── Fast Food
 * Transport (root)
 *   ├── Gas
 *   └── Public Transit
 * Entertainment (root, transfer tag)
 */
function createTestHierarchy(): TestTag[] {
	return [
		createTag("food", "Food"),
		createTag("groceries", "Groceries", "food"),
		createTag("organic", "Organic", "groceries"),
		createTag("bulk", "Bulk", "groceries"),
		createTag("restaurants", "Restaurants", "food"),
		createTag("fastfood", "Fast Food", "restaurants"),
		createTag("transport", "Transport"),
		createTag("gas", "Gas", "transport"),
		createTag("transit", "Public Transit", "transport"),
		createTag("entertainment", "Entertainment", undefined, true),
	];
}

// ============================================================================
// getTagDepth tests
// ============================================================================

describe("getTagDepth", () => {
	const tags = createTestHierarchy();

	const depthTests = [
		{ tagId: "food", expected: 0, description: "root tag" },
		{ tagId: "groceries", expected: 1, description: "first level child" },
		{ tagId: "organic", expected: 2, description: "second level child" },
		{ tagId: "fastfood", expected: 2, description: "another second level" },
		{ tagId: "nonexistent", expected: 0, description: "non-existent tag" },
	];

	for (const { tagId, expected, description } of depthTests) {
		it(`returns ${expected} for ${description} (${tagId})`, () => {
			expect(getTagDepth(tagId, tags)).toBe(expected);
		});
	}

	it("handles empty tag list", () => {
		expect(getTagDepth("any", [])).toBe(0);
	});
});

// ============================================================================
// getTagAncestors tests
// ============================================================================

describe("getTagAncestors", () => {
	const tags = createTestHierarchy();

	it("returns empty array for root tag", () => {
		expect(getTagAncestors("food", tags)).toEqual([]);
	});

	it("returns parent for first-level child", () => {
		const ancestors = getTagAncestors("groceries", tags);
		expect(ancestors).toHaveLength(1);
		expect(ancestors[0].id).toBe("food");
	});

	it("returns ancestors in order (immediate parent first)", () => {
		const ancestors = getTagAncestors("organic", tags);
		expect(ancestors).toHaveLength(2);
		expect(ancestors[0].id).toBe("groceries");
		expect(ancestors[1].id).toBe("food");
	});

	it("returns empty array for non-existent tag", () => {
		expect(getTagAncestors("nonexistent", tags)).toEqual([]);
	});
});

// ============================================================================
// getTagDescendants tests
// ============================================================================

describe("getTagDescendants", () => {
	const tags = createTestHierarchy();

	it("returns all descendants for root tag", () => {
		const descendants = getTagDescendants("food", tags);
		const descendantIds = descendants.map((t) => t.id).sort();
		expect(descendantIds).toEqual(["bulk", "fastfood", "groceries", "organic", "restaurants"]);
	});

	it("returns direct children for mid-level tag", () => {
		const descendants = getTagDescendants("groceries", tags);
		const descendantIds = descendants.map((t) => t.id).sort();
		expect(descendantIds).toEqual(["bulk", "organic"]);
	});

	it("returns empty array for leaf tag", () => {
		expect(getTagDescendants("organic", tags)).toEqual([]);
	});

	it("returns empty array for non-existent tag", () => {
		expect(getTagDescendants("nonexistent", tags)).toEqual([]);
	});
});

// ============================================================================
// getTagChildren tests
// ============================================================================

describe("getTagChildren", () => {
	const tags = createTestHierarchy();

	it("returns direct children only", () => {
		const children = getTagChildren("food", tags);
		const childIds = children.map((t) => t.id).sort();
		expect(childIds).toEqual(["groceries", "restaurants"]);
	});

	it("returns empty array for leaf tag", () => {
		expect(getTagChildren("organic", tags)).toEqual([]);
	});
});

// ============================================================================
// isTagDescendant tests
// ============================================================================

describe("isTagDescendant", () => {
	const tags = createTestHierarchy();

	const descendantTests = [
		{ childId: "groceries", ancestorId: "food", expected: true, description: "direct child" },
		{ childId: "organic", ancestorId: "food", expected: true, description: "grandchild" },
		{ childId: "fastfood", ancestorId: "food", expected: true, description: "deep descendant" },
		{
			childId: "food",
			ancestorId: "groceries",
			expected: false,
			description: "reverse relationship",
		},
		{ childId: "food", ancestorId: "food", expected: false, description: "same tag" },
		{ childId: "transport", ancestorId: "food", expected: false, description: "different subtree" },
	];

	for (const { childId, ancestorId, expected, description } of descendantTests) {
		it(`returns ${expected} for ${description}`, () => {
			expect(isTagDescendant(childId, ancestorId, tags)).toBe(expected);
		});
	}
});

// ============================================================================
// wouldCreateCircularReference tests
// ============================================================================

describe("wouldCreateCircularReference", () => {
	const tags = createTestHierarchy();

	it("returns true for self-reference", () => {
		expect(wouldCreateCircularReference("food", "food", tags)).toBe(true);
	});

	it("returns true if proposed parent is a descendant", () => {
		expect(wouldCreateCircularReference("food", "groceries", tags)).toBe(true);
		expect(wouldCreateCircularReference("food", "organic", tags)).toBe(true);
	});

	it("returns false for valid parent relationship", () => {
		expect(wouldCreateCircularReference("organic", "transport", tags)).toBe(false);
		expect(wouldCreateCircularReference("groceries", "transport", tags)).toBe(false);
	});

	it("returns false for root-level assignment", () => {
		expect(wouldCreateCircularReference("groceries", "", tags)).toBe(false);
	});
});

// ============================================================================
// buildHierarchicalTagList tests
// ============================================================================

describe("buildHierarchicalTagList", () => {
	const tags = createTestHierarchy();

	it("returns all tags", () => {
		const list = buildHierarchicalTagList(tags);
		expect(list).toHaveLength(tags.length);
	});

	it("parents appear before children", () => {
		const list = buildHierarchicalTagList(tags);
		const idxFood = list.findIndex((t) => t.tag.id === "food");
		const idxGroceries = list.findIndex((t) => t.tag.id === "groceries");
		const idxOrganic = list.findIndex((t) => t.tag.id === "organic");

		expect(idxFood).toBeLessThan(idxGroceries);
		expect(idxGroceries).toBeLessThan(idxOrganic);
	});

	it("assigns correct depths", () => {
		const list = buildHierarchicalTagList(tags);
		const byId = Object.fromEntries(list.map((t) => [t.tag.id, t]));

		expect(byId["food"].depth).toBe(0);
		expect(byId["groceries"].depth).toBe(1);
		expect(byId["organic"].depth).toBe(2);
		expect(byId["entertainment"].depth).toBe(0);
	});

	it("includes parent names for children", () => {
		const list = buildHierarchicalTagList(tags);
		const byId = Object.fromEntries(list.map((t) => [t.tag.id, t]));

		expect(byId["food"].parentName).toBeUndefined();
		expect(byId["groceries"].parentName).toBe("Food");
		expect(byId["organic"].parentName).toBe("Groceries");
	});

	it("handles empty tag list", () => {
		expect(buildHierarchicalTagList([])).toEqual([]);
	});
});

// ============================================================================
// getTagPath tests
// ============================================================================

describe("getTagPath", () => {
	const tags = createTestHierarchy();

	it("returns single-element array for root tag", () => {
		expect(getTagPath("food", tags)).toEqual(["Food"]);
	});

	it("returns full path for nested tag", () => {
		expect(getTagPath("organic", tags)).toEqual(["Food", "Groceries", "Organic"]);
	});

	it("returns empty array for non-existent tag", () => {
		expect(getTagPath("nonexistent", tags)).toEqual([]);
	});
});

// ============================================================================
// getTagPathString tests
// ============================================================================

describe("getTagPathString", () => {
	const tags = createTestHierarchy();

	it("joins path with default separator", () => {
		expect(getTagPathString("organic", tags)).toBe("Food > Groceries > Organic");
	});

	it("uses custom separator", () => {
		expect(getTagPathString("organic", tags, " / ")).toBe("Food / Groceries / Organic");
	});

	it("returns single name for root tag", () => {
		expect(getTagPathString("food", tags)).toBe("Food");
	});
});

// ============================================================================
// getRootTags tests
// ============================================================================

describe("getRootTags", () => {
	const tags = createTestHierarchy();

	it("returns only root-level tags", () => {
		const roots = getRootTags(tags);
		const rootIds = roots.map((t) => t.id);
		expect(rootIds).toEqual(["entertainment", "food", "transport"]);
	});

	it("returns alphabetically sorted", () => {
		const roots = getRootTags(tags);
		const names = roots.map((t) => t.name);
		expect(names).toEqual(["Entertainment", "Food", "Transport"]);
	});

	it("handles empty list", () => {
		expect(getRootTags([])).toEqual([]);
	});
});

// ============================================================================
// filterActiveTags tests
// ============================================================================

describe("filterActiveTags", () => {
	it("removes deleted tags", () => {
		const tags = [
			createTag("a", "Active"),
			createTag("b", "Deleted", undefined, false, Date.now()),
			createTag("c", "Also Active"),
		];

		const active = filterActiveTags(tags);
		expect(active).toHaveLength(2);
		expect(active.map((t) => t.id)).toEqual(["a", "c"]);
	});

	it("returns all tags if none deleted", () => {
		const tags = createTestHierarchy();
		expect(filterActiveTags(tags)).toEqual(tags);
	});
});

// ============================================================================
// validateTagHierarchy tests
// ============================================================================

describe("validateTagHierarchy", () => {
	it("returns empty array for valid hierarchy", () => {
		const tags = createTestHierarchy();
		expect(validateTagHierarchy(tags)).toEqual([]);
	});

	it("detects missing parent reference", () => {
		const tags = [createTag("a", "Tag A", "nonexistent")];
		const issues = validateTagHierarchy(tags);
		expect(issues).toHaveLength(1);
		expect(issues[0]).toContain("non-existent parent");
	});

	it("detects self-reference", () => {
		const tags = [createTag("a", "Tag A", "a")];
		const issues = validateTagHierarchy(tags);
		expect(issues.some((i) => i.includes("references itself"))).toBe(true);
	});

	it("detects circular reference", () => {
		const tags: TestTag[] = [
			{ id: "a", name: "A", parentTagId: "b", isTransfer: false },
			{ id: "b", name: "B", parentTagId: "a", isTransfer: false },
		];
		const issues = validateTagHierarchy(tags);
		expect(issues.some((i) => i.includes("circular"))).toBe(true);
	});
});

// ============================================================================
// Property-based tests
// ============================================================================

describe("property-based tests", () => {
	// Arbitrary for a valid tag without parent
	const rootTagArb: fc.Arbitrary<TestTag> = fc.record({
		id: fc.uuid(),
		name: fc.string({ minLength: 1, maxLength: 50 }),
		parentTagId: fc.constant(undefined),
		isTransfer: fc.boolean(),
		deletedAt: fc.constant(undefined),
	});

	it("root tags always have depth 0", () => {
		fc.assert(
			fc.property(fc.array(rootTagArb, { minLength: 1, maxLength: 10 }), (tags) => {
				for (const tag of tags) {
					expect(getTagDepth(tag.id, tags)).toBe(0);
				}
			})
		);
	});

	it("root tags have no ancestors", () => {
		fc.assert(
			fc.property(fc.array(rootTagArb, { minLength: 1, maxLength: 10 }), (tags) => {
				for (const tag of tags) {
					expect(getTagAncestors(tag.id, tags)).toEqual([]);
				}
			})
		);
	});

	it("hierarchical list preserves all tags", () => {
		fc.assert(
			fc.property(fc.array(rootTagArb, { minLength: 0, maxLength: 10 }), (tags) => {
				const list = buildHierarchicalTagList(tags);
				expect(list).toHaveLength(tags.length);

				const listIds = new Set(list.map((t) => t.tag.id));
				for (const tag of tags) {
					expect(listIds.has(tag.id)).toBe(true);
				}
			})
		);
	});

	it("getTagPath always starts with tag's own name as last element", () => {
		fc.assert(
			fc.property(fc.array(rootTagArb, { minLength: 1, maxLength: 10 }), (tags) => {
				for (const tag of tags) {
					const path = getTagPath(tag.id, tags);
					if (path.length > 0) {
						expect(path[path.length - 1]).toBe(tag.name);
					}
				}
			})
		);
	});
});
