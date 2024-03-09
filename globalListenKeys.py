import asyncio
import websockets
from pynput.keyboard import Key, Listener, KeyCode
from functools import partial

# Keypad start at 96 for 0 and go to 105 for 9
VK_NUMPAD7 = 103

NEXT_KEYS = [Key.right, Key.space, VK_NUMPAD7]
PREVIOUS_KEYS = [Key.left]
PAUSE_KEY = Key.end  # Define the pause key

connected = set()
is_paused = False  # Track the paused state

async def broadcast(message):
    if connected:  # Check if there are clients connected
        await asyncio.wait([asyncio.create_task(ws.send(message)) for ws in connected])

def on_press(key, loop):
    global is_paused
    
    if hasattr(key, 'vk'):
        key = key.vk

    # Check if the pressed key matches the pause key
    if key == PAUSE_KEY:
        is_paused = not is_paused
        print(f"Paused: {is_paused}")
        return

    if is_paused:
        return

    # Check if the key matches any in the NEXT_KEYS or PREVIOUS_KEYS
    if key in NEXT_KEYS:
        asyncio.run_coroutine_threadsafe(broadcast("next"), loop)
    elif key in PREVIOUS_KEYS:
        asyncio.run_coroutine_threadsafe(broadcast("previous"), loop)

async def echo(websocket, path):
    connected.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        connected.remove(websocket)

async def main():
    loop = asyncio.get_running_loop()  # Capture the event loop in the main thread
    async with websockets.serve(echo, "localhost", 42069):
        print("WebSocket Server Started on ws://localhost:42069")
        listener = Listener(on_press=partial(on_press, loop=loop))
        listener.start()
        await asyncio.Future()  # This will block forever

if __name__ == "__main__":
    asyncio.run(main())
