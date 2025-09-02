vim.pack.add({
    {
        src = "https://github.com/igorlfs/nvim-dap-view",
    }
})

require('dap-view').setup({
    winbar = {
        controls = {
            enabled = true,
            position = "right",
            buttons = {
                "play",
                "step_into",
                "step_over",
                "step_out",
                "step_back",
                "run_last",
                "terminate",
                "disconnect",
            },
            custom_buttons = {},
        },
    }
})

local keymap = vim.keymap.set

-- Toggle UI
keymap("n", "<leader>ddd", "<cmd>DapViewToggle<CR>", { desc = "DAP UI: Toggle", silent = true })

keymap("n", "<leader>ddb", "<cmd>DapViewOpen<CR><cmd>DapViewJump breakpoints<CR>", { desc = "DAP UI: Toggle", silent = true })
keymap("n", "<leader>ddt", "<cmd>DapViewOpen<CR><cmd>DapViewJump threads<CR>", { desc = "DAP UI: Toggle", silent = true })
keymap("n", "<leader>dds", "<cmd>DapViewOpen<CR><cmd>DapViewJump scopes<CR>", { desc = "DAP UI: Toggle", silent = true })
