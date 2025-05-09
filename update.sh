#!/bin/bash

# رفع التعديلات على main
git add .
git commit -m "Update code"
git push origin main


npm run deploy
