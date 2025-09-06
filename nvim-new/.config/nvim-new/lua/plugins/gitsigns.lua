vim.pack.add({
    { src = "https://github.com/lewis6991/gitsigns.nvim" },
})

require('gitsigns').setup({ signcolumn = true })

local wk = require("which-key")
wk.add({
  { "<leader>g", group = "git" },
  { "<leader>gb", "<cmd>Gitsigns blame_line<CR>", desc = "Blame line" },
  { "<leader>gB", "<cmd>Gitsigns toggle_current_line_blame<CR>", desc = "Toggle line blame" },
})
