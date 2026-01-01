import { sb } from "./supabase.js"

document.getElementById("add").onclick = async () => {
  await sb.from("vocab").insert({
    word: document.getElementById("word").value,
    meaning: document.getElementById("meaning").value,
    paraphrase: document.getElementById("para").value,
    example: document.getElementById("ex").value,
    word_type: document.getElementById("word_type").value,
    topic: document.getElementById("topic").value
  })

  alert("Added")
}
