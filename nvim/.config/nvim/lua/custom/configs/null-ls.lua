local null_ls = require('null-ls')

local opts = {
  sources = {
    null_ls.builtins.diagnostics.mypy,
    null_ls.builtins.diagnostics.ruff,
    null_ls.builtins.formatting.black,
    null_ls.builtins.diagnostics.phpcs.with({
      command = "phpcs",
      args = {
        "--config-set",
        "installed_paths",
        "~/.config/composer/vendor/phpcompatibility/php-compatibility/PHPCompatibility,~/.config/composer/vendor/moodlehq/moodle-cs/moodle"
      }
    }),
  }
}

return opts
