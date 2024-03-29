#!/bin/zsh

# Exit immediately if a command exits with a non-zero status
set -e

# sending dist folder
# rsync -rvh ./dist yolo@api.yolosopher.online:/home/yolo/jeyran/api

# sending ecosystem.config.js
# rsync -vh ./ecosystem.config.js yolo@api.yolosopher.online:/home/yolo/jeyran/api

# sending .env
rsync -vh ./.env yolo@api.yolosopher.online:/home/yolo/jeyran/api
