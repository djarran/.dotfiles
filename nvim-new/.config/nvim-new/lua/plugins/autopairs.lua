vim.pack.add({
    {
        src = "https://github.com/windwp/nvim-autopairs",
    }
})

local npairs = require("nvim-autopairs")
local Rule = require('nvim-autopairs.rule')

npairs.setup({
    check_ts = true,  -- Enable treesitter integration for smarter pairing
})

-- Add angle bracket pairing rule
npairs.add_rules({
    Rule("<", ">")
})
