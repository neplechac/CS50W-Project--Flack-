import os
import time

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

MSG_LIMIT = 100

channels = {"#general": {"users": {}, "messages": []}}

@app.route("/")
def index():
    return render_template("index.html")


@socketio.on("log user")
def log_user(data):
    user = data["user"]

    for channel in channels:
        if user in channels[channel]["users"]:
            emit("user logged", {"success": False, "user": user})
            return

    emit("user logged", {"success": True, "user": user})


@socketio.on("join channel")
def join_channel(data):
    user = data["user"]
    channel = data["channel"]

    join_room(channel)

    emit("load channel data", channels[channel]["messages"])

    if user not in channels[channel]["users"]:
        channels[channel]["users"][user] = [request.sid]
        
        emit("announce user", {"action": "join", "user": user}, room=channel)
    
    else:
        channels[channel]["users"][user].append(request.sid)

    emit("show channels", {"channels": list(channels.keys())})
    emit("show users", {"users": list(channels[channel]["users"].keys())}, room=channel)


@socketio.on("leave channel")
def leave_channel(data):
    user = data["user"]
    old_channel = data["channel"]

    leave_room(old_channel)
    
    channels[old_channel]["users"][user].remove(request.sid)
    
    if not channels[old_channel]["users"][user]:
        del channels[old_channel]["users"][user]

        emit("announce user", {"action": "leave", "user": user}, room=old_channel)
        emit("show users", {"users": list(channels[old_channel]["users"].keys())}, room=old_channel)


@socketio.on("create channel")
def create_channel(data):
    user = data["creator"]
    new_channel = data["channel"]
    
    channels[new_channel] = {"creator": user, "users": {}, "messages": []}

    emit("show channels", {"channels": list(channels.keys())}, broadcast=True)


@socketio.on("send message")
def send_message(data):
    sender = data["sender"]
    message = data["message"]

    timestamp = time.time() * 1000
    channel = data["channel"]

    channels[channel]["messages"].append((sender, message, timestamp))
    
    if len(channels[channel]["messages"]) > MSG_LIMIT:
        del channels[channel]["messages"][0]
        emit("delete message", room=channel)

    emit("receive message", {"sender": sender, "message": message, "time": timestamp}, room=channel)