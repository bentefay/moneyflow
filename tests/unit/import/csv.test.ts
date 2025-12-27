/**
 * CSV Parser Unit Tests
 *
 * Table-driven tests with real bank export examples.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { Temporal } from "temporal-polyfill";
import {
  parseCSV,
  parseNumber,
  parseDate,
  detectSeparator,
  detectHeaders,
  type CSVParseOptions,
} from "@/lib/import/csv";

// ============================================================================
// parseCSV tests
// ============================================================================

describe("parseCSV", () => {
  describe("basic parsing", () => {
    const testCases = [
      {
        name: "simple CSV",
        input: "name,amount\nCoffee,5.00\nGas,45.00",
        expected: {
          headers: ["name", "amount"],
          rows: [
            ["Coffee", "5.00"],
            ["Gas", "45.00"],
          ],
          rowCount: 2,
        },
      },
      {
        name: "empty CSV",
        input: "",
        expected: {
          headers: [],
          rows: [],
          rowCount: 0,
        },
      },
      {
        name: "headers only",
        input: "col1,col2,col3",
        expected: {
          headers: ["col1", "col2", "col3"],
          rows: [],
          rowCount: 0,
        },
      },
      {
        name: "single column",
        input: "item\napple\nbanana",
        expected: {
          headers: ["item"],
          rows: [["apple"], ["banana"]],
          rowCount: 2,
        },
      },
      {
        name: "empty fields",
        input: "a,b,c\n1,,3\n,2,",
        expected: {
          headers: ["a", "b", "c"],
          rows: [
            ["1", "", "3"],
            ["", "2", ""],
          ],
          rowCount: 2,
        },
      },
    ];

    for (const tc of testCases) {
      it(tc.name, () => {
        const result = parseCSV(tc.input);
        expect(result.headers).toEqual(tc.expected.headers);
        expect(result.rows).toEqual(tc.expected.rows);
        expect(result.rowCount).toBe(tc.expected.rowCount);
      });
    }
  });

  describe("quoted fields", () => {
    const testCases = [
      {
        name: "quoted field with comma",
        input: 'name,description\nItem,"Has, comma"',
        expected: {
          headers: ["name", "description"],
          rows: [["Item", "Has, comma"]],
        },
      },
      {
        name: "quoted field with newline",
        input: 'name,notes\nItem,"Line 1\nLine 2"',
        expected: {
          headers: ["name", "notes"],
          rows: [["Item", "Line 1\nLine 2"]],
        },
      },
      {
        name: "escaped quotes",
        input: 'name,value\nTest,"He said ""hello"""',
        expected: {
          headers: ["name", "value"],
          rows: [["Test", 'He said "hello"']],
        },
      },
      {
        name: "empty quoted field",
        input: 'a,b\n"",x',
        expected: {
          headers: ["a", "b"],
          rows: [["", "x"]], // "" parses to empty string per RFC 4180
        },
      },
    ];

    for (const tc of testCases) {
      it(tc.name, () => {
        const result = parseCSV(tc.input);
        expect(result.headers).toEqual(tc.expected.headers);
        expect(result.rows).toEqual(tc.expected.rows);
      });
    }
  });

  describe("different separators", () => {
    it("parses semicolon-separated", () => {
      const result = parseCSV("a;b;c\n1;2;3", { separator: ";" });
      expect(result.headers).toEqual(["a", "b", "c"]);
      expect(result.rows).toEqual([["1", "2", "3"]]);
    });

    it("parses tab-separated", () => {
      const result = parseCSV("a\tb\tc\n1\t2\t3", { separator: "\t" });
      expect(result.headers).toEqual(["a", "b", "c"]);
      expect(result.rows).toEqual([["1", "2", "3"]]);
    });

    it("parses pipe-separated", () => {
      const result = parseCSV("a|b|c\n1|2|3", { separator: "|" });
      expect(result.headers).toEqual(["a", "b", "c"]);
      expect(result.rows).toEqual([["1", "2", "3"]]);
    });
  });

  describe("no headers mode", () => {
    it("generates column names", () => {
      const result = parseCSV("1,2,3\n4,5,6", { hasHeaders: false });
      expect(result.headers).toEqual(["Column 1", "Column 2", "Column 3"]);
      expect(result.rows).toEqual([
        ["1", "2", "3"],
        ["4", "5", "6"],
      ]);
    });

    it("handles empty column names", () => {
      const result = parseCSV(",test,\na,b,c", { hasHeaders: true });
      expect(result.headers).toEqual(["Column 1", "test", "Column 3"]);
    });
  });

  describe("maxRows limit", () => {
    it("truncates rows", () => {
      const result = parseCSV("a\n1\n2\n3\n4\n5", { maxRows: 2 });
      expect(result.rowCount).toBe(2);
      expect(result.truncated).toBe(true);
      expect(result.rows.length).toBe(2);
    });

    it("does not truncate when under limit", () => {
      const result = parseCSV("a\n1\n2", { maxRows: 10 });
      expect(result.truncated).toBe(false);
    });
  });

  describe("warnings", () => {
    it("warns on inconsistent column count", () => {
      const result = parseCSV("a,b,c\n1,2\n3,4,5,6");
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes("columns"))).toBe(true);
    });
  });

  describe("line endings", () => {
    it("handles CRLF", () => {
      const result = parseCSV("a,b\r\n1,2\r\n3,4");
      expect(result.rows).toEqual([
        ["1", "2"],
        ["3", "4"],
      ]);
    });

    it("handles CR only", () => {
      const result = parseCSV("a,b\r1,2\r3,4");
      expect(result.rows).toEqual([
        ["1", "2"],
        ["3", "4"],
      ]);
    });
  });

  describe("real bank export examples", () => {
    it("parses Chase-style export", () => {
      const chase = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
01/15/2024,01/16/2024,COFFEE SHOP,Food & Drink,Sale,-5.50,
01/14/2024,01/15/2024,GAS STATION,Gas,Sale,-45.00,`;

      const result = parseCSV(chase);
      expect(result.headers).toEqual([
        "Transaction Date",
        "Post Date",
        "Description",
        "Category",
        "Type",
        "Amount",
        "Memo",
      ]);
      expect(result.rowCount).toBe(2);
      expect(result.rows[0][2]).toBe("COFFEE SHOP");
      expect(result.rows[0][5]).toBe("-5.50");
    });

    it("parses Bank of America-style export", () => {
      const boa = `Date,Description,Amount,Running Bal.
01/15/2024,"AMAZON.COM*AMZN.COM/BI, WA",-25.99,1234.56
01/14/2024,DIRECT DEPOSIT,2500.00,1260.55`;

      const result = parseCSV(boa);
      expect(result.headers).toEqual(["Date", "Description", "Amount", "Running Bal."]);
      expect(result.rows[0][1]).toBe("AMAZON.COM*AMZN.COM/BI, WA");
    });

    it("parses European-style export (semicolon, comma decimals)", () => {
      const european = `Datum;Beschreibung;Betrag
15.01.2024;Kaffee;-5,50
14.01.2024;Tankstelle;-45,00`;

      const result = parseCSV(european, { separator: ";" });
      expect(result.headers).toEqual(["Datum", "Beschreibung", "Betrag"]);
      expect(result.rows[0][2]).toBe("-5,50");
    });
  });
});

// ============================================================================
// parseNumber tests
// ============================================================================

describe("parseNumber", () => {
  describe("basic formats", () => {
    const testCases = [
      { input: "123", expected: 123 },
      { input: "123.45", expected: 123.45 },
      { input: "-123.45", expected: -123.45 },
      { input: "0", expected: 0 },
      { input: "0.00", expected: 0 },
      { input: ".5", expected: 0.5 },
      { input: "1,234.56", expected: 1234.56 },
      { input: "1,234,567.89", expected: 1234567.89 },
    ];

    for (const tc of testCases) {
      it(`parses "${tc.input}" as ${tc.expected}`, () => {
        expect(parseNumber(tc.input)).toBe(tc.expected);
      });
    }
  });

  describe("currency symbols", () => {
    const testCases = [
      { input: "$123.45", expected: 123.45 },
      { input: "€100.00", expected: 100 },
      { input: "£50.00", expected: 50 },
      { input: "¥1000", expected: 1000 },
      { input: "₹500", expected: 500 },
    ];

    for (const tc of testCases) {
      it(`strips ${tc.input.charAt(0)} symbol`, () => {
        expect(parseNumber(tc.input)).toBe(tc.expected);
      });
    }
  });

  describe("accounting format (parentheses for negative)", () => {
    it("parses (123.45) as negative", () => {
      expect(parseNumber("(123.45)")).toBe(-123.45);
    });

    it("parses ($1,234.56) as negative with currency", () => {
      expect(parseNumber("($1,234.56)")).toBe(-1234.56);
    });
  });

  describe("European format", () => {
    it("parses with comma decimal separator", () => {
      expect(parseNumber("1.234,56", ".", ",")).toBe(1234.56);
    });

    it("parses with space thousand separator", () => {
      expect(parseNumber("1 234,56", " ", ",")).toBe(1234.56);
    });
  });

  describe("edge cases", () => {
    it("returns NaN for empty string", () => {
      expect(parseNumber("")).toBeNaN();
    });

    it("returns NaN for whitespace only", () => {
      expect(parseNumber("   ")).toBeNaN();
    });

    it("returns NaN for non-numeric text", () => {
      expect(parseNumber("not a number")).toBeNaN();
    });

    it("handles whitespace around number", () => {
      expect(parseNumber("  123.45  ")).toBe(123.45);
    });
  });

  // Property: roundtrip number formatting
  it("parses formatted numbers correctly (property-based)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -999999.99, max: 999999.99, noNaN: true, noDefaultInfinity: true }),
        (num) => {
          // Format with 2 decimals and parse back
          const formatted = num.toFixed(2);
          const parsed = parseNumber(formatted);
          expect(parsed).toBeCloseTo(num, 2);
        }
      )
    );
  });
});

// ============================================================================
// parseDate tests
// Note: The parseDate function has a bug in regex escaping that prevents it
// from parsing dates correctly. These tests document the current (broken)
// behavior while preserving the test structure for when the bug is fixed.
// ============================================================================

describe("parseDate", () => {
  describe("common formats", () => {
    const testCases = [
      {
        input: "2024-01-15",
        format: "yyyy-MM-dd",
        expected: Temporal.PlainDate.from("2024-01-15"),
      },
      {
        input: "01/15/2024",
        format: "MM/dd/yyyy",
        expected: Temporal.PlainDate.from("2024-01-15"),
      },
      {
        input: "15/01/2024",
        format: "dd/MM/yyyy",
        expected: Temporal.PlainDate.from("2024-01-15"),
      },
      {
        input: "15.01.2024",
        format: "dd.MM.yyyy",
        expected: Temporal.PlainDate.from("2024-01-15"),
      },
      { input: "1/5/2024", format: "M/d/yyyy", expected: Temporal.PlainDate.from("2024-01-05") },
      { input: "24-01-15", format: "yy-MM-dd", expected: Temporal.PlainDate.from("2024-01-15") },
    ];

    for (const tc of testCases) {
      it(`parses "${tc.input}" with format "${tc.format}"`, () => {
        expect(parseDate(tc.input, tc.format)).toEqual(tc.expected);
      });
    }
  });

  describe("two-digit year handling", () => {
    it("treats yy < 50 as 2000s", () => {
      expect(parseDate("24-01-15", "yy-MM-dd")).toEqual(Temporal.PlainDate.from("2024-01-15"));
    });

    it("treats yy >= 50 as 1900s", () => {
      expect(parseDate("99-01-15", "yy-MM-dd")).toEqual(Temporal.PlainDate.from("1999-01-15"));
    });
  });

  describe("validation", () => {
    it("rejects invalid month", () => {
      expect(parseDate("2024-13-01", "yyyy-MM-dd")).toBeNull();
    });

    it("rejects invalid day", () => {
      expect(parseDate("2024-01-32", "yyyy-MM-dd")).toBeNull();
    });

    it("rejects month 0", () => {
      expect(parseDate("2024-00-15", "yyyy-MM-dd")).toBeNull();
    });

    it("rejects day 0", () => {
      expect(parseDate("2024-01-00", "yyyy-MM-dd")).toBeNull();
    });

    it("returns null for empty input", () => {
      expect(parseDate("")).toBeNull();
    });

    it("returns null for whitespace", () => {
      expect(parseDate("   ")).toBeNull();
    });

    it("returns null for format mismatch", () => {
      expect(parseDate("2024-01-15", "MM/dd/yyyy")).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles whitespace around date", () => {
      expect(parseDate("  2024-01-15  ", "yyyy-MM-dd")).toEqual(
        Temporal.PlainDate.from("2024-01-15")
      );
    });
  });
});

// ============================================================================
// detectSeparator tests
// ============================================================================

describe("detectSeparator", () => {
  const testCases = [
    { input: "a,b,c\n1,2,3", expected: "," },
    { input: "a;b;c\n1;2;3", expected: ";" },
    { input: "a\tb\tc\n1\t2\t3", expected: "\t" },
    { input: "a|b|c\n1|2|3", expected: "|" },
    { input: "a,b;c\n1,2;3", expected: "," }, // More commas wins
    { input: "abc\n123", expected: "," }, // Default fallback
  ];

  for (const tc of testCases) {
    it(`detects "${tc.expected === "\t" ? "TAB" : tc.expected}" separator`, () => {
      expect(detectSeparator(tc.input)).toBe(tc.expected);
    });
  }
});

// ============================================================================
// detectHeaders tests
// ============================================================================

describe("detectHeaders", () => {
  it("detects headers with header keywords", () => {
    expect(detectHeaders("Date,Description,Amount\n2024-01-15,Coffee,-5.00")).toBe(true);
  });

  it("detects headers when first row is text only", () => {
    expect(detectHeaders("Name,Category,Type\n123,Food,A")).toBe(true);
  });

  it("detects no headers when first row has numbers", () => {
    expect(detectHeaders("123,456,789\n111,222,333")).toBe(false);
  });

  it("returns true for single row (ambiguous)", () => {
    expect(detectHeaders("a,b,c")).toBe(true);
  });
});
