vim.pack.add({
    {
        src = "https://github.com/nvim-neotest/nvim-nio",
    }
})

vim.pack.add({
    {
        src = "https://github.com/rcarriga/nvim-dap-ui",
    }
})

local dapui = require("dapui")
dapui.setup({
    force_buffers = true, -- Force buffers to stay in correct positions
    layouts = {
        {
            elements = {
                { id = "scopes",      size = 0.25 },
                { id = "breakpoints", size = 0.25 },
                { id = "watches",     size = 0.25 },
            },
            size = 40,
            position = "left",
        },
        {
            elements = {
                "repl",
            },
            size = 0.25,
            position = "bottom",
        },
    },
})
