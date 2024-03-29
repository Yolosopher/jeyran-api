#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# sending dist folder
rsync -rvh ./dist yolo@yolosopher.online:/home/yolo/jeyran/api

# # sending package.json
# rsync -vh ./package.json yolo@yolosopher.online:/home/yolo/jeyran/api

# sending ecosystem.config.js
rsync -vh ./ecosystem.config.js yolo@yolosopher.online:/home/yolo/jeyran/api
