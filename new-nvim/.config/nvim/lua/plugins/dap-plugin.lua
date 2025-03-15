return {
  {
    "mfussenegger/nvim-dap",
    config = function(_, opts)
      local dap = require "dap"
      -- dofile(vim.g.base46_cache .. "dap")

    end,
  },
  {
    "rcarriga/nvim-dap-ui",
    dependencies = {
      "mfussenegger/nvim-dap",
      "nvim-neotest/nvim-nio",
    },
    config = function()
      local dap = require "dap"
      local dapui = require "dapui"
      dapui.setup()
      dap.listeners.after.event_initialized["dapui_config"] = function()
        dapui.open()
      end
      dap.listeners.before.event_terminated["dapui_config"] = function()
        dapui.close()
      end
      dap.listeners.before.event_exited["dapui_config"] = function()
        dapui.close()
      end

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
          },
        },
      }
    end,
  },
  {
    "theHamsta/nvim-dap-virtual-text",
    lazy = false,
    config = function(_, opts)
      require("nvim-dap-virtual-text").setup()
    end,
  },
}
-- return {
--   {
--     "mfussenegger/nvim-dap",
--     dependencies = {
--       "leoluz/nvim-dap-go",
--       "rcarriga/nvim-dap-ui",
--       "theHamsta/nvim-dap-virtual-text",
--       "nvim-neotest/nvim-nio",
--       "williamboman/mason.nvim",
--     },
--     config = function()
--       local dap = require("dap")
--       local dapui = require("dapui")
--
--       dapui.setup()
--       require("dap-go").setup()
--
--       require("nvim-dap-virtual-text").setup {
--         -- This just tries to mitigate the chance that I leak tokens here. Probably won't stop it from happening...
--         display_callback = function(variable)
--           local name = string.lower(variable.name)
--           local value = string.lower(variable.value)
--           if name:match "secret" or name:match "api" or value:match "secret" or value:match "api" then
--             return "*****"
--           end
--
--           if #variable.value > 15 then
--             return " " .. string.sub(variable.value, 1, 15) .. "... "
--           end
--
--           return " " .. variable.value
--         end,
--       }
--
--       dap.adapters.php = {
--         type = "executable",
--         command = "node",
--         args = { "/home/djarrancotleanu/dev/vscode-php-debug/out/phpDebug.js" },
--       }
--
--       dap.configurations.php = {
--         {
--           type = "php",
--           request = "launch",
--           name = "Listen for Xdebug",
--           host = "${workspaceFolderBasename}.localhost",
--           port = 9003,
--           pathMappings = {
--             ["/var/www/${workspaceFolderBasename}"] = "${workspaceFolder}",
--           },
--         },
--       }
--
--       -- Handled by nvim-dap-go
--       -- dap.adapters.go = {
--       --   type = "server",
--       --   port = "${port}",
--       --   executable = {
--       --     command = "dlv",
--       --     args = { "dap", "-l", "127.0.0.1:${port}" },
--       --   },
--       -- }
--
--       -- local elixir_ls_debugger = vim.fn.exepath "elixir-ls-debugger"
--       -- if elixir_ls_debugger ~= "" then
--       --   dap.adapters.mix_task = {
--       --     type = "executable",
--       --     command = elixir_ls_debugger,
--       --   }
--       --
--       --   dap.configurations.elixir = {
--       --     {
--       --       type = "mix_task",
--       --       name = "phoenix server",
--       --       task = "phx.server",
--       --       request = "launch",
--       --       projectDir = "${workspaceFolder}",
--       --       exitAfterTaskReturns = false,
--       --       debugAutoInterpretAllModules = false,
--       --     },
--       --   }
--       -- end
--
--       vim.keymap.set("n", "<space>b", dap.toggle_breakpoint)
--       vim.keymap.set("n", "<space>gb", dap.run_to_cursor)
--
--       -- Eval var under cursor
--       vim.keymap.set("n", "<space>?", function()
--         require("dapui").eval(nil, { enter = true })
--       end)
--
--       vim.keymap.set("n", "<F1>", dap.continue)
--       vim.keymap.set("n", "<F2>", dap.step_into)
--       vim.keymap.set("n", "<F3>", dap.step_over)
--       vim.keymap.set("n", "<F4>", dap.step_out)
--       vim.keymap.set("n", "<F5>", dap.step_back)
--       vim.keymap.set("n", "<F13>", dap.restart)
--
--       dap.listeners.before.attach.dapui_config = function()
--         ui.open()
--       end
--       dap.listeners.before.launch.dapui_config = function()
--         ui.open()
--       end
--       dap.listeners.before.event_terminated.dapui_config = function()
--         ui.close()
--       end
--       dap.listeners.before.event_exited.dapui_config = function()
--         ui.close()
--       end
--     end,
--   },
-- }
