vim.pack.add({
    { src = "https://github.com/folke/snacks.nvim" },
})

local wk = require("which-key")
wk.add({
    -- Find group
    { "<leader>f",  group = "find" },
    { "<leader>ff", function() require("snacks").picker.smart() end,        desc = "Files" },
    { "<leader>fb", function() require("snacks").picker.buffers() end,      desc = "Buffers" },
    { "<leader>fw", function() require("snacks").picker.grep() end,         desc = "Words in buffer" },
    { "<leader>fW", function() require("snacks").picker.grep_buffers() end, desc = "Words in buffers" },
    { "<leader>fl", function() require("snacks").picker.lines() end,        desc = "Lines in buffer" },
    { "<leader>fs", function() require("snacks").picker.grep_word() end,    desc = "Selected word" },
    { "<leader>fc", function() require("snacks").picker.commands() end, desc = "Commands" },
    { "<leader>f-", function() require("snacks").explorer() end,            desc = "Explorer" },

    -- Git group
    { "<leader>g",  group = "git" },
    { "<leader>gg", function() require("snacks").lazygit.open() end,        desc = "Lazygit" },

    -- General picker
    { "<leader>,",  function() require("snacks").picker() end,              desc = "Picker" },
})
