local dap = require "dap"

dap.adapters.php = {
  type = "executable",
  command = "node",
  args = { "/home/djarrancotleanu/vscode-php-debug/out/phpDebug.js" },
}

dap.configurations.php = {
  {
    type = "php",
    request = "launch",
    name = "Listen for Xdebug",
    host = "${workspaceFolderBasename}.localhost",
    port = 9003,
    pathMappings = {
      ["/var/www/${workspaceFolderBasename}"] = "${workspaceFolder}",
    }
  },
}
