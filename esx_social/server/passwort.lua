-- password.lua
-- Verantwortlich für sicheres Hashing & Prüfung von Passwörtern

Password = {}

-- Passwort hashen (bei Registrierung)
function Password.hashPassword(plain)
    return ESX.GetPasswordHash(plain)
end

-- Passwort prüfen (bei Login)
function Password.verifyPassword(plain, hash)
    return ESX.VerifyPassword(plain, hash)
end

return Password