return {
  "neovim/nvim-lspconfig",
  dependencies = {
  },
  config = function()
    require "plugins.configs.lspconfig"
    require "custom.configs.lspconfig"
  end,
}
