
local plugins = {
  -- {
  --   "Bekaboo/dropbar.nvim",
  --   dependencies = {
  --     'nvim-telescope/telescope-fzf-native.nvim'
  --   }
  -- },
  {
    "FeiyouG/commander.nvim",
    dependencies = { "nvim-telescope/telescope.nvim"}
  },
  {
    "karb94/neoscroll.nvim",
    lazy = false,
    init = function()
      require('neoscroll').setup()
    end,
  },
  {
    "ggandor/leap-spooky.nvim",
    lazy = false,
    init = function()
      require('leap-spooky').setup()
    end,
  },
  {
    "ggandor/leap.nvim",
    lazy = false,
    init = function()
      require('leap').add_default_mappings()
    end,
  },
  {
    "ggandor/flit.nvim",
    lazy = false,
    init = function()
      require('flit').setup()
    end,
  },
  { "SmiteshP/nvim-navbuddy",
    dependencies = {
        "SmiteshP/nvim-navic",
        "MunifTanjim/nui.nvim"
    },
    opts = { lsp = { auto_attach = true } },
    lazy = false
  },
  {
    "williamboman/mason.nvim",
    opts = {
      ensure_installed = {
        "black",
        "ruff",
        "mypy",
        "pyright",
        "intelephense",
        "phpactor",
        "phpcs",
      }
    }
  },
  {
    "neovim/nvim-lspconfig",
    dependencies = {
    },
    config = function()
      require "plugins.configs.lspconfig"
      require "custom.configs.lspconfig"
    end,
  },
  {
    "jose-elias-alvarez/null-ls.nvim",
    ft = {"python"},
    opts = function()
      return require "custom.configs.null-ls"
    end,
  },
  {
    "NvChad/nvcommunity",
    -- { import = 'nvcommunity.folds.ufo'},
    { import = 'nvcommunity.folds.fold-preview'},
    { import = 'nvcommunity.folds.origami'},
    { import = 'nvcommunity.lsp.prettyhover'},
    -- { import = 'nvcommunity.editor.telescope-undo'}
  },
  {
    "kevinhwang91/nvim-ufo",
    event = "VimEnter",
    init = function()
      vim.o.foldcolumn = "auto"
      vim.o.foldlevel = 99 -- Using ufo provider need a large value
      vim.o.foldlevelstart = 99
      vim.o.foldnestmax = 0
      vim.o.foldenable = true
      vim.o.foldmethod = "indent"

      vim.opt.fillchars = {
        fold = " ",
        foldopen = "",
        foldsep = " ",
        foldclose = "",
        stl = " ",
        eob = " ",
      }
    end,
    dependencies = {
      "kevinhwang91/promise-async",
      {
        "luukvbaal/statuscol.nvim",
        opts = function()
          local builtin = require "statuscol.builtin"
          return {
            relculright = true,
            bt_ignore = { "nofile", "prompt", "terminal", "packer" },
            ft_ignore = {
              "NvimTree",
              "dashboard",
              "nvcheatsheet",
              "dapui_watches",
              "dap-repl",
              "dapui_console",
              "dapui_stacks",
              "dapui_breakpoints",
              "dapui_scopes",
              "help",
              "vim",
              "alpha",
              "dashboard",
              "neo-tree",
              "Trouble",
              "noice",
              "lazy",
              "toggleterm",
            },
            segments = {
              -- Segment: Add padding
              -- {
              --   text = { " " },
              -- },
              -- Segment: Fold Column
              { text = { builtin.foldfunc }, click = "v:lua.ScFa" },
              -- Segment: Add padding
              -- {
              --   text = { " " },
              -- },
              -- Segment : Show signs with one character width
              -- {
              --   sign = {
              --     name = { ".*" },
              --     maxwidth = 1,
              --     colwidth = 1,
              --   },
              --   auto = true,
              --   click = "v:lua.ScSa",
              -- },
              -- Segment: Show line number
              {
                text = { " ", " ", builtin.lnumfunc, " " },
                click = "v:lua.ScLa",
                condition = { true, builtin.not_empty },
              },
              -- Segment: Add padding
              -- {
              --   text = { " " },
              --   hl = "Normal",
              --   condition = { true, builtin.not_empty },
              -- },
            },
          }
        end,
      },
    },
    opts = {
      close_fold_kinds = { "imports" },
      provider_selector = function()
        return { "treesitter", "indent" }
      end,
    },
  },
}

return plugins
