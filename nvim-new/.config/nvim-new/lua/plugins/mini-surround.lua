vim.pack.add({
    { src = "https://github.com/echasnovski/mini.surround" },
})

require('mini.surround').setup({
    -- Custom mappings with 'gs' prefix to avoid conflict with flash.nvim
    mappings = {
        add = 'gsa',            -- Add surrounding in Normal and Visual modes
        delete = 'gsd',         -- Delete surrounding
        find = 'gsf',           -- Find surrounding (to the right)
        find_left = 'gsF',      -- Find surrounding (to the left)
        highlight = 'gsh',      -- Highlight surrounding
        replace = 'gsr',        -- Replace surrounding
        
        suffix_last = 'l',      -- Suffix to search with "prev" method
        suffix_next = 'n',      -- Suffix to search with "next" method
    },
    
    -- Number of lines within which surrounding is searched
    n_lines = 20,
    
    -- Duration (in ms) of highlight when calling highlight action
    highlight_duration = 500,
    
    -- Whether to respect selection type
    respect_selection_type = false,
    
    -- How to search for surrounding
    search_method = 'cover',
})
