local function normalizeUsername(username)
    return tostring(username or ""):gsub("^%s+", ""):gsub("%s+$", "")
end

local function getPlayerJobName(source)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or not xPlayer.job or not xPlayer.job.name then
        return ""
    end

    return tostring(xPlayer.job.name)
end

local function getPlayerJobGradeName(source)
    local xPlayer = ESX.GetPlayerFromId(source)
    if not xPlayer or not xPlayer.job then
        return ""
    end

    if xPlayer.job.grade_name then
        return tostring(xPlayer.job.grade_name)
    end

    if xPlayer.job.grade_label then
        return tostring(xPlayer.job.grade_label)
    end

    return ""
end

local function jobMatches(list, jobName)
    jobName = tostring(jobName or ""):lower()
    if jobName == "" then
        return false
    end

    for _, allowedJob in ipairs(list or {}) do
        if jobName == tostring(allowedJob or ""):lower() then
            return true
        end
    end

    return false
end

local function canCreateNews(source)
    return jobMatches(Config and Config.NewsJobs or {}, getPlayerJobName(source))
end

local function canManageAllNews(source)
    if jobMatches(Config and Config.NewsManagerJobs or {}, getPlayerJobName(source)) then
        return true
    end

    return jobMatches(Config and Config.NewsManagerGrades or {}, getPlayerJobGradeName(source))
end

local function buildNewsPermissions(source, sessionUsername)
    return {
        canCreate = canCreateNews(source),
        canManageAll = canManageAllNews(source),
        sessionUsername = sessionUsername or ""
    }
end

local function getSessionUsername(source)
    return HeavenlySessions and HeavenlySessions[source] or nil
end

local function findAccountByUsername(username, cb)
    local cleanUsername = normalizeUsername(username)

    if cleanUsername == "" then
        cb(nil)
        return
    end

    MySQL.Async.fetchAll([[
        SELECT identifier, username
        FROM heavenly_accounts
        WHERE LOWER(username) = LOWER(@username)
        LIMIT 1
    ]], {
        ["@username"] = cleanUsername
    }, function(rows)
        cb(rows and rows[1] or nil)
    end)
end

local function ensureProfileRow(identifier, cb)
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

local function fetchProfileByIdentifier(identifier, createIfMissing, cb)
    local function readProfile()
        MySQL.Async.fetchAll([[
            SELECT status, theme_json, avatar, cover, friends_json
            FROM heavenly_profiles
            WHERE identifier = @identifier
            LIMIT 1
        ]], {
            ["@identifier"] = identifier
        }, function(rows)
            cb(rows and rows[1] or nil)
        end)
    end

    if createIfMissing then
        ensureProfileRow(identifier, readProfile)
        return
    end

    readProfile()
end

local function parseJsonObject(value)
    if not value or value == "" then
        return {}
    end

    local ok, decoded = pcall(json.decode, value)
    if not ok or type(decoded) ~= "table" then
        return {}
    end

    return decoded
end

local function parseJsonArray(value)
    return parseJsonObject(value)
end

local function buildProfileResponse(username, row)
    local theme = row and parseJsonObject(row.theme_json) or {}
    local friends = row and parseJsonArray(row.friends_json) or {}
    local status = row and row.status or ""

    return {
        ok = true,
        data = {
            username = username,
            status = status,
            avatar = row and row.avatar or nil,
            cover = row and row.cover or nil,
            friends = friends,
            settings = {
                status = status,
                homeProfileTheme = theme
            }
        }
    }
end

local function withTargetAccount(source, requestedUsername, options, cb)
    local sessionUsername = getSessionUsername(source)
    local targetUsername = normalizeUsername(requestedUsername)

    if targetUsername == "" then
        targetUsername = normalizeUsername(sessionUsername)
    end

    if targetUsername == "" then
        cb(nil, nil, "Nicht eingeloggt")
        return
    end

    if options and options.mustMatchSession then
        if not sessionUsername or targetUsername:lower() ~= normalizeUsername(sessionUsername):lower() then
            cb(nil, nil, "Keine Berechtigung")
            return
        end
    end

    findAccountByUsername(targetUsername, function(account)
        if not account then
            cb(nil, nil, "Account nicht gefunden")
            return
        end

        cb(account, sessionUsername, nil)
    end)
end

ESX.RegisterServerCallback("heavenly:getProfile", function(source, cb, username)
    withTargetAccount(source, username, { mustMatchSession = false }, function(account, sessionUsername, err)
        if err then
            cb({ ok = false, message = err })
            return
        end

        local createIfMissing = sessionUsername
            and normalizeUsername(account.username):lower() == normalizeUsername(sessionUsername):lower()

        fetchProfileByIdentifier(account.identifier, createIfMissing, function(row)
            cb(buildProfileResponse(account.username, row))
        end)
    end)
end)

ESX.RegisterServerCallback("heavenly:saveStatus", function(source, cb, status)
    withTargetAccount(source, nil, { mustMatchSession = true }, function(account, _, err)
        if err then
            cb({ ok = false, message = err })
            return
        end

        MySQL.Async.execute([[
            INSERT INTO heavenly_profiles (identifier, status)
            VALUES (@identifier, @status)
            ON DUPLICATE KEY UPDATE status = @status
        ]], {
            ["@identifier"] = account.identifier,
            ["@status"] = tostring(status or "")
        }, function()
            cb({ ok = true, data = { status = tostring(status or "") } })
        end)
    end)
end)

ESX.RegisterServerCallback("heavenly:saveTheme", function(source, cb, theme)
    withTargetAccount(source, nil, { mustMatchSession = true }, function(account, _, err)
        if err then
            cb({ ok = false, message = err })
            return
        end

        MySQL.Async.execute([[
            INSERT INTO heavenly_profiles (identifier, theme_json)
            VALUES (@identifier, @theme_json)
            ON DUPLICATE KEY UPDATE theme_json = @theme_json
        ]], {
            ["@identifier"] = account.identifier,
            ["@theme_json"] = json.encode(theme or {})
        }, function()
            cb({ ok = true, data = theme or {} })
        end)
    end)
end)

ESX.RegisterServerCallback("heavenly:setAvatar", function(source, cb, avatar)
    withTargetAccount(source, nil, { mustMatchSession = true }, function(account, _, err)
        if err then
            cb({ ok = false, message = err })
            return
        end

        MySQL.Async.execute([[
            INSERT INTO heavenly_profiles (identifier, avatar)
            VALUES (@identifier, @avatar)
            ON DUPLICATE KEY UPDATE avatar = @avatar
        ]], {
            ["@identifier"] = account.identifier,
            ["@avatar"] = avatar
        }, function()
            cb({ ok = true, data = avatar or nil })
        end)
    end)
end)

ESX.RegisterServerCallback("heavenly:getAvatar", function(source, cb, username)
    withTargetAccount(source, username, { mustMatchSession = false }, function(account, _, err)
        if err then
            cb({ ok = false, message = err })
            return
        end

        fetchProfileByIdentifier(account.identifier, false, function(row)
            cb({ ok = true, data = row and row.avatar or nil })
        end)
    end)
end)

ESX.RegisterServerCallback("heavenly:setCover", function(source, cb, cover)
    withTargetAccount(source, nil, { mustMatchSession = true }, function(account, _, err)
        if err then
            cb({ ok = false, message = err })
            return
        end

        MySQL.Async.execute([[
            INSERT INTO heavenly_profiles (identifier, cover)
            VALUES (@identifier, @cover)
            ON DUPLICATE KEY UPDATE cover = @cover
        ]], {
            ["@identifier"] = account.identifier,
            ["@cover"] = cover
        }, function()
            cb({ ok = true, data = cover or nil })
        end)
    end)
end)

ESX.RegisterServerCallback("heavenly:getCover", function(source, cb, username)
    withTargetAccount(source, username, { mustMatchSession = false }, function(account, _, err)
        if err then
            cb({ ok = false, message = err })
            return
        end

        fetchProfileByIdentifier(account.identifier, false, function(row)
            cb({ ok = true, data = row and row.cover or nil })
        end)
    end)
end)

ESX.RegisterServerCallback("heavenly:getFriends", function(source, cb, username)
    withTargetAccount(source, username, { mustMatchSession = false }, function(account, _, err)
        if err then
            cb({ ok = false, message = err })
            return
        end

        fetchProfileByIdentifier(account.identifier, false, function(row)
            cb({ ok = true, data = row and parseJsonArray(row.friends_json) or {} })
        end)
    end)
end)

ESX.RegisterServerCallback("heavenly:setFriends", function(source, cb, friends)
    withTargetAccount(source, nil, { mustMatchSession = true }, function(account, _, err)
        if err then
            cb({ ok = false, message = err })
            return
        end

        MySQL.Async.execute([[
            INSERT INTO heavenly_profiles (identifier, friends_json)
            VALUES (@identifier, @friends_json)
            ON DUPLICATE KEY UPDATE friends_json = @friends_json
        ]], {
            ["@identifier"] = account.identifier,
            ["@friends_json"] = json.encode(friends or {})
        }, function()
            cb({ ok = true, data = friends or {} })
        end)
    end)
end)

ESX.RegisterServerCallback("heavenly:clearProfileData", function(source, cb)
    withTargetAccount(source, nil, { mustMatchSession = true }, function(account, _, err)
        if err then
            cb({ ok = false, message = err })
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
            ["@identifier"] = account.identifier
        }, function()
            cb({ ok = true, data = { cleared = true } })
        end)
    end)
end)

ESX.RegisterServerCallback("heavenly:getNews", function(source, cb)
    local sessionUsername = getSessionUsername(source) or ""

    MySQL.Async.fetchAll([[
        SELECT id, author_identifier, author_username, title, content, category, created_at, updated_at
        FROM heavenly_news
        ORDER BY created_at DESC, id DESC
    ]], {}, function(rows)
        local items = {}

        for _, row in ipairs(rows or {}) do
            local authorUsername = row.author_username or "Unbekannt"
            local isAuthor = sessionUsername ~= ""
                and normalizeUsername(authorUsername):lower() == normalizeUsername(sessionUsername):lower()

            items[#items + 1] = {
                id = row.id,
                authorUsername = authorUsername,
                title = row.title or "",
                content = row.content or "",
                category = row.category or "Allgemein",
                createdAt = row.created_at,
                updatedAt = row.updated_at,
                canEdit = isAuthor or canManageAllNews(source),
                canDelete = isAuthor or canManageAllNews(source)
            }
        end

        cb({
            ok = true,
            data = {
                items = items,
                permissions = buildNewsPermissions(source, sessionUsername)
            }
        })
    end)
end)

ESX.RegisterServerCallback("heavenly:createNews", function(source, cb, payload)
    if not canCreateNews(source) then
        cb({ ok = false, message = "Dein Job darf keine News erstellen" })
        return
    end

    withTargetAccount(source, nil, { mustMatchSession = true }, function(account, sessionUsername, err)
        if err then
            cb({ ok = false, message = err })
            return
        end

        local title = normalizeUsername(payload and payload.title or "")
        local content = tostring(payload and payload.content or ""):gsub("^%s+", ""):gsub("%s+$", "")
        local category = normalizeUsername(payload and payload.category or "Allgemein")

        if title == "" or content == "" then
            cb({ ok = false, message = "Titel und Inhalt sind erforderlich" })
            return
        end

        MySQL.Async.insert([[
            INSERT INTO heavenly_news (author_identifier, author_username, title, content, category)
            VALUES (@author_identifier, @author_username, @title, @content, @category)
        ]], {
            ["@author_identifier"] = account.identifier,
            ["@author_username"] = sessionUsername or account.username,
            ["@title"] = title,
            ["@content"] = content,
            ["@category"] = category ~= "" and category or "Allgemein"
        }, function(insertId)
            cb({
                ok = true,
                data = {
                    id = insertId
                }
            })
        end)
    end)
end)

ESX.RegisterServerCallback("heavenly:updateNews", function(source, cb, newsId, payload)
    local id = tonumber(newsId)
    if not id then
        cb({ ok = false, message = "Ungültige News-ID" })
        return
    end

    withTargetAccount(source, nil, { mustMatchSession = true }, function(account, sessionUsername, err)
        if err then
            cb({ ok = false, message = err })
            return
        end

        MySQL.Async.fetchAll([[
            SELECT id, author_identifier, author_username
            FROM heavenly_news
            WHERE id = @id
            LIMIT 1
        ]], {
            ["@id"] = id
        }, function(rows)
            local row = rows and rows[1] or nil
            if not row then
                cb({ ok = false, message = "News nicht gefunden" })
                return
            end

            local isAuthor = normalizeUsername(row.author_username):lower() == normalizeUsername(sessionUsername):lower()
                or tostring(row.author_identifier or "") == tostring(account.identifier or "")

            if not isAuthor and not canManageAllNews(source) then
                cb({ ok = false, message = "Keine Berechtigung zum Bearbeiten" })
                return
            end

            local title = normalizeUsername(payload and payload.title or "")
            local content = tostring(payload and payload.content or ""):gsub("^%s+", ""):gsub("%s+$", "")
            local category = normalizeUsername(payload and payload.category or "Allgemein")

            if title == "" or content == "" then
                cb({ ok = false, message = "Titel und Inhalt sind erforderlich" })
                return
            end

            MySQL.Async.execute([[
                UPDATE heavenly_news
                SET title = @title,
                    content = @content,
                    category = @category
                WHERE id = @id
            ]], {
                ["@id"] = id,
                ["@title"] = title,
                ["@content"] = content,
                ["@category"] = category ~= "" and category or "Allgemein"
            }, function()
                cb({ ok = true, data = { id = id, updated = true } })
            end)
        end)
    end)
end)

ESX.RegisterServerCallback("heavenly:deleteNews", function(source, cb, newsId)
    local id = tonumber(newsId)
    if not id then
        cb({ ok = false, message = "Ungültige News-ID" })
        return
    end

    withTargetAccount(source, nil, { mustMatchSession = true }, function(account, sessionUsername, err)
        if err then
            cb({ ok = false, message = err })
            return
        end

        MySQL.Async.fetchAll([[
            SELECT id, author_identifier, author_username
            FROM heavenly_news
            WHERE id = @id
            LIMIT 1
        ]], {
            ["@id"] = id
        }, function(rows)
            local row = rows and rows[1] or nil
            if not row then
                cb({ ok = false, message = "News nicht gefunden" })
                return
            end

            local isAuthor = normalizeUsername(row.author_username):lower() == normalizeUsername(sessionUsername):lower()
                or tostring(row.author_identifier or "") == tostring(account.identifier or "")

            if not isAuthor and not canManageAllNews(source) then
                cb({ ok = false, message = "Keine Berechtigung zum Löschen" })
                return
            end

            MySQL.Async.execute([[
                DELETE FROM heavenly_news
                WHERE id = @id
            ]], {
                ["@id"] = id
            }, function()
                cb({ ok = true, data = { id = id, deleted = true } })
            end)
        end)
    end)
end)
