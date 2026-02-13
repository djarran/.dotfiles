vim.pack.add({
    { src = "https://github.com/MagicDuck/grug-far.nvim" },
})

require('grug-far').setup({
    -- options can be added here if needed
})

local wk = require("which-key")
wk.add({
    { "<leader>s", group = "search" },
    { "<leader>sr", function() require('grug-far').open() end, desc = "Search and Replace" },
    { "<leader>sw", function() require('grug-far').open({ prefills = { search = vim.fn.expand("<cword>") } }) end, desc = "Search word under cursor" },
    { "<leader>sf", function() require('grug-far').open({ prefills = { paths = vim.fn.expand("%") } }) end, desc = "Search in current file" },
    { "<leader>sr", function() require('grug-far').with_visual_selection() end, desc = "Search visual selection", mode = "v" },
})
