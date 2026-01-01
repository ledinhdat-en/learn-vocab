import { sb, requireUser } from "./supabase.js"

// ======================
// USER
// ======================
const user = await requireUser()
const today = new Date().toISOString().slice(0, 10)

// ======================
// STUDY / TIME STATE
// ======================
let studyStart = null
let accumulated = 0
let statsInitialized = false
let profile = null

// ======================
// QUEUE STATE
// ======================
let queue = []
let current = null

// ======================
// DOM
// ======================
const $ = (id) => document.getElementById(id)

const card = $("card")
const wordEl = $("word")
const meaningEl = $("meaning")
const paraphraseEl = $("paraphrase")
const exampleEl = $("example")
const wordTypeEl = $("word_type")
const topicEl = $("topic")

const correctBtn = $("correct")
const wrongBtn = $("wrong")
const backBtn = $("backDashboard")

// ======================
// NAVIGATION
// ======================
if (backBtn) backBtn.onclick = () => location.href = "dashboard.html"

// ======================
// LOAD PROFILE
// ======================
async function loadProfile() {
  const { data, error } = await sb
    .from("app_users")
    .select("streak, total_study_seconds, last_active_date")
    .eq("id", user.id)
    .single()

  if (error) throw error
  profile = data
}

// ======================
// STUDY TIME CORE
// ======================
function startStudy() {
  if (studyStart === null) studyStart = Date.now()
}

async function stopStudy() {
  if (studyStart !== null) {
    accumulated += Math.floor((Date.now() - studyStart) / 1000)
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

// ======================
// STREAK INIT
// ======================
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

// ======================
// LOAD REVIEW QUEUE
// ======================
async function loadReview() {
  const { data, error } = await sb
    .from("user_vocab")
    .select(`
      point,
      vocab:vocab_id (
        id,
        word,
        meaning,
        paraphrase,
        example,
        word_type,
        topic
      )
    `)
    .eq("user_id", user.id)
    .lte("next_review", today)
    .order("next_review", { ascending: true })

  if (error) {
    console.error(error)
    alert("Lỗi tải dữ liệu")
    return
  }

  if (!data || data.length === 0) {
    alert("Không có từ cần ôn hôm nay 🎉")
    location.href = "dashboard.html"
    return
  }

  queue = data.map(row => ({
    ...row.vocab,
    point: row.point ?? 0
  }))
}

// ======================
// SHOW NEXT CARD
// ======================
function showNext() {
  current = queue.shift()

  if (!current) {
    stopStudy()
    alert("Review xong rồi 👏")
    location.href = "dashboard.html"
    return
  }

  card.classList.remove("flipped")
  wordEl.textContent = current.word
  meaningEl.textContent = current.meaning
  paraphraseEl.textContent = current.paraphrase || ""
  exampleEl.textContent = current.example || ""
  wordTypeEl.textContent = current.word_type || ""
  topicEl.textContent = current.topic || ""
}

// ======================
// CARD FLIP
// ======================
card.onclick = () => card.classList.toggle("flipped")

// ======================
// SRS CALC
// ======================
function calcNextDays(point) {
  if (point <= 1) return 0
  if (point === 2) return 1
  return point * 2 - 3
}

// ======================
// ANSWER HANDLER
// ======================
async function answer(isCorrect) {
  await initStreakIfNeeded()

  const prevPoint = current.point ?? 0
  const point = isCorrect ? prevPoint + 1 : 0

  const days = calcNextDays(point)
  const next = new Date()
  next.setDate(next.getDate() + days)

  await sb
    .from("user_vocab")
    .update({
      point,
      last_review: today,
      next_review: next.toISOString().slice(0, 10)
    })
    .eq("user_id", user.id)
    .eq("vocab_id", current.id)

  showNext()
}

correctBtn.onclick = () => answer(true)
wrongBtn.onclick = () => answer(false)

// ======================
// VISIBILITY / FOCUS
// ======================
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") stopStudy()
  else startStudy()
})

window.addEventListener("blur", stopStudy)
window.addEventListener("focus", startStudy)
window.addEventListener("beforeunload", stopStudy)

// ======================
// START
// ======================
await loadProfile()
await loadReview()
showNext()
startStudy()
