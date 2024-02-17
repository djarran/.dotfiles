return {
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
      "lua-language-server",
      "typescript-language-server",
      "marksman"
    }
  }
}
