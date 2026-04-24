import { describe, expect, it } from "vitest";
import {
  complianceStatusLabel,
  complianceStatusVariant,
} from "./planningAuditDashboard.utils";

describe("planningAuditDashboard.utils", () => {
  it("maps status to readable labels", () => {
    expect(complianceStatusLabel("success")).toBe("Berhasil (mutasi)");
    expect(complianceStatusLabel("rejected")).toBe("Ditolak");
    expect(complianceStatusLabel("preview")).toBe("Pratinjau");
  });

  it("maps status to bootstrap badge variants", () => {
    expect(complianceStatusVariant("success")).toBe("success");
    expect(complianceStatusVariant("failure")).toBe("danger");
    expect(complianceStatusVariant("rejected")).toBe("warning");
    expect(complianceStatusVariant("preview")).toBe("info");
  });
});
