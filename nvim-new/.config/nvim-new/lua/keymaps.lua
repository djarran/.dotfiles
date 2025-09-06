local keymap = vim.keymap.set
local s = { silent = true }

vim.g.mapleader = " "
vim.opt.clipboard = "unnamedplus"

-- Disable space key
keymap("n", "<space>", "<Nop>", { desc = "Disable space key" })

-- ============================================================================
-- EDITOR COMMANDS
-- ============================================================================
-- Quit Neovim
keymap("n", "<leader>q", "<cmd>qa!<CR>", { desc = "Quit Neovim" })

-- Change directory
keymap("n", "<leader>cd", '<cmd>lua vim.fn.chdir(vim.fn.expand("%:p:h"))<CR>',
    { desc = "Change directory to current file" })

-- ============================================================================
-- NAVIGATION
-- ============================================================================
-- Line navigation with wrap respect
keymap("n", "j", function()
    return tonumber(vim.api.nvim_get_vvar("count")) > 0 and "j" or "gj"
end, { expr = true, silent = true, desc = "Navigate down (respect wraps)" })

keymap("n", "k", function()
    return tonumber(vim.api.nvim_get_vvar("count")) > 0 and "k" or "gk"
end, { expr = true, silent = true, desc = "Navigate up (respect wraps)" })

-- Window navigation
keymap("n", "<C-h>", "<C-w>h", { desc = "Move to left window" })
keymap("n", "<C-j>", "<C-w>j", { desc = "Move to window below" })
keymap("n", "<C-k>", "<C-w>k", { desc = "Move to window above" })
keymap("n", "<C-l>", "<C-w>l", { desc = "Move to right window" })

-- Window splits
keymap("n", "<Leader>j", "<cmd>split<CR><C-w>w", vim.tbl_extend("force", s, { desc = "Horizontal split" }))
keymap("n", "<Leader>l", "<cmd>vsplit<CR><C-w>w", vim.tbl_extend("force", s, { desc = "Vertical split" }))

-- ============================================================================
-- LSP
-- ============================================================================
local opts = { noremap = true, silent = true }
keymap("n", "<leader>gd", "<cmd>lua vim.lsp.buf.definition()<CR>",
    vim.tbl_extend("force", opts, { desc = "Go to definition" }))
keymap("n", "<leader>fm", "<cmd>lua vim.lsp.buf.format({ async = true })<CR>",
    vim.tbl_extend("force", opts, { desc = "Format buffer" }))

-- ============================================================================
-- YANK/PASTE
-- ============================================================================
keymap("v", "<Leader>p", '"_dP', { desc = "Paste without overwriting register" })

-- ============================================================================
-- INSERT MODE
-- ============================================================================
keymap('i', 'jk', '<Esc>', { desc = 'Map jk to Esc in insert mode' })
