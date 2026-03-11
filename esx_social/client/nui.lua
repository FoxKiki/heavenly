local uiOpen = false

local function setUi(state, payload)
    uiOpen = state

    SetNuiFocus(state, state)
    SetNuiFocusKeepInput(false)

    SendNUIMessage({
        action = state and "open" or "close",
        payload = payload or {}
    })
end

RegisterCommand("heavenly", function()
    local playerData = ESX.GetPlayerData()
    local username = nil

    if playerData and playerData.name then
        username = playerData.name
    end

    setUi(not uiOpen, {
        username = username
    })
end, false)

RegisterKeyMapping("heavenly", "Open Heavenly Tablet", "keyboard", "F7")

RegisterNUICallback("closeUi", function(data, cb)
    setUi(false)
    cb({ ok = true })
end)

RegisterNUICallback("ping", function(data, cb)
    cb({
        ok = true,
        message = "pong from client"
    })
end)

RegisterNUICallback("getSession", function(data, cb)
    local playerData = ESX.GetPlayerData()
    local username = nil

    if playerData and playerData.name then
        username = playerData.name
    end

    cb({
        ok = true,
        username = username
    })
end)

RegisterNUICallback("getProfile", function(data, cb)
    ESX.TriggerServerCallback("heavenly:getProfile", function(result)
        cb(result)
    end)
end)

RegisterNUICallback("saveStatus", function(data, cb)
    ESX.TriggerServerCallback("heavenly:saveStatus", function(result)
        cb(result)
    end, data and data.status or "")
end)

RegisterNUICallback("saveTheme", function(data, cb)
    ESX.TriggerServerCallback("heavenly:saveTheme", function(result)
        cb(result)
    end, data and data.theme or {})
end)

RegisterNUICallback("setAvatar", function(data, cb)
    ESX.TriggerServerCallback("heavenly:setAvatar", function(result)
        cb(result)
    end, data and data.avatar or nil)
end)

RegisterNUICallback("getAvatar", function(data, cb)
    ESX.TriggerServerCallback("heavenly:getAvatar", function(result)
        cb(result)
    end)
end)

RegisterNUICallback("setCover", function(data, cb)
    ESX.TriggerServerCallback("heavenly:setCover", function(result)
        cb(result)
    end, data and data.cover or nil)
end)

RegisterNUICallback("getCover", function(data, cb)
    ESX.TriggerServerCallback("heavenly:getCover", function(result)
        cb(result)
    end)
end)

RegisterNUICallback("getFriends", function(data, cb)
    ESX.TriggerServerCallback("heavenly:getFriends", function(result)
        cb(result)
    end)
end)

RegisterNUICallback("setFriends", function(data, cb)
    ESX.TriggerServerCallback("heavenly:setFriends", function(result)
        cb(result)
    end, data and data.friends or {})
end)

RegisterNUICallback("clearProfileData", function(data, cb)
    ESX.TriggerServerCallback("heavenly:clearProfileData", function(result)
        cb(result)
    end)
end)