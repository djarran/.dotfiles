vim.pack.add({
    { src = "https://github.com/rachartier/tiny-inline-diagnostic.nvim" },
})

require("tiny-inline-diagnostic").setup({})

local signs = {
    diagnostic = {
        error = "●",
        warning = "●",
        warn = "●",
        info = "●",
        hint = "●",
        ok = "●",
        other = "●",
    },
}

vim.diagnostic.config({
    virtual_text = false,
    underline = true,
    document_highlight = {
        enabled = true,
    },
    signs = {
        text = {
            [vim.diagnostic.severity.ERROR] = signs.diagnostic.error,
            [vim.diagnostic.severity.WARN] = signs.diagnostic.warning,
            [vim.diagnostic.severity.INFO] = signs.diagnostic.info,
            [vim.diagnostic.severity.HINT] = signs.diagnostic.hint,
        }
    },
    severity_sort = true,
})
