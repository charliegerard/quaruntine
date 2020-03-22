# Quaruntine

Interactive experiment using pose recognition to trigger videos or 3D background when running.

While PoseNet is detecting that the user is running (detects that the position of the wrists are above the elbows), the video is playing or the 3D background is animating.

When the user is not doing a "running pose", the animations stop.

## Demo

## How to run

- Clone this repo
- Run a server, e.g `python -m SimpleHTTPServer 5000`
- Visit `localhost:5000`, select the background you wanna start with.
- If you want to switch between _real_ or _3D_ background, wave towards the right side of the screen.
