-- account_list.lua
-- Verantwortlich für Account-Listen und Datenbank-Operationen

AccountList = {}

-- Alle Usernamen abrufen (für Freunde-Liste oder ähnlich)
function AccountList.getAccounts(callback)
    MySQL.query('SELECT username FROM heavenly_accounts', {}, function(result)
        local usernames = {}
        for _, row in ipairs(result) do
            table.insert(usernames, row.username)
        end
        callback(usernames)
    end)
end

return AccountList