local uiOpen = false

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
end

local function triggerServerCallback(name, cb, ...)
    ESX.TriggerServerCallback(name, function(result)
        cb(result)
    end, ...)
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