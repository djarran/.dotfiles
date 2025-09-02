local keymap = vim.keymap.set
local s = { silent = true }

vim.g.mapleader = " "

-- Disable the space key in normal mode as a leader key or to prevent accidental presses
keymap("n", "<space>", "<Nop>")

-- Quit Neovim
keymap("n", "<leader>q", "<cmd>qa!<CR>")

-- Navigate lines respecting line wraps
keymap("n", "j", function()
    return tonumber(vim.api.nvim_get_vvar("count")) > 0 and "j" or "gj"
end, { expr = true, silent = true }) -- Move down, but use 'gj' if no count is given
keymap("n", "k", function()
    return tonumber(vim.api.nvim_get_vvar("count")) > 0 and "k" or "gk"
end, { expr = true, silent = true }) -- Move up, but use 'gk' if no count is given

-- Yank/paste related
keymap("v", "<Leader>p", '"_dP') -- Paste without overwriting the default register
-- keymap("x", "y", [["+y]], s) -- Yank to the system clipboard in visual mode

-- Change directory to the current file's directory
keymap("n", "<leader>cd", '<cmd>lua vim.fn.chdir(vim.fn.expand("%:p:h"))<CR>')

local opts = { noremap = true, silent = true }
keymap("n", "<leader>gd", "<cmd>lua vim.lsp.buf.definition()<CR>", opts) -- Go to definition
keymap("n", "<leader>fm", "<cmd>lua vim.lsp.buf.format({ async = true })<CR>", opts)

-- Set up key mappings for easier window navigation
vim.keymap.set("n", "<C-h>", "<C-w>h", { desc = "Move to left window" })
vim.keymap.set("n", "<C-j>", "<C-w>j", { desc = "Move to window below" })
vim.keymap.set("n", "<C-k>", "<C-w>k", { desc = "Move to window above" })
vim.keymap.set("n", "<C-l>", "<C-w>l", { desc = "Move to right window" })

keymap("n", "<Leader>j", "<cmd>split<CR><C-w>w", s) -- Split the window horizontally
keymap("n", "<Leader>l", "<cmd>vsplit<CR><C-w>w", s) -- Split the window vertically
vim.keymap.set('i', 'jk', '<Esc>', { desc = 'Map jk to Esc in insert mode' })

vim.opt.clipboard = "unnamedplus"
