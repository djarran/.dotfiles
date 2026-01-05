vim.pack.add({
    {
        src = "https://github.com/f-person/git-blame.nvim",
    }
})

-- ["<leader>gO"] = { "<cmd>GitBlameOpenCommitURL<cr>", "Open Commit Url", opts = { silent = true } },
-- ["<leader>gc"] = { "<cmd>GitBlameCopyCommitURL<cr>", "Copy Commit Url", opts = { silent = true } },
-- ["<leader>gf"] = { "<cmd>GitBlameOpenFileURL<cr>", "Open File Url", opts = { silent = true } },
-- ["<leader>gC"] = { "<cmd>GitBlameCopyFileURL<cr>", "Copy File Url", opts = { silent = true } },
--
local wk = require("which-key")
wk.add({
    {
        "<leader>gO",
        "<cmd>GitBlameOpenCommitURL<cr>",
        desc = "Open Commit Url"
    },
    {
        "<leader>gc",
        "<cmd>GitBlameCopyCommitURL<cr>",
        desc = "Copy Commit Url",
    },
    {
        "<leader>gf",
        "<cmd>GitBlameOpenFileURL<cr>",
        desc = "Open File Url",
    },
    {
        "<leader>gC",
        "<cmd>GitBlameCopyFileURL<cr>",
        desc = "Copy File Url",
    }
})
