vim.pack.add({
    { src = "https://github.com/folke/snacks.nvim" },
})

-- local Snacks = require("snacks")
-- local picker = require("snacks.picker")
-- vim.keymap.set("n", "<Leader>fb", function() picker.files({ cwd = vim.fn.stdpath("config") }) end)
vim.keymap.set("n", "<leader>,", function() require("snacks").picker() end)
vim.keymap.set("n", "<leader>ff", function() require("snacks").picker.smart() end, {desc = "Penis"})
vim.keymap.set("n", "<leader>fb", function() require("snacks").picker.buffers() end)
vim.keymap.set("n", "<leader>fw", function() require("snacks").picker.grep() end)
vim.keymap.set("n", "<leader>fW", function() require("snacks").picker.grep_buffers() end)
vim.keymap.set("n", "<leader>fl", function() require("snacks").picker.lines() end)
vim.keymap.set("n", "<leader>fs", function() require("snacks").picker.grep_word() end)

-- brew install fd
vim.keymap.set("n", "<leader>f-", function() require("snacks").explorer() end)
-- TODO: Add keymap for finding current buffer in list.

-- https://github.com/dandavison/delta
-- https://github.com/jesseduffield/lazygit/blob/master/docs/Custom_Pagers.md
vim.keymap.set("n", "<leader>gg", function() require("snacks").lazygit.open() end)
