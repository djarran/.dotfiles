return {
  "jose-elias-alvarez/null-ls.nvim",
  ft = { "python" },
  opts = function()
    return require "custom.configs.null-ls"
  end,
}
