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

-- Copy file path to clipboard
keymap("n", "<leader>yf", function()
    local path = vim.fn.expand("%:.")
    vim.fn.setreg("+", path)
    vim.fn.setreg('"', path)
    vim.notify("Copied: " .. path, vim.log.levels.INFO)
end, { desc = "Copy file path to clipboard" })

-- Grep search for current filename
keymap("n", "<leader>fn", function()
    local filename = vim.fn.expand("%:t")
    local Snacks = require("snacks")
    Snacks.picker.pick("grep", {
        search = filename,
    })
end, { desc = "Search for current filename" })

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
keymap("n", "gr", vim.lsp.buf.references, { desc = "Show references" })
keymap("n", "ca", vim.lsp.buf.code_action, { desc = "LSP Code Action" })
-- ============================================================================
-- YANK/PASTE
-- ============================================================================
keymap("v", "<Leader>p", '"_dP', { desc = "Paste without overwriting register" })

-- ============================================================================
-- INSERT MODE
-- ============================================================================
keymap('i', 'jk', '<Esc>', { desc = 'Map jk to Esc in insert mode' })


local function get_directories()
  local directories = {}

  local handle = io.popen("fdfind . --type directory")
  if handle then
    for line in handle:lines() do
      table.insert(directories, line)
    end
    handle:close()
  else
    print("Failed to execute fd command")
  end

  return directories
end

vim.keymap.set("n", "<leader>fg", function()
  local Snacks = require("snacks")
  local dirs = get_directories()

  return Snacks.picker({
    finder = function()
      local items = {}
      for i, item in ipairs(dirs) do
        table.insert(items, {
          idx = i,
          file = item,
          text = item,
        })
      end
      return items
    end,
    layout = {
      layout = {
        box = "horizontal",
        width = 0.5,
        height = 0.5,
        {
          box = "vertical",
          border = "rounded",
          title = "Find directory",
          { win = "input", height = 1, border = "bottom" },
          { win = "list", border = "none" },
        },
      },
    },
    format = function(item, _)
      local file = item.file
      local ret = {}
      local a = Snacks.picker.util.align
      local icon, icon_hl = Snacks.util.icon(file.ft, "directory")
      ret[#ret + 1] = { a(icon, 3), icon_hl }
      ret[#ret + 1] = { " " }
      ret[#ret + 1] = { a(file, 20) }

      return ret
    end,
    confirm = function(picker, item)
      picker:close()
      Snacks.picker.pick("grep", {
        dirs = { item.file },
      })
    end,
  })
end)
