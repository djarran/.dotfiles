vim.pack.add({
    {
        src = "https://github.com/mfussenegger/nvim-dap",
    }
})

local dap = require("dap")
vim.fn.sign_define("DapBreakpoint", { text = "", texthl = "DiagnosticSignError", linehl = "", numhl = "" })

dap.adapters.php = {
    type = "executable",
    command = "node",
    args = { "/home/djarrancotleanu/vscode-php-debug/out/phpDebug.js" },
}

-- dap.configurations.php = {
--     {
--         type = "php",
--         request = "launch",
--         name = "Listen for Xdebug",
--         host = "${workspaceFolderBasename}.localhost",
--         port = 9003,
--         pathMappings = {
--             ["/var/www/${workspaceFolderBasename}"] = "${workspaceFolder}",
--         }
--     },
-- }

local keymap = vim.keymap.set

-- Breakpoint
keymap("n", "<leader>db", function()
    require("dap").toggle_breakpoint()
end, { desc = "DAP: Toggle breakpoint", silent = true })

-- Conditional breakpoint
keymap("n", "<leader>dB", function()
    local cond = vim.fn.input("Breakpoint condition: ")
    require("dap").set_breakpoint(cond)
end, { desc = "DAP: Set conditional breakpoint", silent = true })

-- Continue / start
keymap("n", "<leader>dc", function()
    require("dap").continue()
end, { desc = "DAP: Continue / Start", silent = true })

-- Step over
keymap("n", "<leader>do", function()
    require("dap").step_over()
end, { desc = "DAP: Step over", silent = true })
keymap("n", "<F11>", function()
    require("dap").step_over()
end, { desc = "DAP: Step over", silent = true })

-- Step into
keymap("n", "<leader>di", function()
    require("dap").step_into()
end, { desc = "DAP: Step into", silent = true })
keymap("n", "<F10>", function()
    require("dap").step_into()
end, { desc = "DAP: Step into", silent = true })

-- Terminate
keymap("n", "<leader>dt", function()
    require("dap").terminate()
end, { desc = "DAP: Terminate debug session", silent = true })

-- Hover?
keymap("n", "<leader>dh", function()
    local widgets = require("dap.ui.widgets")
    widgets.hover()
end, { desc = "DAP UI: Hover", silent = true })

keymap("n", "<leader>ds", function()
    local widgets = require("dap.ui.widgets")
    widgets.centered_float(widgets.scopes, { border = "rounded" })
end, { desc = "DAP UI: Show scopes (float)", silent = true })

keymap("n", "<leader>dre", function()
    require("dap").repl.open()
end, { desc = "DAP: Open REPL", silent = true })

vim.keymap.set("n", "<leader>dg", function()
    require("dap").run_to_cursor()
end, { desc = "DAP: Run to Cursor", silent = true })




-- Robust loader for project launch.json for nvim-dap
local uv = vim.loop
local M = {}

-- Markers to detect project root (adjust if you want different markers)
local root_markers = { "composer.json", "package.json" }

local function is_file(path)
    local st = uv.fs_stat(path)
    return st and st.type == "file"
end

local function find_root_from(path)
    if path == "" then return nil end
    local dir = vim.fn.fnamemodify(path, ":p:h")
    while dir and dir ~= "/" and dir ~= "" do
        -- check simple markers
        for _, m in ipairs(root_markers) do
            if uv.fs_stat(dir .. "/" .. m) then
                return dir
            end
        end
        -- also check for .vscode/launch.json or launch.json specifically
        if is_file(dir .. "/.vscode/launch.json") or is_file(dir .. "/launch.json") then
            return dir
        end
        local parent = vim.fn.fnamemodify(dir, ":h")
        if parent == dir then break end
        dir = parent
    end
    return nil
end

local loaded_roots = {}

function M.try_load_launchjs_for_buf(bufnr)
    bufnr = bufnr or vim.api.nvim_get_current_buf()
    local fname = vim.api.nvim_buf_get_name(bufnr)
    if fname == "" then
        vim.notify("DAP loader: buffer has no name", vim.log.levels.DEBUG)
        return false
    end

    local root = find_root_from(fname)
    if not root then
        vim.notify("DAP loader: no project root found for " .. fname, vim.log.levels.DEBUG)
        return false
    end

    if loaded_roots[root] then
        -- vim.notify("DAP loader: launch.json already loaded for " .. root, vim.log.levels.DEBUG)
        return true
    end

    -- prefer workspace .vscode/launch.json, fallback to launch.json
    local vscode_launch = root .. "/.vscode/launch.json"
    local root_launch = root .. "/launch.json"
    local launch_path = nil
    if is_file(vscode_launch) then
        launch_path = vscode_launch
    elseif is_file(root_launch) then
        launch_path = root_launch
    end

    if not launch_path then
        vim.notify("DAP loader: no launch.json found in root " .. root, vim.log.levels.DEBUG)
        return false
    end

    local ok, vscode = pcall(require, "dap.ext.vscode")
    if not ok or not vscode or not vscode.load_launchjs then
        vim.notify("DAP loader: dap.ext.vscode not available", vim.log.levels.WARN)
        return false
    end

    -- Try loading the specific file first. Some versions accept a file path, some accept a directory.
    local loaded = false
    local s, e = pcall(vscode.load_launchjs, launch_path, {})
    if s then
        loaded = true
    else
        -- fallback: try passing the directory (some versions expect that)
        local ok2, err2 = pcall(vscode.load_launchjs, root, {})
        if ok2 then
            loaded = true
        else
            vim.notify("DAP loader: failed to load launch.json: " .. tostring(e) .. " / " .. tostring(err2),
                vim.log.levels.ERROR)
        end
    end

    if loaded then
        loaded_roots[root] = true
        vim.notify("DAP loader: loaded launch.json from " .. launch_path, vim.log.levels.INFO)
        return true
    end
    return false
end

-- autocommand: run for PHP files (adjust pattern/fts as needed)
vim.api.nvim_create_autocmd({ "BufEnter", "BufReadPost" }, {
    pattern = "*.php",
    callback = function()
        M.try_load_launchjs_for_buf()
    end,
})

return M
