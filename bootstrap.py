import os
import subprocess
import sys
import time
import threading

def run_db_setup():
    print("=== Step 1: Bootstrapping Database ===")
    # Run the database verification script inside backend virtualenv
    python_exe = os.path.join("backend", ".venv", "Scripts", "python.exe")
    if not os.path.exists(python_exe):
        python_exe = "python" # Fallback to global python
        
    db_script = os.path.join("backend", "verify_db.py")
    res = subprocess.run([python_exe, db_script])
    if res.returncode != 0:
        print("Database setup failed. Please make sure PostgreSQL is running.")
        sys.exit(1)
    print("Database setup verified successfully.")

def start_backend():
    print("=== Step 2: Starting FastAPI Backend ===")
    python_exe = os.path.join("backend", ".venv", "Scripts", "python.exe")
    if not os.path.exists(python_exe):
        python_exe = "python"
        
    run_script = os.path.join("backend", "run.py")
    
    # We will run this in a non-blocking subprocess
    p = subprocess.Popen([python_exe, run_script])
    return p

def start_frontend():
    print("=== Step 3: Starting React Frontend ===")
    # Run npm run dev in frontend directory
    # On Windows, we need shell=True to execute npm script wrapper
    p = subprocess.Popen(["npm", "run", "dev"], cwd="frontend", shell=True)
    return p

def main():
    # Make sure we are in the correct root directory
    root_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root_dir)
    
    run_db_setup()
    
    backend_proc = start_backend()
    time.sleep(2) # Give backend a moment to start
    
    frontend_proc = start_frontend()
    
    print("\n==============================================")
    print("🎉 SuperDocs Analyst System successfully booted!")
    print("FastAPI Backend: http://127.0.0.1:8000")
    print("React Frontend:  http://localhost:5173 (standard Vite port)")
    print("==============================================\n")
    print("Press Ctrl+C to terminate both processes.")
    
    try:
        # Keep main thread alive and monitor processes
        while True:
            if backend_proc.poll() is not None:
                print("Backend server stopped unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("Frontend server stopped unexpectedly.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down servers...")
    finally:
        backend_proc.terminate()
        frontend_proc.terminate()
        print("Goodbye!")

if __name__ == "__main__":
    main()
