#!/bin/bash
# In ~/.bashrc or activate script
export HF_HOME=/presales/hf_cache
export TRANSFORMERS_CACHE=/presales/transformers_cache
export TORCH_HOME=/presales/torch_cache
export TMPDIR=/presales/npm-tmp
# Set up path to your custom SQLite build
export LD_LIBRARY_PATH="/presales/sqlite-autoconf-3390400/.libs:$LD_LIBRARY_PATH"
export PATH="/presales/sqlite-autoconf-3390400:$PATH"

# Activate Python virtual environment
source /presales/RFP_Cruncher/Python_Backend/rfp_venv/bin/activate

cd /presales/RFP_Cruncher/Python_Backend

# Run Python FastAPI backend using uvicorn in background
nohup uvicorn src.api.main:app --host 0.0.0.0 --port 8000 > /presales/RFP_Cruncher/Python_Backend/logs/python_backend.log 2>&1 &

# Load Java environment
source /presales/RFP_Cruncher/Java_Backend/.env

# Run Java JAR backend in background
nohup java -jar /presales/RFP_Cruncher/Java_Backend/RFP_Cruncher.jar > /presales/RFP_Cruncher/Java_Backend/logs/java_backend.log 2>&1 &

# Set correct Node.js version using NVM (optional, if using NVM)
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 18

# Run React frontend in background
cd /presales/RFP_Cruncher/Frontend
nohup npm start -- --host 0.0.0.0 > /presales/RFP_Cruncher/Frontend/logs/frontend.log 2>&1 &
