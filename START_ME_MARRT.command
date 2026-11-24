#!/bin/zsh
# SPDX-License-Identifier: GPL-3.0-or-later
# AI-assisted launcher, edited to serve this folder on loopback only.
# Start the local web server from this project's own folder.
cd -- "${0:A:h}" || exit 1
printf '\nME-MARRT local server\nOpen http://localhost:8000/ in your browser.\nKeep this window open while using the artwork.\nPress Control+C here to stop.\n\n'
exec python3 -m http.server 8000 --bind 127.0.0.1
