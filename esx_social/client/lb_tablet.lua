-- warten bis lb-tablet gestartet ist
CreateThread(function()
    while GetResourceState("lb-tablet") ~= "started" do
        Wait(500)
    end

    exports["lb-tablet"]:AddApp({
        identifier = "heavenly",
        name = "Heavenly",
        description = "Heavenly Social Network",
        developer = "Kiki Fox",
        defaultApp = false,
        size = 59812,
        icon = "https://cfx-nui-esx_social/html/assets/logos/heavenlylogo.png"
    })
end)
