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

local wk = require("which-key")
wk.add({
  { "<leader>dd", group = "dap view", icon = { icon = "󰃤", color = "red" } },
  { "<leader>ddd", "<cmd>DapViewToggle<CR>", desc = "Toggle UI", icon = { icon = "󰃤", color = "red" } },
  { "<leader>ddb", "<cmd>DapViewOpen<CR><cmd>DapViewJump breakpoints<CR>", desc = "Breakpoints", icon = { icon = "󰃤", color = "red" } },
  { "<leader>ddt", "<cmd>DapViewOpen<CR><cmd>DapViewJump threads<CR>", desc = "Threads", icon = { icon = "󰃤", color = "red" } },
  { "<leader>dds", "<cmd>DapViewOpen<CR><cmd>DapViewJump scopes<CR>", desc = "Scopes", icon = { icon = "󰃤", color = "red" } },
})
