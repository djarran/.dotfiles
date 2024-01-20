local M = {}

M.abc = {
  n = {
    -- ["<leader>tu"] = { "<cmd>Telescope undo<CR>", "view undo tree" },
  },
  i = {
    ["jk"] = { "<ESC>", "escape insert mode", opts = { nowait = true } },
    [";;"] = { "<Plug>(TaboutBack)", "tabout"}
  }
}

return M
