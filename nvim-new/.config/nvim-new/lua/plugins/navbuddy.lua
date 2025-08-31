vim.pack.add({
    { src = "https://github.com/SmiteshP/nvim-navic" },
    { src = "https://github.com/MunifTanjim/nui.nvim" },
})
vim.pack.add({
    { src = "https://github.com/SmiteshP/nvim-navbuddy" },
}, {
 lsp = { auto_attach = true }
})

require("nvim-navbuddy").setup({})
