local M = {}

M.Dap = {
  n = {
    ["<leader>dc"] = { "<cmd>lua require'dap'.continue()<cr>", "Continue", opts = { silent = true } },

    ["<leader>do"] = { "<cmd>lua require'dap'.step_over()<cr>", "Step Over", opts = { silent = true } },

    ["<leader>di"] = { "<cmd>lua require'dap'.step_into()<cr>", "Step Into", opts = { silent = true } },

    ["<leader>du"] = { "<cmd>lua require'dap'.step_out()<cr>", "Step Out", opts = { silent = true } },

    ["<leader>db"] = { "<cmd>lua require'dap'.toggle_breakpoint()<cr>", "Breakpoint", opts = { silent = true } },

    ["<leader>dB"] = {
      "<cmd>lua require'dap'.set_breakpoint(vim.fn.input('Breakpoint condition: '))<cr>",
      "Breakpoint Condition",
      opts = { silent = true },
    },

    ["<leader>dd"] = { "<cmd>lua require'dapui'.toggle()<cr>", "Dap UI", opts = { silent = true } },

    ["<leader>dl"] = { "<cmd>lua require'dap'.run_last()<cr>", "Run Last", opts = { silent = true } },
  },
}

M.Sessions = {
  n = {
    ["<leader>ss"] = { "<cmd>execute 'SessionStart' | execute 'SessionSave'<cr>", "Save", opts = { silent = true } },
    ["<leader>so"] = { "<cmd>SessionStop<cr>", "Stop", opts = { silent = true } },
    ["<leader>st"] = { "<cmd>SessionToggle<cr>", "Toggle", opts = { silent = true } },
    ["<leader>sl"] = { "<cmd>SessionLoad<cr>", "Load", opts = { silent = true } },
    ["<leader>sd"] = { "<cmd>SessionDelete<cr>", "Delete", opts = { silent = true } },
  },
}

-- Keymaps for Git-related Commands
M.git = {
  n = {
    ["<leader>gg"] = { "<cmd>LazyGitCurrentFile<CR>", "Lazygit", opts = { nowait = true } },
    ["<leader>gO"] = { "<cmd>GitBlameOpenCommitURL<cr>", "Open Commit Url", opts = { silent = true } },
    ["<leader>gc"] = { "<cmd>GitBlameCopyCommitURL<cr>", "Copy Commit Url", opts = { silent = true } },
    ["<leader>gf"] = { "<cmd>GitBlameOpenFileURL<cr>", "Open File Url", opts = { silent = true } },
    ["<leader>gC"] = { "<cmd>GitBlameCopyFileURL<cr>", "Copy File Url", opts = { silent = true } },
    ["<leader>gs"] = { "<cmd>GitBlameCopySHA<cr>", "Copy SHA", opts = { silent = true } },
    -- ["<leader>gt"] = { "", "Git Branches", opts = { silent = true } },

    ["<leader>gtb"] = { "<cmd>Telescope git_branches<cr>", " Branches", opts = { silent = true } },
    ["<leader>gtc"] = { "<cmd>Telescope git_commits<cr>", "󰜜 Commits", opts = { silent = true } },
    ["<leader>gB"] = {
      function()
        if vim.g.gitblame_enabled ~= true then
          vim.cmd "GitBlameEnable"
          vim.g.gitblame_enabled = true
        else
          vim.cmd "GitBlameDisable"
          vim.g.gitblame_enabled = false
        end
      end,
      "Toggle Blame",
      opts = { silent = true },
    },
  },
}

M.lsp = {
  n = {
    ["<leader>lr"] = { "<cmd>lua vim.lsp.buf.references()<cr>", "Get LSP References", opts = { silent = true } },
  }
}

M.toggle = {
  n = {
    ["<leader>ol"] = {
      function()
        if vim.o.number then
          vim.o.number = false
        else
          vim.o.number = true
        end
      end,
      "Toggle Line Number",
      opts = { silent = true },
    },
    ["<leader>or"] = {
      function()
        if vim.o.relativenumber then
          vim.o.relativenumber = false
        else
          vim.o.relativenumber = true
        end
      end,
      "Toggle Relative Number",
      opts = { silent = true },
    },
    ["<leader>ot"] = {
      function()
        require("base46").toggle_theme()
      end,
      "Toggle Theme",
      opts = { silent = true },
    },
    ["<leader>os"] = {
      function()
        require("base46").toggle_transparency()
      end,
      "Toggle Transparency",
      opts = { silent = true },
    },
    ["<leader>ow"] = {
      function()
        if vim.o.wrap then
          vim.o.wrap = false
        else
          vim.o.wrap = true
        end
      end,
      "Toggle Wrap",
      opts = { silent = true },
    },
  }
}

-- Misc commands
M.misc = {
  n = {
    ["<leader>R"] = { "<cmd>%d+<cr>", "Remove All Text", opts = { silent = true } },
    ["<leader>y"] = { "<cmd>%y+<cr>", "Yank All Text", opts = { silent = true } },
    ["<leader>q"] = { "<cmd>qa!<cr>", "Quit", opts = { silent = true } },
  },
  i = {
    ["jk"] = { "<ESC>", "Escape insert mode", opts = { nowait = true } },
  }
}

return M
