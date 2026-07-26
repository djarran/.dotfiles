return {
  "mfussenegger/nvim-dap",
  dependencies = {
    "rcarriga/nvim-dap-ui",
    "nvim-neotest/nvim-nio",
    "leoluz/nvim-dap-go",
    "theHamsta/nvim-dap-virtual-text",
  },
  ft = {
    "c",
    "cpp",
    "go",
  },
  config = function()
    local dap, dapui = require "dap", require "dapui"
    dapui.setup()
    require("nvim-dap-virtual-text").setup()
    require("dap-go").setup {
      dap_configurations = {
        {
          type = "go",
          name = "Attach remote",
          mode = "remote",
          request = "attach",
          host = "127.0.0.1",
          port = "38697",
          program = "main.go",
        },
      },
    }

    -- dap.configurations.go = {
    --   {
    --     type = "go",
    --     name = "Debug",
    --     request = "launch",
    --     program = "${file}",
    --   },
    -- }

    -- set up debuggers
    dap.adapters.lldb = {
      type = "executable",
      command = "lldb-dap.exe", --installed locally
      name = "lldb",
    }
    dap.adapters.java = {
      type = "server",
      host = "127.0.0.1",
      port = 5005,
      name = "Java Debug Adapter",
    }

    -- configure debuggers
    dap.configurations.cpp = {
      {
        name = "Launch",
        type = "lldb",
        request = "launch",
        program = "${file}",
        cwd = "${workspaceFolder}",
        stopOnEntry = false,
        args = {},
      },
    }
    dap.configurations.c = dap.configurations.cpp
    dap.configurations.rust = dap.configurations.cpp
    dap.configurations.zig = dap.configurations.cpp

    dap.configurations.java = {
      {
        type = "java",
        request = "attach",
        name = "Debug (Attach) - Remote",
        hostName = "127.0.0.1",
        port = 5005,
      },
      {
        type = "java",
        request = "launch",
        name = "Debug (Launch) - Current File",
        mainClass = "${file}",
      },
    }

    -- open ui
    dap.listeners.before.attach.dapui_config = function()
      dapui.open()
    end
    dap.listeners.before.launch.dapui_config = function()
      dapui.open()
    end
    dap.listeners.before.event_terminated.dapui_config = function()
      dapui.close()
    end
    dap.listeners.before.event_exited.dapui_config = function()
      dapui.close()
    end

    -- set keymaps
    local map = vim.keymap.set
    map("n", "<F1>", function()
      dap.toggle_breakpoint()
    end, { desc = "DAP toggle breakpoint" })
    map("n", "<F2>", function()
      dap.continue()
    end, { desc = "DAP continue" })
    map("n", "<F3>", function()
      dap.step_into()
    end, { desc = "DAP step into" })
    map("n", "<F4>", function()
      dap.step_over()
    end, { desc = "DAP step over" })
    map("n", "<F5>", function()
      dap.step_out()
    end, { desc = "DAP step out" })
    map("n", "<F6>", function()
      dap.repl.open()
    end, { desc = "DAP repl open" })
    map("n", "<F7>", function()
      dap.terminate()
    end, { desc = "DAP terminate session" })
  end,
}
