vim.pack.add({
    { src = "https://github.com/echasnovski/mini.move" },
})

require('mini.move').setup({
    -- Module mappings. Use '' (empty string) to disable one.
    mappings = {
        -- Move visual selection in Visual mode
        left = '<S-Left>',
        right = '<S-Right>',
        down = '<S-Down>',
        up = '<S-Up>',

        -- Move current line in Normal mode
        line_left = '<S-Left>',
        line_right = '<S-Right>',
        line_down = '<S-Down>',
        line_up = '<S-Up>',
    },

    -- Options which control moving behavior
    options = {
        -- Automatically reindent selection during linewise vertical move
        reindent_linewise = true,
    },
})
