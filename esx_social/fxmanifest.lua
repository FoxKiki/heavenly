fx_version 'cerulean'
game 'gta5'

description 'Heavenly Social Network for ESX'
author 'Kiki Fox'
version '1.0.0'

lua54 'yes'

shared_script '@es_extended/imports.lua'

server_scripts {
    '@mysql-async/lib/MySQL.lua',
    'server/passwort.lua',
    'server/account_list.lua',
    'server/server.lua',
    'server/api.lua'
}

client_scripts {
    'client/client.lua',
    'client/nui.lua',
    'client/lb_tablet.lua'
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/css/*.css',
    'html/js/*.js',
    'html/assets/**/*'
}

dependencies {
    'es_extended',
    'mysql-async'
}