local uiOpen = false
local pushHeavenlyClock

local function hasLbTablet()
    return GetResourceState("lb-tablet") == "started"
end

local function setUi(state, payload)
    uiOpen = state

    SetNuiFocus(state, state)
    SetNuiFocusKeepInput(false)

    SendNUIMessage({
        action = state and "open" or "close",
        payload = payload or {}
    })

    if state then
        pushHeavenlyClock()
    end
end

local function triggerServerCallback(name, cb, ...)
    ESX.TriggerServerCallback(name, function(result)
        cb(result)
    end, ...)
end

local function getHeavenlyClockTimestamp()
    local year = GetClockYear()
    local month = GetClockMonth() + 1
    local day = GetClockDayOfMonth()
    local hour = GetClockHours()
    local minute = GetClockMinutes()
    local second = GetClockSeconds()

    return os.time({
        year = year,
        month = month,
        day = day,
        hour = hour,
        min = minute,
        sec = second
    }) * 1000
end

pushHeavenlyClock = function()
    SendNUIMessage({
        action = "heavenly:setClock",
        mode = "server",
        serverTime = getHeavenlyClockTimestamp()
    })
end

RegisterCommand("heavenly", function()
    if hasLbTablet() then
        return
    end

    setUi(not uiOpen, {})
end, false)

RegisterKeyMapping("heavenly", "Open Heavenly Tablet", "keyboard", "F7")

RegisterNUICallback("closeUi", function(_, cb)
    setUi(false)
    cb({ ok = true })
end)

RegisterNUICallback("ping", function(_, cb)
    cb({
        ok = true,
        message = "pong from client"
    })
end)

RegisterNUICallback("getSession", function(_, cb)
    triggerServerCallback("heavenly:getSession", cb)
end)

RegisterNUICallback("getProfile", function(data, cb)
    triggerServerCallback("heavenly:getProfile", cb, data and data.username)
end)

RegisterNUICallback("saveStatus", function(data, cb)
    triggerServerCallback("heavenly:saveStatus", cb, data and data.status or "")
end)

RegisterNUICallback("saveTheme", function(data, cb)
    triggerServerCallback("heavenly:saveTheme", cb, data and data.theme or {})
end)

RegisterNUICallback("setAvatar", function(data, cb)
    triggerServerCallback("heavenly:setAvatar", cb, data and data.avatar or nil)
end)

RegisterNUICallback("getAvatar", function(data, cb)
    triggerServerCallback("heavenly:getAvatar", cb, data and data.username)
end)

RegisterNUICallback("setCover", function(data, cb)
    triggerServerCallback("heavenly:setCover", cb, data and data.cover or nil)
end)

RegisterNUICallback("getCover", function(data, cb)
    triggerServerCallback("heavenly:getCover", cb, data and data.username)
end)

RegisterNUICallback("getFriends", function(data, cb)
    triggerServerCallback("heavenly:getFriends", cb, data and data.username)
end)

RegisterNUICallback("setFriends", function(data, cb)
    triggerServerCallback("heavenly:setFriends", cb, data and data.friends or {})
end)

RegisterNUICallback("clearProfileData", function(_, cb)
    triggerServerCallback("heavenly:clearProfileData", cb)
end)

RegisterNUICallback("register", function(data, cb)
    triggerServerCallback(
        "heavenly:register",
        cb,
        data and data.username,
        data and data.password,
        data and data.passwordRepeat
    )
end)

RegisterNUICallback("login", function(data, cb)
    triggerServerCallback(
        "heavenly:login",
        cb,
        data and data.username,
        data and data.password
    )
end)

RegisterNUICallback("logout", function(_, cb)
    triggerServerCallback("heavenly:logout", cb)
end)

RegisterNUICallback("getAccounts", function(_, cb)
    triggerServerCallback("heavenly:getAccounts", cb)
end)

RegisterNUICallback("deleteAccount", function(_, cb)
    triggerServerCallback("heavenly:deleteAccount", cb)
end)

RegisterNUICallback("getNews", function(_, cb)
    triggerServerCallback("heavenly:getNews", cb)
end)

RegisterNUICallback("createNews", function(data, cb)
    triggerServerCallback("heavenly:createNews", cb, data or {})
end)

RegisterNUICallback("updateNews", function(data, cb)
    triggerServerCallback("heavenly:updateNews", cb, data and data.id, data or {})
end)

RegisterNUICallback("deleteNews", function(data, cb)
    triggerServerCallback("heavenly:deleteNews", cb, data and data.id)
end)

RegisterNUICallback("getPosts", function(data, cb)
    triggerServerCallback("heavenly:getPosts", cb, data and data.feedType, data and data.profileOwner)
end)

RegisterNUICallback("createPost", function(data, cb)
    triggerServerCallback("heavenly:createPost", cb, data or {})
end)

RegisterNUICallback("editPost", function(data, cb)
    triggerServerCallback("heavenly:editPost", cb, data and data.postId, data and data.text)
end)

RegisterNUICallback("deletePost", function(data, cb)
    triggerServerCallback("heavenly:deletePost", cb, data and data.postId)
end)

RegisterNUICallback("togglePostLike", function(data, cb)
    triggerServerCallback("heavenly:togglePostLike", cb, data and data.postId)
end)

RegisterNUICallback("addComment", function(data, cb)
    triggerServerCallback("heavenly:addComment", cb, data and data.postId, data or {})
end)

RegisterNUICallback("editComment", function(data, cb)
    triggerServerCallback("heavenly:editComment", cb, data and data.postId, data and data.commentId, data and data.text)
end)

RegisterNUICallback("deleteComment", function(data, cb)
    triggerServerCallback("heavenly:deleteComment", cb, data and data.postId, data and data.commentId)
end)

RegisterNUICallback("toggleCommentLike", function(data, cb)
    triggerServerCallback("heavenly:toggleCommentLike", cb, data and data.postId, data and data.commentId)
end)

CreateThread(function()
    while true do
        if uiOpen then
            pushHeavenlyClock()
            Wait(1000)
        else
            Wait(1500)
        end
    end
end)
