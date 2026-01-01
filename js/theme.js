const root = document.documentElement
const saved = localStorage.getItem("theme")

if (saved === "light") {
  root.classList.add("light")
}

document.getElementById("themeToggle")?.addEventListener("click", () => {
  root.classList.toggle("light")
  localStorage.setItem(
    "theme",
    root.classList.contains("light") ? "light" : "dark"
  )
})
