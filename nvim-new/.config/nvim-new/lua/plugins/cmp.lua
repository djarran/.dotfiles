vim.pack.add({
    { src = "https://github.com/hrsh7th/nvim-cmp" },
})

-- Minimal nvim-cmp setup for 99 plugin compatibility
-- blink.cmp is still your main completion engine
require('cmp').setup({
    enabled = false,  -- Disabled by default, 99 will use it internally
    sources = {},
})
