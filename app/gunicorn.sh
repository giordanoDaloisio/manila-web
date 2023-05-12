#!/bin/bash

gunicorn --bind 0.0.0.0:5000 --chdir manila app:app -w 2 --timeout 120