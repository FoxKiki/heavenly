ESX = exports["es_extended"]:getSharedObject()

-- Module laden
local Password = require("password")       -- password.lua
local AccountList = require("account_list") -- account_list.lua

-- Registrierung
RegisterNetEvent("heavenly:register")
AddEventHandler("heavenly:register", function(username, password)
    local src = source
    local xPlayer = ESX.GetPlayerFromId(src)
    local identifier = xPlayer.identifier

    MySQL.query('SELECT * FROM heavenly_accounts WHERE username = ?', {username}, function(result)
        if result[1] then
            TriggerClientEvent("heavenly:registerResult", src, false, "Username existiert bereits")
        else
            -- Passwort sicher hashen
            local hash = Password.hashPassword(password)

            MySQL.insert('INSERT INTO heavenly_accounts (identifier, username, password) VALUES (?, ?, ?)', {
                identifier,
                username,
                hash
            })

            -- Nur Feedback an den Spieler selbst
            TriggerClientEvent("heavenly:registerResult", src, true, "Account erstellt")
        end
    end)
end)

-- Login prüfen
RegisterNetEvent("heavenly:login")
AddEventHandler("heavenly:login", function(username, password)
    local src = source

    MySQL.query('SELECT * FROM heavenly_accounts WHERE username = ?', {username}, function(result)
        if result[1] then
            local hash = result[1].password

            if Password.verifyPassword(password, hash) then
                TriggerClientEvent("heavenly:loginResult", src, true, "Login erfolgreich")
            else
                TriggerClientEvent("heavenly:loginResult", src, false, "Falsches Passwort")
            end
        else
            TriggerClientEvent("heavenly:loginResult", src, false, "Username nicht gefunden")
        end
    end)
end)

-- Accounts auf Anfrage abrufen (dynamisch)
RegisterNetEvent("heavenly:getAccounts")
AddEventHandler("heavenly:getAccounts", function()
    local src = source

    -- Modular: AccountList Modul nutzen
    AccountList.getAccounts(function(usernames)
        TriggerClientEvent("heavenly:sendAccounts", src, usernames)
    end)
end)