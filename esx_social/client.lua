-- Accounts dynamisch abrufen
RegisterNUICallback("requestAccounts", function(_, cb)
    TriggerServerEvent("heavenly:getAccounts")
    cb("ok")
end)

RegisterNUICallback("register", function(data, cb)
    if data and data.username and data.password then
        TriggerServerEvent("heavenly:register", data.username, data.password)
    end
    cb("ok")
end)

RegisterNUICallback("login", function(data, cb)
    if data and data.username and data.password then
        TriggerServerEvent("heavenly:login", data.username, data.password)
    end
    cb("ok")
end)

RegisterNetEvent("heavenly:sendAccounts")
AddEventHandler("heavenly:sendAccounts", function(usernames)
    SendNUIMessage({
        action = "updateAccounts",
        accounts = usernames
    })
end)

RegisterNetEvent("heavenly:registerResult")
AddEventHandler("heavenly:registerResult", function(success, message)
    SendNUIMessage({
        action = "registerResult",
        success = success,
        message = message
    })
end)

RegisterNetEvent("heavenly:loginResult")
AddEventHandler("heavenly:loginResult", function(success, message)
    SendNUIMessage({
        action = "loginResult",
        success = success,
        message = message
    })
end)

SendNUIMessage({
    action = "heavenly:setClock",
    mode = "server",
    serverTime = os.time() * 1000
})