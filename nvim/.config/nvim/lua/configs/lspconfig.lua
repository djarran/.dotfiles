-- EXAMPLE 
local on_attach = require("nvchad.configs.lspconfig").on_attach
local on_init = require("nvchad.configs.lspconfig").on_init
local capabilities = require("nvchad.configs.lspconfig").capabilities

local lspconfig = require "lspconfig"
local servers = { "html", "cssls", "pyright", "phpactor", "gopls", "lua_ls", "tsserver", "marksman", "tailwindcss" }

-- lsps with default config
for _, lsp in ipairs(servers) do
  lspconfig[lsp].setup {
    on_attach = on_attach,
    on_init = on_init,
    capabilities = capabilities,
  }
end

vim.diagnostic.config({
  virtual_text = false,  -- Disable virtual text (optional)
  signs = true,          -- Enable signs in the sign column
  underline = true,      -- Enable underlining
  update_in_insert = false,  -- Update diagnostics in insert mode (optional)
})

vim.cmd [[
  highlight DiagnosticUnderlineError cterm=undercurl gui=undercurl guisp=NvimLightRed
  highlight DiagnosticUnderlineWarn  cterm=undercurl gui=undercurl guisp=NvimLightYellow
  highlight DiagnosticUnderlineInfo  cterm=undercurl gui=undercurl guisp=NvimLightCyan
  highlight DiagnosticUnderlineHint  cterm=undercurl gui=undercurl guisp=NvimLightBlue
  highlight DiagnosticUnderlineOk    cterm=undercurl gui=undercurl guisp=NvimLightGreen
]]

-- typescript
lspconfig.tsserver.setup {
  on_attach = on_attach,
  on_init = on_init,
  capabilities = capabilities,
}
