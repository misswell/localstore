const copyButtons = document.querySelectorAll("[data-copy-target]");
const toast = document.querySelector(".copy-toast");
let toastTimer;

for (const button of copyButtons) {
  button.addEventListener("click", async () => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;

    try {
      await navigator.clipboard.writeText(target.textContent);
      showToast("代码已复制");
    } catch {
      showToast("请手动选择代码");
    }
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2200);
}
