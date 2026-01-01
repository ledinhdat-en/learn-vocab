import { sb } from "./supabase.js"

// ===== DOM =====
const usernameInput = document.getElementById("username")
const passwordInput = document.getElementById("password")
const msg = document.getElementById("msg")
const loginBtn = document.getElementById("loginBtn")

// ===== UTIL =====
const toEmail = (username) => `${username}@flashcard.local`

// ===== MAIN =====
loginBtn.onclick = async () => {
  msg.textContent = ""

  const username = usernameInput.value.trim()
  const password = passwordInput.value

  if (!username || !password) {
    msg.textContent = "Thiếu username hoặc password"
    return
  }

  const email = toEmail(username)

  /* ======================
     1️⃣ TRY LOGIN
  ====================== */
  const { data: loginData, error: loginErr } =
    await sb.auth.signInWithPassword({ email, password })

  if (!loginErr) {
    location.href = "dashboard.html"
    return
  }

  /* ======================
     2️⃣ IF NOT EXISTS → REGISTER
  ====================== */
  if (loginErr.message.includes("Invalid login credentials")) {
    const { data: signUpData, error: signUpErr } =
      await sb.auth.signUp({ email, password })

    if (signUpErr) {
      msg.textContent = signUpErr.message
      return
    }

    const userId = signUpData.user.id

    // ⚠️ tạo profile app_users (đúng schema mới)
    const { error: profileErr } = await sb
      .from("app_users")
      .insert({
        id: userId,
        username,
        streak: 0,
        total_study_seconds: 0,
        last_active_date: null
      })

    if (profileErr) {
      msg.textContent = "Tạo hồ sơ thất bại"
      return
    }

    location.href = "dashboard.html"
    return
  }

  /* ======================
     3️⃣ OTHER ERRORS
  ====================== */
  msg.textContent = loginErr.message
}
