vim.pack.add({
    { src = 'https://github.com/nvim-mini/mini.indentscope' }
})
require('mini.indentscope').gen_animation.none()

require('mini.indentscope').setup({
    draw = {
        delay = 50
    },
    symbol = '|',
})
