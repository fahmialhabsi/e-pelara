import { describe, it, expect } from "vitest";
import {
  mapBackendErrorsToFormik,
  pickBackendErrorMessage,
} from "./mapBackendErrorsToFormik";

describe("mapBackendErrorsToFormik", () => {
  it("memetakan errors object ke record string per field", () => {
    const e = mapBackendErrorsToFormik({
      errors: { satuan: ["Wajib"], nama: "satu pesan" },
    });
    expect(e.satuan).toBe("Wajib");
    expect(e.nama).toBe("satu pesan");
  });

  it("mengembalikan objek kosong jika tidak ada errors", () => {
    expect(mapBackendErrorsToFormik({ message: "x" })).toEqual({});
    expect(mapBackendErrorsToFormik(null)).toEqual({});
  });
});

describe("pickBackendErrorMessage", () => {
  it("mengambil message string jika ada", () => {
    expect(pickBackendErrorMessage({ message: "Gagal simpan" })).toBe(
      "Gagal simpan"
    );
  });

  it("mengambil elemen pertama dari errors array", () => {
    expect(
      pickBackendErrorMessage({ errors: { x: ["Pertama", "Kedua"] } })
    ).toBe("Pertama");
  });

  it("fallback jika tidak ada isi", () => {
    expect(pickBackendErrorMessage({}, "Default")).toBe("Default");
  });
});
