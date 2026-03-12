-- Heavenly Client Script
-- Currently unused but reserved for future features

RegisterNetEvent("heavenly:open")
AddEventHandler("heavenly:open", function()

    SetNuiFocus(true, true)

    SendNUIMessage({
        action = "open"
    })

end)