import { sb, requireUser } from "./supabase.js"

const user = await requireUser()

/* ======================
   ELEMENTS (SAFE)
====================== */
const $ = (id) => document.getElementById(id)

const learnNewBtn = $("learnNew")
const reviewOldBtn = $("reviewOld")
const examBtn = $("exam")
const addVocabBtn = $("addVocab")
const logoutBtn = $("logoutBtn")

const streakEl = $("streak")
const learnedEl = $("learnedCount")
const dueTodayEl = $("dueToday")
const totalTimeEl = $("totalTime")
const avgTimeEl = $("avgTime")

/* ======================
   NAVIGATION
====================== */
learnNewBtn && (learnNewBtn.onclick = () => location.href = "flashcard.html")
reviewOldBtn && (reviewOldBtn.onclick = () => location.href = "review.html")
examBtn && (examBtn.onclick = () => location.href = "exam.html")
addVocabBtn && (addVocabBtn.onclick = () => location.href = "add.html")

logoutBtn && (logoutBtn.onclick = async () => {
  await sb.auth.signOut()
  location.href = "index.html"
})

/* ======================
   LOAD DATA
====================== */
const today = new Date().toISOString().slice(0, 10)

/* ---------- USER STATS ---------- */
const { data: profile } = await sb
  .from("app_users")
  .select("streak, total_study_seconds, last_active_date")
  .eq("id", user.id)
  .single()

/* ---------- USER VOCAB ---------- */
const { data: vocab = [] } = await sb
  .from("user_vocab")
  .select("point, last_review, next_review")
  .eq("user_id", user.id)

/* ======================
   SUMMARY METRICS
====================== */

/* 🔥 STREAK */
const streak = Math.max(profile?.streak || 1, 1)
streakEl && (streakEl.textContent = `${streak} ngày`)

/* 📘 ĐÃ HỌC */
const learnedCount = vocab.filter(v => v.point > 0).length
learnedEl && (learnedEl.textContent = `${learnedCount} từ`)

/* 🔁 CẦN ÔN HÔM NAY */
const dueToday = vocab.filter(v =>
  v.next_review && v.next_review <= today
).length
dueTodayEl && (dueTodayEl.textContent = `${dueToday} từ`)

/* ⏳ TỔNG PHÚT HỌC */
const totalSeconds = profile?.total_study_seconds || 0
const totalMinutes = Math.round(totalSeconds / 60)
totalTimeEl && (totalTimeEl.textContent = `${totalMinutes} phút`)

/* ⏱️ TRUNG BÌNH / NGÀY */
const activeDays = Math.max(streak, 1)
const avgMinutes = Math.round(totalSeconds / 60 / activeDays)
avgTimeEl && (avgTimeEl.textContent = `${avgMinutes} phút`)

/* ======================
   CHART: WORDS PER DAY
====================== */
const countByDate = {}

vocab.forEach(v => {
  if (!v.last_review) return
  countByDate[v.last_review] = (countByDate[v.last_review] || 0) + 1
})

const labels = Object.keys(countByDate).sort()
const values = labels.map(d => countByDate[d])

if (labels.length && $("dailyChart")) {
  new Chart($("dailyChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Số từ đã học",
        data: values
      }]
    }
  })
}

/* ======================
   CHART: POINT DISTRIBUTION
====================== */
const buckets = {
  "0–2": 0,
  "3–6": 0,
  "7–10": 0,
  "11–15": 0,
  "16–20": 0,
  "≥21": 0
}

vocab.forEach(v => {
  const p = v.point || 0

  if (p >= 21) buckets["≥21"]++
  else if (p >= 16) buckets["16–20"]++
  else if (p >= 11) buckets["11–15"]++
  else if (p >= 7) buckets["7–10"]++
  else if (p >= 3) buckets["3–6"]++
  else buckets["0–2"]++
})

if ($("pointChart")) {
  new Chart($("pointChart"), {
    type: "doughnut",
    data: {
      labels: Object.keys(buckets),
      datasets: [{
        data: Object.values(buckets)
      }]
    }
  })
}
