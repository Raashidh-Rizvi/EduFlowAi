"""
Development server: `uvicorn main:app --reload --host 0.0.0.0 --port 8888`.

On Windows, uvicorn's reloader restarts the worker with os.kill(pid, CTRL_C_EVENT).
Windows delivers that Ctrl+C to every process attached to the console, so when this
service runs under dev-runner.js (`npm run dev`) each reload also stopped the runner,
the .NET backend and Vite. Here the worker is restarted with terminate() instead,
as uvicorn already does on Linux/macOS.
"""

import sys

import uvicorn
from uvicorn.supervisors import basereload

if sys.platform == "win32":

    def _restart_without_console_ctrl_c(self) -> None:
        self.process.terminate()
        self.process.join()
        self.process = basereload.get_subprocess(
            config=self.config, target=self.target, sockets=self.sockets
        )
        self.process.start()

    basereload.BaseReload.restart = _restart_without_console_ctrl_c


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8888, reload=True)
