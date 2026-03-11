local function getIdentifier(src)
    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then
        return nil
    end

    return xPlayer.identifier
end

local function ensureProfileRow(identifier, cb)
    MySQL.Async.execute([[
        INSERT INTO heavenly_profiles (identifier, status, theme_json, avatar, cover, friends_json)
        VALUES (@identifier, '', '{}', NULL, NULL, '[]')
        ON DUPLICATE KEY UPDATE identifier = identifier
    ]], {
        ["@identifier"] = identifier
    }, function()
        if cb then cb() end
    end)
end

ESX.RegisterServerCallback("heavenly:getProfile", function(source, cb)
    local identifier = getIdentifier(source)

    if not identifier then
        cb({
            ok = false,
            message = "Kein Identifier gefunden"
        })
        return
    end

    ensureProfileRow(identifier, function()
        MySQL.Async.fetchAll([[
            SELECT status, theme_json, avatar, cover, friends_json
            FROM heavenly_profiles
            WHERE identifier = @identifier
            LIMIT 1
        ]], {
            ["@identifier"] = identifier
        }, function(rows)
            local row = rows and rows[1] or nil
            local theme = {}
            local friends = {}

            if row and row.theme_json and row.theme_json ~= "" then
                theme = json.decode(row.theme_json) or {}
            end

            if row and row.friends_json and row.friends_json ~= "" then
                friends = json.decode(row.friends_json) or {}
            end

            cb({
                ok = true,
                data = {
                    identifier = identifier,
                    status = row and row.status or "",
                    avatar = row and row.avatar or nil,
                    cover = row and row.cover or nil,
                    friends = friends,
                    settings = {
                        status = row and row.status or "",
                        homeProfileTheme = theme
                    }
                }
            })
        end)
    end)
end)

ESX.RegisterServerCallback("heavenly:saveStatus", function(source, cb, status)
    local identifier = getIdentifier(source)

    if not identifier then
        cb({
            ok = false,
            message = "Kein Identifier gefunden"
        })
        return
    end

    status = tostring(status or "")

    MySQL.Async.execute([[
        INSERT INTO heavenly_profiles (identifier, status)
        VALUES (@identifier, @status)
        ON DUPLICATE KEY UPDATE status = @status
    ]], {
        ["@identifier"] = identifier,
        ["@status"] = status
    }, function()
        cb({
            ok = true,
            message = "Status gespeichert"
        })
    end)
end)

ESX.RegisterServerCallback("heavenly:saveTheme", function(source, cb, theme)
    local identifier = getIdentifier(source)

    if not identifier then
        cb({
            ok = false,
            message = "Kein Identifier gefunden"
        })
        return
    end

    local themeJson = json.encode(theme or {})

    MySQL.Async.execute([[
        INSERT INTO heavenly_profiles (identifier, theme_json)
        VALUES (@identifier, @theme_json)
        ON DUPLICATE KEY UPDATE theme_json = @theme_json
    ]], {
        ["@identifier"] = identifier,
        ["@theme_json"] = themeJson
    }, function()
        cb({
            ok = true,
            message = "Theme gespeichert"
        })
    end)
end)

ESX.RegisterServerCallback("heavenly:setAvatar", function(source, cb, avatar)
    local identifier = getIdentifier(source)

    if not identifier then
        cb({
            ok = false,
            message = "Kein Identifier gefunden"
        })
        return
    end

    MySQL.Async.execute([[
        INSERT INTO heavenly_profiles (identifier, avatar)
        VALUES (@identifier, @avatar)
        ON DUPLICATE KEY UPDATE avatar = @avatar
    ]], {
        ["@identifier"] = identifier,
        ["@avatar"] = avatar
    }, function()
        cb({
            ok = true,
            message = "Profilbild gespeichert"
        })
    end)
end)

ESX.RegisterServerCallback("heavenly:getAvatar", function(source, cb)
    local identifier = getIdentifier(source)

    if not identifier then
        cb({
            ok = false,
            message = "Kein Identifier gefunden"
        })
        return
    end

    MySQL.Async.fetchScalar([[
        SELECT avatar
        FROM heavenly_profiles
        WHERE identifier = @identifier
        LIMIT 1
    ]], {
        ["@identifier"] = identifier
    }, function(avatar)
        cb({
            ok = true,
            data = avatar or nil
        })
    end)
end)

ESX.RegisterServerCallback("heavenly:setCover", function(source, cb, cover)
    local identifier = getIdentifier(source)

    if not identifier then
        cb({
            ok = false,
            message = "Kein Identifier gefunden"
        })
        return
    end

    MySQL.Async.execute([[
        INSERT INTO heavenly_profiles (identifier, cover)
        VALUES (@identifier, @cover)
        ON DUPLICATE KEY UPDATE cover = @cover
    ]], {
        ["@identifier"] = identifier,
        ["@cover"] = cover
    }, function()
        cb({
            ok = true,
            message = "Titelbild gespeichert"
        })
    end)
end)

ESX.RegisterServerCallback("heavenly:getCover", function(source, cb)
    local identifier = getIdentifier(source)

    if not identifier then
        cb({
            ok = false,
            message = "Kein Identifier gefunden"
        })
        return
    end

    MySQL.Async.fetchScalar([[
        SELECT cover
        FROM heavenly_profiles
        WHERE identifier = @identifier
        LIMIT 1
    ]], {
        ["@identifier"] = identifier
    }, function(cover)
        cb({
            ok = true,
            data = cover or nil
        })
    end)
end)

ESX.RegisterServerCallback("heavenly:getFriends", function(source, cb)
    local identifier = getIdentifier(source)

    if not identifier then
        cb({
            ok = false,
            message = "Kein Identifier gefunden"
        })
        return
    end

    MySQL.Async.fetchScalar([[
        SELECT friends_json
        FROM heavenly_profiles
        WHERE identifier = @identifier
        LIMIT 1
    ]], {
        ["@identifier"] = identifier
    }, function(friendsJson)
        local friends = {}

        if friendsJson and friendsJson ~= "" then
            friends = json.decode(friendsJson) or {}
        end

        cb({
            ok = true,
            data = friends
        })
    end)
end)

ESX.RegisterServerCallback("heavenly:setFriends", function(source, cb, friends)
    local identifier = getIdentifier(source)

    if not identifier then
        cb({
            ok = false,
            message = "Kein Identifier gefunden"
        })
        return
    end

    local friendsJson = json.encode(friends or {})

    MySQL.Async.execute([[
        INSERT INTO heavenly_profiles (identifier, friends_json)
        VALUES (@identifier, @friends_json)
        ON DUPLICATE KEY UPDATE friends_json = @friends_json
    ]], {
        ["@identifier"] = identifier,
        ["@friends_json"] = friendsJson
    }, function()
        cb({
            ok = true,
            message = "Freunde gespeichert"
        })
    end)
end)

ESX.RegisterServerCallback("heavenly:clearProfileData", function(source, cb)
    local identifier = getIdentifier(source)

    if not identifier then
        cb({
            ok = false,
            message = "Kein Identifier gefunden"
        })
        return
    end

    MySQL.Async.execute([[
        UPDATE heavenly_profiles
        SET status = '',
            theme_json = '{}',
            avatar = NULL,
            cover = NULL,
            friends_json = '[]'
        WHERE identifier = @identifier
    ]], {
        ["@identifier"] = identifier
    }, function()
        cb({
            ok = true,
            message = "Profil zurückgesetzt"
        })
    end)
end)