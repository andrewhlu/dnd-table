import win32api
import win32con
import random
import json
import time
from websocket_server import WebsocketServer

tick = 0
stage = "finger-up"
# upperbound to define tap in ms. Anything above this value is considered a hold
tapDefine = 1000
tapLength = 0
storedX = 0
storedY = 0


def new_client(client, server):
	print("Connection Established")


def message_received(client, server, message):
	global stage, tick, tapLength, tapDefine, storedX, storedY
	print(json.loads(message))
	result = json.loads(message)
	if "finger-down" in result["type"]:
		win32api.SetCursorPos((int(result["position"]["x"]), int(result["position"]["y"])))
		storedX = result["position"]["x"]
		storedY = result["position"]["y"]
		if stage not in result["type"]:
			stage = 'finger-down'
			tick = result["time"]
			print("tap started")
	elif "finger-up" in result["type"] and stage not in result["type"]:
		stage = 'finger-up'
		win32api.mouse_event(win32con.MOUSEEVENTF_LEFTDOWN, storedX, storedY, 0, 0)
		win32api.mouse_event(win32con.MOUSEEVENTF_LEFTUP, storedX, storedY, 0, 0)

PORT = 8000
server = WebsocketServer(PORT, "0.0.0.0")
server.set_fn_new_client(new_client)
server.set_fn_message_received(message_received)
server.run_forever()
