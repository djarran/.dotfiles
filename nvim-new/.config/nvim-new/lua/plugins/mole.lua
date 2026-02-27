vim.pack.add({
    { src = "https://github.com/zion-off/mole.nvim" },
    { src = "https://github.com/MunifTanjim/nui.nvim" }
})

require("mole").setup({
    picker = "snacks"
})
