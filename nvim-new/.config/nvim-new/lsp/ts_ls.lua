-- ~/.config/nvim-new/lsp/ts_ls.lua
---@type vim.lsp.Config
return {
    cmd = { 'typescript-language-server', '--stdio' },
    filetypes = { 'javascript', 'javascriptreact', 'typescript', 'typescriptreact' },
    root_markers = {
        'package.json',
        'tsconfig.json',
        'jsconfig.json',
        '.git',
    },
    settings = {
        typescript = {
            preferences = {
                disableSuggestions = false,
            }
        },
        javascript = {
            preferences = {
                disableSuggestions = false,
            }
        }
    },
}
