import { sb, requireUser } from "./supabase.js"

const user = await requireUser()

/* ======================
   STATE
====================== */
let questions = []
let currentIndex = 0
let locked = false
let score = 0

/* ======================
   DOM
====================== */
const wordEl = document.getElementById("word")
const questionTypeEl = document.getElementById("questionType")
const answersEl = document.getElementById("answers")
const progressEl = document.getElementById("progress")

/* ======================
   LOAD DATA
====================== */
async function loadExam() {
  // lấy toàn bộ từ đã học
  const { data: learned, error } = await sb
    .from("user_vocab")
    .select(`
      point,
      vocab:vocab_id (
        id,
        word,
        meaning,
        paraphrase
      )
    `)
    .eq("user_id", user.id)
    .gt("point", 0)

  if (error || !learned || learned.length === 0) {
    alert("Chưa có từ nào để kiểm tra")
    location.href = "dashboard.html"
    return
  }

  shuffle(learned)

  questions = learned.slice(0, Math.min(20, learned.length))
  render()
}

/* ======================
   RENDER QUESTION
====================== */
function render() {
  locked = false
  answersEl.innerHTML = ""

  const q = questions[currentIndex]
  const vocab = q.vocab

  wordEl.textContent = vocab.word
  progressEl.textContent = `${currentIndex + 1} / ${questions.length}`

  const askMeaning = Math.random() < 0.5
  const correct = askMeaning ? vocab.meaning : vocab.paraphrase

  questionTypeEl.textContent = askMeaning
    ? "Choose the correct meaning"
    : "Choose the correct paraphrase"

  const options = buildOptions(correct, askMeaning)
  shuffle(options)

  options.forEach(text => {
    const div = document.createElement("div")
    div.className = "answer"
    div.textContent = text

    div.onclick = () => handleAnswer(div, text === correct)
    answersEl.appendChild(div)
  })
}

/* ======================
   ANSWER HANDLER
====================== */
function handleAnswer(el, isCorrect) {
  if (locked) return
  locked = true

  const all = document.querySelectorAll(".answer")

  all.forEach(a => {
    if (a.textContent === el.textContent) {
      a.classList.add(isCorrect ? "correct" : "wrong")
    }
  })

  if (isCorrect) score++

  setTimeout(nextQuestion, 900)
}

/* ======================
   NEXT
====================== */
function nextQuestion() {
  currentIndex++

  if (currentIndex >= questions.length) {
    finishExam()
    return
  }

  render()
}

/* ======================
   FINISH
====================== */
function finishExam() {
  alert(`Hoàn thành!\nĐiểm: ${score} / ${questions.length}`)
  location.href = "dashboard.html"
}

/* ======================
   HELPERS
====================== */
function buildOptions(correct, askMeaning) {
  const pool = questions
    .map(q => askMeaning ? q.vocab.meaning : q.vocab.paraphrase)
    .filter(t => t && t !== correct)

  shuffle(pool)

  return [correct, ...pool.slice(0, 3)]
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

/* ======================
   START
====================== */
loadExam()
