local M = {}

-- Keymaps for Git-related Commands
M.git = {
  n = {
    ["<leader>gg"] = { "<cmd>LazyGitCurrentFile<CR>", "Lazygit", opts = { nowait = true } },
    ["<leader>gO"] = { "<cmd>GitBlameOpenCommitURL<cr>", "Open Commit Url", opts = { silent = true } },
    ["<leader>gc"] = { "<cmd>GitBlameCopyCommitURL<cr>", "Copy Commit Url", opts = { silent = true } },
    ["<leader>gf"] = { "<cmd>GitBlameOpenFileURL<cr>", "Open File Url", opts = { silent = true } },
    ["<leader>gC"] = { "<cmd>GitBlameCopyFileURL<cr>", "Copy File Url", opts = { silent = true } },
    ["<leader>gs"] = { "<cmd>GitBlameCopySHA<cr>", "Copy SHA", opts = { silent = true } },
    ["<leader>gt"] = { "", "Git Branches", opts = { silent = true } },
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
