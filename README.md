#MediaIQ
MediaIQ is an intelligent data processing and visualization platform. It leverages a Next.js frontend for a seamless user experience and a Python-powered backend to handle data ingestion, intelligence gathering, and vector-based storage.

## Features
Intelligence Engine: Advanced data processing via intelligence.py.

Vector Search: Efficient document retrieval using vector_store.py.

Automated Ingestion: Streamlined data pipeline with ingest.py.

Modern UI: Built with Next.js, Tailwind CSS, and TypeScript.

Real-time Monitoring: Integrated pulse checks via pulse.py.

## Tech Stack
Frontend: Next.js (App/Pages router), TypeScript, Tailwind CSS.

Backend: Python (FastAPI/Flask-style logic), LangChain/LlamaIndex (inferred).

Styling: PostCSS & Tailwind.

Environment: Node.js & Python 3.x.

## Project Structure
Plaintext
├── components/          # Reusable React components
├── pages/               # Next.js pages and API routes
├── styles/              # Global CSS and Tailwind styles
├── ingest.py            # Script for data loading/preprocessing
├── intelligence.py      # Core AI/Logic processing
├── vector_store.py      # Vector database management
├── main.py              # Backend entry point
├── middleware.py        # Python/Next.js middleware logic
├── pulse.py             # Health monitoring or heartbeat script
└── start_all.sh         # Shell script to boot both services
## Getting Started
Prerequisites
Node.js (v18+ recommended)

Python (3.9+ recommended)

Package managers: npm or yarn and pip

Installation
Clone the repository:

Bash
git clone https://github.com/mariamneffeti/MediaIQ.git
cd MediaIQ
Install Frontend Dependencies:

Bash
npm install
Install Backend Dependencies:

Bash
pip install -r requirements.txt
# or if using poetry
poetry install
Running the Application
You can use the provided shell script to start both the frontend and backend services simultaneously:

Bash
chmod +x start_all.sh
./start_all.sh
Alternatively, run them in separate terminals:

Frontend: npm run dev

Backend: python main.py

##⚙️ Configuration
Ensure you create a .env file in the root directory to manage your environment variables (API keys, Database URLs, etc.). Refer to constants.py for required keys.

##🤝 Contributors
mariam neffeti
yahya dahouathi
mariam cherif
rayen trabelsi
