#!/bin/bash

echo "Stopping Python FastAPI server (uvicorn)..."
pkill -f "uvicorn src.api.main:app"
sleep 1
if pgrep -f "uvicorn src.api.main:app" > /dev/null; then
  echo "? FastAPI server is still running!"
else
  echo "? FastAPI server stopped."
fi

echo "Stopping Java Backend..."
pkill -f "java -jar"
sleep 1
if pgrep -f "java -jar" > /dev/null; then
  echo "? Java backend is still running!"
else
  echo "? Java backend stopped."
fi

echo "Stopping React Frontend..."
pkill -f "node.*react-scripts"
sleep 1
if pgrep -f "react-scripts start" > /dev/null; then
  echo "? React frontend is still running!"
else
  echo "? React frontend stopped."
fi

echo "?? All stop commands executed."
