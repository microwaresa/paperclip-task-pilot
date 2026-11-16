type AuthErr = { message: string; code?: string };

/** Arabic message for a failed sign-up, explaining the real reason. */
export function signUpErrorMessage(error: AuthErr): string {
  const msg = error.message.toLowerCase();
  if (error.code === "weak_password" || msg.includes("weak") || msg.includes("easy to guess"))
    return "كلمة المرور ضعيفة أو مسرّبة ومعروفة. اختر كلمة مرور أقوى تحتوي على حروف وأرقام ورموز.";
  if (error.code === "user_already_exists" || msg.includes("registered")) return "هذا البريد مسجل بالفعل";
  if (msg.includes("rate limit") || error.code === "over_email_send_rate_limit")
    return "محاولات كثيرة، انتظر قليلًا ثم حاول مرة أخرى";
  if (msg.includes("invalid") && msg.includes("email")) return "البريد الإلكتروني غير صحيح";
  return "تعذر إنشاء الحساب، تأكد من البيانات";
}
