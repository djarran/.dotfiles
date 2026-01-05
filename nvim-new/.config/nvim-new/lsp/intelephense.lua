-- ~/.config/nvim-new/lsp/intelephense.lua
---@type vim.lsp.Config
return {
    cmd = { 'intelephense', '--stdio' },
    filetypes = { 'php' },
    root_markers = {
        'composer.json',
        '.git',
        'index.php',
    },
    settings = {
        intelephense = {
            files = {
                maxSize = 1000000,
                associations = { "*.php", "*.phtml" },
                exclude = {
                    "**/node_modules/**",
                    "**/vendor/**/Tests/**",
                    "**/vendor/**/tests/**",
                    "**/storage/framework/views/*.php",
                },
            },
            format = {
                enable = true,
            },
            environment = {
                includePaths = {},
            },
            completion = {
                insertUseDeclaration = true,
                fullyQualifyGlobalConstantsAndFunctions = false,
                triggerParameterHints = true,
                maxItems = 100,
            },
        },
    },
}
