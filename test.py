import pyautogui, random, json, time

from websocket_server import WebsocketServer

rightSide = 1920
leftSide = 0
bottomSide = 0
topSide = 1080
tick = 0
stage = 'finger-up'
tapDefine = 1000 #upperbound to define tap in ms. Anything above this value is considered a hold
tapLength = 0


xCord = random.randint(leftSide, rightSide)
yCord = random.randint(bottomSide, topSide)

pyautogui.moveTo(xCord,yCord)
print(str(xCord) + ' ' + str(yCord))

def new_client(client, server):
	print("Connection Established")

def message_received(client, server, message):
	print(json.loads(message))
	result = json.loads(message)
	if "finger-down" in result.type and if stage not in result.type:
		stage = 'finger-down'
		tick = result.time
		print("tap started")

	elif "finger-up" in result.type and if stage not in result.type:
		stage = 'finger-up'
		tapLength = result.time - tick
		if tapLength < tapDefine:
			pyautogui.click()
			print("tap registered")
		elif:
			 print("tap no longer registered, hold is registered ")#when you hold for longer than 1s, it will register a drag
			 





PORT=8000
server = WebsocketServer(PORT, "0.0.0.0")
server.set_fn_new_client(new_client)
server.set_fn_message_received(message_received)
server.run_forever()