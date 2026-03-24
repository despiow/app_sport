#!/bin/sh
# Démarrer le serveur API Node en arrière-plan
node /app/server/index.js &

# Démarrer nginx au premier plan (PID 1)
exec nginx -g "daemon off;"
