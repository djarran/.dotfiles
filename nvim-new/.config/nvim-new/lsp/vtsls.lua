-- ~/.config/nvim-new/lsp/intelephense.lua
---@type vim.lsp.Config
return {
    cmd = { 'vtsls', '--stdio' },
    settings = {
        vtsls = {
            autoUseWorkspaceTsdk = true,
        },
        typescript = {
            tsserver = {
                pluginPaths = { "./node_modules" },
            },
        },
    },
    init_options = {
        vtsls = {
            autoUseWorkspaceTsdk = true,
        },
        typescript = {
            tsserver = {
                pluginPaths = { "./node_modules" },
            },
        },
    },
}
