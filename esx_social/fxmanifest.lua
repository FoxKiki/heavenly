fx_version 'cerulean'
game 'gta5'

description 'Heavenly Social Network for ESX'
author 'Kiki Fox'
version '1.0.0'

lua54 'yes'

shared_script '@es_extended/imports.lua'

server_scripts {
    '@mysql-async/lib/MySQL.lua',
    'passwort.lua',
    'account_list.lua',
    'server.lua',
    'server/api.lua'
}

client_scripts {
    'client.lua',
    'client/nui.lua',
    'client/lb_tablet.lua'
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/*.png',
    'html/*.jpg',
    'html/*.jpeg',
    'html/*.webp',
    'html/assets/**/*',
    'html/css/**/*.css',
    'html/js/**/*.js'
}

dependencies {
    'es_extended',
    'mysql-async'
}
