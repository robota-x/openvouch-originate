import registry from "./registry.json" with { type: "json" };
import dbltLendingIdl from "./json/dblt_lending.json" with { type: "json" };
import genericRecordIdl from "./json/generic_record.json" with { type: "json" };

const IDLS: Record<string, unknown> = {
  dblt_lending: dbltLendingIdl,
  generic_record: genericRecordIdl,
};

/**
 * Registry of all programs discovered during build.
 */
export const Registry = {
  getIds(): Record<string, string> {
    return registry as Record<string, string>;
  },

  getProgramId(name: string): string | undefined {
    return this.getIds()[`${name.toLowerCase()}_program_id`];
  },

  getProgramNames(): string[] {
    return Object.keys(this.getIds())
      .filter((k) => k.endsWith("_program_id"))
      .map((k) => k.replace("_program_id", ""));
  },

  /**
   * Dynamically loads a JSON IDL by name.
   * Works in Node (via fs) and potentially in browsers if bundled correctly.
   */
  getIdl(name: string): any {
    const idl = IDLS[name.toLowerCase()];
    if (!idl) {
      throw new Error(`IDL for program "${name}" not found in bundled IDLs`);
    }
    return idl;
  },
};

// Legacy-friendly constants for common programs (optional, but keeps existing code working)
export const getDbltLendingIdl = () => Registry.getIdl("dblt_lending");
export const getGenericRecordIdl = () => Registry.getIdl("generic_record");
