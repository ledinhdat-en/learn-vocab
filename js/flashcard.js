import { sb, requireUser } from "./supabase.js"

const user = await requireUser()
const today = new Date().toISOString().slice(0, 10)

/* ======================
   SESSION / TIME STATE
====================== */
let studyStart = null
let accumulated = 0
let statsInitialized = false

/* ======================
   FLASHCARD STATE
====================== */
let queue = []
let current = null

/* ======================
   DOM
====================== */
const card = document.getElementById("card")
const wordEl = document.getElementById("word")
const meaningEl = document.getElementById("meaning")
const paraphraseEl = document.getElementById("paraphrase")
const exampleEl = document.getElementById("example")

const correctBtn = document.getElementById("correct")
const wrongBtn = document.getElementById("wrong")

/* ======================
   USER PROFILE
====================== */
let profile = null

async function loadProfile() {
  const { data, error } = await sb
    .from("app_users")
    .select("streak, total_study_seconds, last_active_date")
    .eq("id", user.id)
    .single()

  if (error) throw error
  profile = data
}

/* ======================
   STUDY TIME CORE
====================== */
function startStudy() {
  if (studyStart === null) {
    studyStart = Date.now()
  }
}

async function stopStudy() {
  if (studyStart !== null) {
    const now = Date.now()
    accumulated += Math.floor((now - studyStart) / 1000)
    studyStart = null
    await flushStudyTime()
  }
}

async function flushStudyTime() {
  if (accumulated <= 0) return

  profile.total_study_seconds =
    (profile.total_study_seconds || 0) + accumulated

  accumulated = 0

  await sb.from("app_users").update({
    total_study_seconds: profile.total_study_seconds,
    last_active_date: today
  }).eq("id", user.id)
}

/* ======================
   STREAK INIT (1 lần / session)
====================== */
async function initStreakIfNeeded() {
  if (statsInitialized) return
  statsInitialized = true

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const ymdYesterday = yesterday.toISOString().slice(0, 10)

  let newStreak = profile.streak || 0

  if (profile.last_active_date === today) {
    // giữ nguyên
  } else if (profile.last_active_date === ymdYesterday) {
    newStreak += 1
  } else {
    newStreak = 1
  }

  profile.streak = newStreak
  profile.last_active_date = today

  await sb.from("app_users").update({
    streak: newStreak,
    last_active_date: today
  }).eq("id", user.id)
}

/* ======================
   LOAD QUEUE
====================== */
const DAILY_NEW_LIMIT = 50

async function loadQueue() {
  /* ======================
     1. ĐẾM SỐ TỪ ĐÃ HỌC HÔM NAY
  ====================== */
  const { count, error: countError } = await sb
    .from("user_vocab")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("last_review", today)
    .lte("last_review", today)

  if (countError) throw countError

  const learnedCountToday = count || 0
  const remaining = DAILY_NEW_LIMIT - learnedCountToday

  if (remaining <= 0) {
    alert("Bạn đã học đủ 50 từ mới hôm nay 🎉")
    location.href = "dashboard.html"
    return
  }

  /* ======================
     2. LẤY DANH SÁCH TỪ ĐÃ HỌC (MỌI NGÀY)
  ====================== */
  const { data: learned, error: learnedError } = await sb
    .from("user_vocab")
    .select("vocab_id")
    .eq("user_id", user.id)

  if (learnedError) throw learnedError

  const learnedIds = learned?.map(v => v.vocab_id) || []

  /* ======================
     3. LOAD TỪ MỚI (LIMIT THEO NGÀY)
  ====================== */
  let query = sb
    .from("vocab")
    .select("*")
    .limit(remaining)

  if (learnedIds.length > 0) {
    query = query.not("id", "in", `(${learnedIds.join(",")})`)
  }

  const { data: vocab, error } = await query
  if (error) throw error

  if (!vocab || vocab.length === 0) {
    alert("Hết từ mới hôm nay 🎉")
    location.href = "dashboard.html"
    return
  }

  queue = vocab
}

/* ======================
   SHOW CARD
====================== */
function showNext() {
  current = queue.shift()

  if (!current) {
    stopStudy()
    alert("Hoàn thành 🎉")
    location.href = "dashboard.html"
    return
  }

  card.classList.remove("flipped")
  wordEl.textContent = current.word
  meaningEl.textContent = current.meaning
  paraphraseEl.textContent = current.paraphrase || ""
  exampleEl.textContent = current.example || ""
}

/* ======================
   CARD FLIP
====================== */
card.onclick = () => {
  card.classList.toggle("flipped")
}

/* ======================
   SRS
====================== */
function calcNextDays(point) {
  if (point <= 1) return 0
  if (point === 2) return 1
  return point * 2 - 3
}

/* ======================
   ANSWER
====================== */
async function answer(isCorrect) {
  await initStreakIfNeeded()

  const prevPoint = current.point ?? 0
  const point = isCorrect ? prevPoint + 1 : 0

  const days = calcNextDays(point)
  const next = new Date()
  next.setDate(next.getDate() + days)

  await sb.from("user_vocab").upsert({
    user_id: user.id,
    vocab_id: current.id,
    point,
    last_review: today,
    next_review: next.toISOString().slice(0, 10)
  })

  showNext()
}

correctBtn.onclick = () => answer(true)
wrongBtn.onclick = () => answer(false)

/* ======================
   VISIBILITY / FOCUS
====================== */
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") stopStudy()
  else startStudy()
})

window.addEventListener("blur", stopStudy)
window.addEventListener("focus", startStudy)
window.addEventListener("beforeunload", stopStudy)

/* ======================
   START
====================== */
await loadProfile()
await loadQueue()
showNext()
startStudy()
