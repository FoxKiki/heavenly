local appRegistered = false

local function hasLbTablet()
    return GetResourceState("lb-tablet") == "started"
end

local function registerTabletApp()
    if appRegistered or not hasLbTablet() then
        return
    end

    local resourceName = GetCurrentResourceName()
    local iconUrl = ("https://cfx-nui-%s/html/assets/logos/heavenlylogo.png"):format(resourceName)

    exports["lb-tablet"]:AddCustomApp({
        identifier = "heavenly",
        name = "Heavenly",
        description = "Social feed for your ESX characters",
        developer = "Kiki Fox",
        defaultApp = false,
        size = 1048576,
        ui = "html/index.html",
        icon = iconUrl
    })

    appRegistered = true
end

AddEventHandler("onClientResourceStart", function(resourceName)
    if resourceName == "lb-tablet" or resourceName == GetCurrentResourceName() then
        CreateThread(function()
            Wait(500)
            registerTabletApp()
        end)
    end
end)
