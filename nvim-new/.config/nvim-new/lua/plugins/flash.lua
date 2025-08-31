vim.pack.add({
    { src = "https://github.com/folke/flash.nvim" },
})

vim.keymap.set("n", "s", function() require("flash").jump() end)
vim.keymap.set("n", "S", function() require("flash").treesitter() end)
vim.keymap.set("o", "r", function() require("flash").remote() end)
vim.keymap.set({ "o", "x" }, "R", function() require("flash").treesitter_search() end)
vim.keymap.set("c", "<c-s>", function() require("flash").toggle() end)