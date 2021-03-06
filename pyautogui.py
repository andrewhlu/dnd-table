import pyautogui, random, json, time
from websocket_server import WebsocketServer

tick = 0
stage = "finger-up"
tapDefine = 1000 #upperbound to define tap in ms. Anything above this value is considered a hold
tapLength = 0

pyautogui.FAILSAFE = False

#xCord = random.randint(leftSide, rightSide)
#yCord = random.randint(bottomSide, topSide)
#pyautogui.moveTo(xCord,yCord)
#print(str(xCord) + ' ' + str(yCord))

def new_client(client, server):
	print("Connection Established")

def message_received(client, server, message):
	global stage, tick, tapLength, tapDefine
	print(json.loads(message))
	result = json.loads(message)
	if "calibration" in result["type"]:
		frameWidth = result["frame"]["width"] #width dimension of user calibrated play area
		frameHeight = result["frame"]["height"] #height dimension of user calibrated play area
		windowWidth = result["window"]["width"] #width dimension of entire screen
		windowHeight = result["window"]["height"] #height dimension of entire screen

	else:
		if "finger-down" in result["type"]: 
			pyautogui.moveTo(result["position"]["x"], result["position"]["y"])
			if stage not in result["type"]:
				stage = 'finger-down'
				tick = result["time"]
				print("tap started")
			
		elif "finger-up" in result["type"] and stage not in result["type"]:
			stage = 'finger-up'
			pyautogui.click()
			# tapLength = result["time"] - ticks

			# if tapLength < tapDefine:
			# 	pyautogui.click()
			# 	print("tap registered")





PORT=8000
server = WebsocketServer(PORT, "0.0.0.0")
server.set_fn_new_client(new_client)
server.set_fn_message_received(message_received)
server.run_forever()