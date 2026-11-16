import { describe, it, expect } from "vitest";
import { signUpErrorMessage } from "./auth-errors";

describe("signUpErrorMessage", () => {
  it("explains a rejected weak password", () => {
    expect(signUpErrorMessage({ code: "weak_password", message: "Password is known to be weak and easy to guess, please choose a different one." })).toContain("كلمة المرور ضعيفة");
  });
  it("flags an already-registered email", () => {
    expect(signUpErrorMessage({ message: "User already registered" })).toBe("هذا البريد مسجل بالفعل");
  });
});
