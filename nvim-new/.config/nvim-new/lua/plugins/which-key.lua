vim.pack.add({
    {
        src = "https://github.com/folke/which-key.nvim",
    }
})

require('which-key').setup({})

vim.keymap.set("n", "<leader>o", function() require("which-key").show({ global = false }) end)

