# CS1NoteViewer
A simple webapp to view speedrunning notes for the Trails series. The included notes cover the Trails games I run, but the tool is fairly generic — drop your own .txt files into the notes folder and it'll display those instead.

Notes are in a markdown like format, using headings and bold syntax. That was all I needed but would be easy to have this support full markdown if there is a use for it.

# Quick View (no install)

The viewer is hosted on GitHub Pages at https://eiklopfer.github.io/CS1NoteViewer/ — just open the link, pick a notes file from the dropdown, and navigate with the arrow keys or spacebar. Nothing to install.

This is the easiest way to check things out or read notes from another device. The only thing this version is missing is global hotkey support, so you can only navigate while the browser tab has focus. If you want hotkeys that work while you're in-game, run it locally — see below.

# Local Setup (with global hotkeys)

Running locally adds a second script that listens for global hotkeys, so you can navigate through the notes without having to move focus away from the game. I have it configured to listen for the arrow keys and spacebar. I had spacebar also setup as my split key in LiveSplit, so when I advance to my next split in the run my notes move to the next page.

The local version is made up of two main python scripts:
1. pythonServer - The simple webserver script that loads the notes and starts the webapp
2. globalListenKeys - The script to watch for global hotkeys to navigate the webapp

Note I have only run this on my own machine which is running Windows 11. I believe this should work on all platforms but have not tested it.

To run this tool you will need to do the following steps to install everything:
1. Pull or download all the files from this repository
2. Install Python, I ran this with Python 3.11 - https://www.python.org/downloads/
3. globalListenKeys requires some additional python libraries, install these with "pip"
   1. Use "pip" to install these extra package. You should have pip from step 2 above but see more here if the below do not work: https://packaging.python.org/en/latest/tutorials/installing-packages/
   2. Install websockets, this is how this python script sends messages to the webapp: "pip install websockets"
   3. Install pynput, this is how we listen for key pushes and should work on all platforms:  "pip install pynput"

Once you have the above installations done running the tool is simple:
1. Start pythonServer.py, you should be able to double click the script or run it via command line with "python pythonServer.py"
2. Start globalListenKeys.py if you want global hotkey navigation, again just double click it or run "python globalListenKeys.py"
3. Open your webbrowser of choice and go to http://localhost:8000/

# Disclaimer Stuff

This software is provided "as is", I have tested it on my own machine and have successfully used it for the above purposes. Feel free to post issues if you encounter them with the tool but the author will not be providing official support for this project. Community contributions and discussions are welcome, but there might not be active maintenance or support provided.

I will also License this under the standard MIT License, check that for exact details but overall feel free to copy and modify this for your own uses.
