vim.pack.add({
  { src = "https://github.com/rebelot/kanagawa.nvim", name = "kanagawa" },
  { src = "https://github.com/f-person/auto-dark-mode.nvim", name = "auto-dark-mode" },
})

require("kanagawa").setup({
  background = {
    dark = "wave",
    light = "lotus",
  },
})

require("auto-dark-mode").setup({
  fallback = "dark",
})
