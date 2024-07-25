require "nvchad.mappings"

-- add yours here

local map = vim.keymap.set

map("n", ";", ":", { desc = "CMD enter command mode" })
map("i", "jk", "<ESC>")

map("n", "<leader>-", "<cmd>Oil --float<cr>", {desc = "Wow", silent = true})

-- Sessions
map("n", "<leader>ss", "<cmd>execute 'SessionStart' | execute 'SessionSave'<cr>", { desc = "Save Session", silent = true })
map("n", "<leader>so", "<cmd>SessionStop<cr>", { desc = "Stop Session", silent = true })
map("n", "<leader>st", "<cmd>SessionToggle<cr>", { desc = "Toggle Session", silent = true })
map("n", "<leader>sl", "<cmd>SessionLoad<cr>", { desc = "Load Session", silent = true })
map("n", "<leader>sd", "<cmd>SessionDelete<cr>", { desc = "Delete Session", silent = true })
map("n", "<leader>fs", "<cmd>Telescope persisted<cr>", { desc = "Find Sessions", silent = true })

-- Git-related Commands
map("n", "<leader>gg", "<cmd>LazyGitCurrentFile<CR>", { desc = "Lazygit", nowait = true })
map("n", "<leader>gO", "<cmd>GitBlameOpenCommitURL<cr>", { desc = "Open Commit URL", silent = true })
map("n", "<leader>gc", "<cmd>GitBlameCopyCommitURL<cr>", { desc = "Copy Commit URL", silent = true })
map("n", "<leader>gf", "<cmd>GitBlameOpenFileURL<cr>", { desc = "Open File URL", silent = true })
map("n", "<leader>gC", "<cmd>GitBlameCopyFileURL<cr>", { desc = "Copy File URL", silent = true })
map("n", "<leader>gs", "<cmd>GitBlameCopySHA<cr>", { desc = "Copy SHA", silent = true })
map("n", "<leader>gtb", "<cmd>Telescope git_branches<cr>", { desc = " Branches", silent = true })
map("n", "<leader>gtc", "<cmd>Telescope git_commits<cr>", { desc = "󰜜 Commits", silent = true })
map("n", "<leader>gB", function()
  if vim.g.gitblame_enabled ~= true then
    vim.cmd "GitBlameEnable"
    vim.g.gitblame_enabled = true
  else
    vim.cmd "GitBlameDisable"
    vim.g.gitblame_enabled = false
  end
end, { desc = "Toggle Blame", silent = true })

-- Harpoon
map("n", "<leader>ha", function()
  require("harpoon"):list():append()
  vim.notify("   Marked file", vim.log.levels.INFO, { title = "Harpoon" })
end, { desc = "Add Mark", silent = true })

map("n", "<leader>hh", function()
  require("harpoon").ui:toggle_quick_menu(require("harpoon"):list())
end, { desc = "Harpoon Menu", silent = true })

-- Misc commands
map("n", "<leader>R", "<cmd>%d+<cr>", { desc = "Remove All Text", silent = true })
map("n", "<leader>y", "<cmd>%y+<cr>", { desc = "Yank All Text", silent = true })
map("n", "<leader>q", "<cmd>qa!<cr>", { desc = "Quit", silent = true })

-- map({ "n", "i", "v" }, "<C-s>", "<cmd> w <cr>")
