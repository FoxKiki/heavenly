ESX = exports["es_extended"]:getSharedObject()

local Password = require("passwort")
local AccountList = require("account_list")

HeavenlySessions = HeavenlySessions or {}

local function getPlayerIdentifier(src)
    local xPlayer = ESX.GetPlayerFromId(src)
    return xPlayer and xPlayer.identifier or nil
end

local function normalizeUsername(username)
    return tostring(username or ""):gsub("^%s+", ""):gsub("%s+$", "")
end

local function findAccountByUsername(username, cb)
    local cleanUsername = normalizeUsername(username)

    if cleanUsername == "" then
        cb(nil)
        return
    end

    MySQL.Async.fetchAll([[
        SELECT identifier, username, password
        FROM heavenly_accounts
        WHERE LOWER(username) = LOWER(@username)
        LIMIT 1
    ]], {
        ["@username"] = cleanUsername
    }, function(rows)
        cb(rows and rows[1] or nil)
    end)
end

local function createProfileIfMissing(identifier, cb)
    MySQL.Async.execute([[
        INSERT INTO heavenly_profiles (identifier, status, theme_json, avatar, cover, friends_json)
        VALUES (@identifier, '', '{}', NULL, NULL, '[]')
        ON DUPLICATE KEY UPDATE identifier = identifier
    ]], {
        ["@identifier"] = identifier
    }, function()
        if cb then
            cb()
        end
    end)
end

ESX.RegisterServerCallback("heavenly:register", function(source, cb, username, password, passwordRepeat)
    local identifier = getPlayerIdentifier(source)
    local cleanUsername = normalizeUsername(username)
    local rawPassword = tostring(password or "")
    local rawPasswordRepeat = tostring(passwordRepeat or rawPassword)

    if not identifier then
        cb({ ok = false, message = "Spieler konnte nicht geladen werden" })
        return
    end

    if cleanUsername == "" or rawPassword == "" then
        cb({ ok = false, message = "Bitte Username und Passwort eingeben" })
        return
    end

    if rawPassword ~= rawPasswordRepeat then
        cb({ ok = false, message = "Passwoerter stimmen nicht ueberein" })
        return
    end

    findAccountByUsername(cleanUsername, function(existingAccount)
        if existingAccount then
            cb({ ok = false, message = "Username existiert bereits" })
            return
        end

        local hash = Password.hashPassword(rawPassword)

        MySQL.Async.insert([[
            INSERT INTO heavenly_accounts (identifier, username, password)
            VALUES (@identifier, @username, @password)
        ]], {
            ["@identifier"] = identifier,
            ["@username"] = cleanUsername,
            ["@password"] = hash
        }, function()
            createProfileIfMissing(identifier, function()
                cb({
                    ok = true,
                    data = {
                        username = cleanUsername,
                        message = "Account erfolgreich erstellt"
                    }
                })
            end)
        end)
    end)
end)

ESX.RegisterServerCallback("heavenly:login", function(source, cb, username, password)
    local cleanUsername = normalizeUsername(username)
    local rawPassword = tostring(password or "")

    if cleanUsername == "" or rawPassword == "" then
        cb({ ok = false, message = "Bitte Username und Passwort eingeben" })
        return
    end

    findAccountByUsername(cleanUsername, function(account)
        if not account then
            cb({ ok = false, message = "Username nicht gefunden" })
            return
        end

        if not Password.verifyPassword(rawPassword, account.password) then
            cb({ ok = false, message = "Falsches Passwort" })
            return
        end

        HeavenlySessions[source] = account.username

        createProfileIfMissing(account.identifier, function()
            cb({
                ok = true,
                data = {
                    username = account.username,
                    message = "Login erfolgreich"
                }
            })
        end)
    end)
end)

ESX.RegisterServerCallback("heavenly:logout", function(source, cb)
    HeavenlySessions[source] = nil

    cb({
        ok = true,
        data = {
            message = "Logout erfolgreich"
        }
    })
end)

ESX.RegisterServerCallback("heavenly:getSession", function(source, cb)
    local username = HeavenlySessions[source]

    cb({
        ok = true,
        data = username and { username = username } or nil
    })
end)

ESX.RegisterServerCallback("heavenly:getAccounts", function(_, cb)
    AccountList.getAccounts(function(usernames)
        cb({
            ok = true,
            data = usernames or {}
        })
    end)
end)

ESX.RegisterServerCallback("heavenly:deleteAccount", function(source, cb)
    local username = HeavenlySessions[source]

    if not username then
        cb({ ok = false, message = "Nicht eingeloggt" })
        return
    end

    findAccountByUsername(username, function(account)
        if not account then
            HeavenlySessions[source] = nil
            cb({ ok = false, message = "Account nicht gefunden" })
            return
        end

        MySQL.Async.execute([[
            DELETE FROM heavenly_profiles
            WHERE identifier = @identifier
        ]], {
            ["@identifier"] = account.identifier
        }, function()
            MySQL.Async.execute([[
                DELETE FROM heavenly_accounts
                WHERE LOWER(username) = LOWER(@username)
            ]], {
                ["@username"] = account.username
            }, function()
                HeavenlySessions[source] = nil

                cb({
                    ok = true,
                    data = {
                        deleted = true,
                        username = account.username
                    }
                })
            end)
        end)
    end)
end)

AddEventHandler("playerDropped", function()
    HeavenlySessions[source] = nil
end)