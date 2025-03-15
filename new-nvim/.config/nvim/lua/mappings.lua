require "nvchad.mappings"

-- add yours here

local map = vim.keymap.set

map("n", ";", ":", { desc = "CMD enter command mode" })
map("i", "jk", "<ESC>")

map("n", "-", "<cmd>Oil --float<cr>", { desc = "Wow", silent = true })

map(
  "n",
  "<leader>yp",
  "<cmd>lua local cwd = vim.fn.getcwd(); local file = vim.fn.expand('%:p'); local relative_path = file:gsub(cwd .. '/', ''); vim.fn.setreg('+', relative_path); print('Yanked relative path: ' .. relative_path)<CR>",
  { desc = "Yank relative file path", noremap = true, silent = true }
)

-- Sessions
map(
  "n",
  "<leader>ss",
  "<cmd>execute 'SessionStart' | execute 'SessionSave'<cr>",
  { desc = "Save Session", silent = true }
)
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

-- Dap
map("n", "<leader>dc", "<cmd>lua require'dap'.continue()<cr>", { desc = "Continue", silent = true })
map("n", "<leader>do", "<cmd>lua require'dap'.step_over()<cr>", { desc = "Step Over", silent = true })
map("n", "<leader>di", "<cmd>lua require'dap'.step_into()<cr>", { desc = "Step Into", silent = true })
map("n", "<leader>du", "<cmd>lua require'dap'.step_out()<cr>", { desc = "Step Out", silent = true })
map("n", "<leader>db", "<cmd>lua require'dap'.toggle_breakpoint()<cr>", { desc = "Breakpoint", silent = true })
map(
  "n",
  "<leader>dB",
  "<cmd>lua require'dap'.set_breakpoint(vim.fn.input('Breakpoint condition: '))<cr>",
  { desc = "Breakpoint condition", silent = true }
)
map("n", "<leader>dd", "<cmd>lua require'dapui'.toggle()<cr>", { desc = "Dap UI", silent = true })
map("n", "<leader>dl", "<cmd>lua require'dap'.run_last()<cr>", { desc = "Run Last", silent = true })


-- map({ "n", "i", "v" }, "<C-s>", "<cmd> w <cr>")
