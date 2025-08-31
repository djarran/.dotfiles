vim.pack.add({ {src="https://github.com/echasnovski/mini.icons"}, {src="https://github.com/stevearc/oil.nvim"} })

require('mini.icons').setup()

require("oil").setup({
      default_file_explorer = true,
      delete_to_trash = true,
      skip_confirm_for_simple_edits = true,
      view_options = {
        show_hidden = true,
        natural_order = true,
        is_always_hidden = function(name, _)
          return name == ".." or name == ".git"
        end,
      },
      float = {
        padding = 10,
        max_width = 90,
        max_height = 0,
        border = "rounded",
        preview_split = "right",
      },
      win_options = {
        wrap = true,
        winblend = 0,
      },
      keymaps = {
        ["<C-c>"] = false,
        ["q"] = "actions.close",
        ["<C-i"] = "actions.preview",
      },
  })
vim.keymap.set("n", "-", "<CMD>Oil --float<CR>", { desc = "Open parent directory" })
