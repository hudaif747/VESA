#!/bin/sh

# Start the ArangoDB service
arangod --server.authentication false &

# Wait for ArangoDB to initialize
sleep 10

# Start the backend service
cd /app && npm start
