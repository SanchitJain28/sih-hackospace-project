# 🚀 5-Day Space Debris Detection System Roadmap 

(DAY 1)

Team Structure

## Frontend Team: 2 developers (F1, F2)
## Backend Developer: 1 developer (B1)
## AI/ML Engineer: 1 developer (AI1)


### 📅 DAY 1: Foundation & Setup
🎯 Frontend Team (F1 & F2)
Morning (4 hours):

F1: Project setup - (Already done)
F2: Research & experiment with CesiumJS basics - create simple Earth globe
Both: Define component structure and folder architecture

Afternoon (4 hours):

F1: Build basic dashboard layout with navigation, sidebar, main content area
F2: Integrate CesiumJS with ReactJs, create Earth component with basic camera controls
Both: Code review and merge initial components

### Deliverables: We have to complete these today

✅ RaectJS project with Tailwind setup
✅ Basic Earth visualization working
✅ Dashboard skeleton

⚙️ Backend Developer (B1)
Morning (4 hours):

Set up Express.js project with TypeScript
Research and test Celestrak API for TLE data
Set up MongoDB connection
Install and test satellite-js library

Afternoon (4 hours):

Create data fetcher for Celestrak TLE data
Build basic API endpoints structure (/api/debris, /api/spaceweather)
Test TLE parsing with satellite-js
Set up CORS and basic middleware

### Deliverables: We have to complete these today

✅ Express server running
✅ TLE data fetching working
✅ Basic API structure

🤖 AI/ML Engineer (AI1)
Morning (4 hours):

Research orbital mechanics and debris prediction algorithms
Study TLE format and satellite-js predictions
Set up Python environment with TensorFlow/PyTorch
Collect sample space weather data from NASA DONKI

Afternoon (4 hours):

Create data preprocessing pipeline for TLE data
Build basic orbital prediction using Keplerian elements
Test simple linear extrapolation model
Document data requirements

### Deliverables: We have to complete these today

✅ Python environment setup
✅ Basic orbital prediction script
✅ Data preprocessing pipeline