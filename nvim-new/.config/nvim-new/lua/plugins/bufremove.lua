vim.pack.add({
    { src = "https://github.com/echasnovski/mini.bufremove", name = "mini.bufremove" },
})

local bufremove = require('mini.bufremove')

local function delete_buffer_prompt()
  if vim.bo.modified then
    local choice = vim.fn.confirm(("Save changes to %q?"):format(vim.fn.bufname()), "&Yes\n&No\n&Cancel")
    if choice == 1 then -- Yes
      vim.cmd.write()
      bufremove.delete(0)
    elseif choice == 2 then -- No
      bufremove.delete(0, true)
    end
  else
    bufremove.delete(0)
  end
end

local opts = { noremap = true, silent = true }

vim.keymap.set("n", "<leader>x", delete_buffer_prompt, opts)
vim.keymap.set("n", "<leader>X", delete_buffer_prompt, opts)