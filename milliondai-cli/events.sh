#!/usr/bin/env bash

# Run like ./events.sh [from block number] [to block number]

node index.js config.json events $1 $2
