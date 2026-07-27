--- @brief
---
--- https://github.com/oxc-project/oxc
--- https://oxc.rs/docs/guide/usage/formatter.html
---
--- `oxfmt` is a Prettier-compatible code formatter that supports multiple languages
--- including JavaScript, TypeScript, JSON, YAML, HTML, CSS, Markdown, and more.
--- It can be installed via `npm`:
---
--- ```sh
--- npm i -g oxfmt
--- ```

---@type vim.lsp.Config
return {
  cmd = function(dispatchers, config)
    local cmd = 'oxfmt'
    local local_cmd = (config or {}).root_dir and config.root_dir .. '/node_modules/.bin/oxfmt'
    if local_cmd and vim.fn.executable(local_cmd) == 1 then
      cmd = local_cmd
    end
    return vim.lsp.rpc.start({ cmd, '--lsp' }, dispatchers)
  end,
  filetypes = {
    'javascript',
    'javascriptreact',
    'typescript',
    'typescriptreact',
    'toml',
    'json',
    'jsonc',
    'json5',
    'yaml',
    'html',
    'vue',
    'handlebars',
    'css',
    'scss',
    'less',
    'graphql',
    'markdown',
  },
  workspace_required = true,
  root_dir = function(bufnr, on_dir)
    local fname = vim.api.nvim_buf_get_name(bufnr)
    if fname == '' then
      on_dir(nil)
      return
    end

    -- Oxfmt resolves configuration by walking upward and using the nearest config file
    -- to the file being processed. We therefore compute the root directory by locating
    -- the closest `.oxfmtrc.json` / `.oxfmtrc.jsonc` (or `package.json` fallback) above the buffer.
    local root_file = vim.fs.find({ '.oxfmtrc.json', '.oxfmtrc.jsonc', 'package.json' }, {
      path = fname,
      upward = true,
    })[1]

    on_dir(root_file and vim.fs.dirname(root_file) or nil)
  end,
}
