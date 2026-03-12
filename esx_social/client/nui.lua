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
    ESX.TriggerServerCallback("heavenly:getSession", function(result)
        cb(result)
    end)
end)

RegisterNUICallback("getProfile", function(data, cb)
    ESX.TriggerServerCallback("heavenly:getProfile", function(result)
        cb(result)
    end, data and data.username)
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
    end, data and data.username)
end)

RegisterNUICallback("setCover", function(data, cb)
    ESX.TriggerServerCallback("heavenly:setCover", function(result)
        cb(result)
    end, data and data.cover or nil)
end)

RegisterNUICallback("getCover", function(data, cb)
    ESX.TriggerServerCallback("heavenly:getCover", function(result)
        cb(result)
    end, data and data.username)
end)

RegisterNUICallback("getFriends", function(data, cb)
    ESX.TriggerServerCallback("heavenly:getFriends", function(result)
        cb(result)
    end, data and data.username)
end)

RegisterNUICallback("setFriends", function(data, cb)
    ESX.TriggerServerCallback("heavenly:setFriends", function(result)
        cb(result)
    end, data and data.friends or {})
end)

RegisterNUICallback("clearProfileData", function(_, cb)
    ESX.TriggerServerCallback("heavenly:clearProfileData", function(result)
        cb(result)
    end)
end)

RegisterNUICallback("register", function(data, cb)
    ESX.TriggerServerCallback("heavenly:register", function(result)
        cb(result)
    end,
        data and data.username,
        data and data.password,
        data and data.passwordRepeat
    )
end)

RegisterNUICallback("login", function(data, cb)
    ESX.TriggerServerCallback("heavenly:login", function(result)
        cb(result)
    end,
        data and data.username,
        data and data.password
    )
end)

RegisterNUICallback("logout", function(_, cb)
    ESX.TriggerServerCallback("heavenly:logout", function(result)
        cb(result)
    end)
end)

RegisterNUICallback("getAccounts", function(_, cb)
    ESX.TriggerServerCallback("heavenly:getAccounts", function(result)
        cb(result)
    end)
end)

RegisterNUICallback("deleteAccount", function(_, cb)
    ESX.TriggerServerCallback("heavenly:deleteAccount", function(result)
        cb(result)
    end)
end)