# CS50W - Web Programming with Python and JavaScript
## Project 2: Flack (nepleChat)

https://docs.cs50.net/web/2020/x/projects/2/project2.html

This is my implementation of the third project in the CS50w course – a simple online messaging app.

## Requirements
Required Python packages are listed in `requirements.txt` file.

Apart from that, environment variable `FLASK_APP` needs to be set (in this case, main Flask file is `application.py`).

## Usage
When connecting to app for the first time, user is asked to type in a display name.

All newcoming users are by default connected to *#general* channel, but every user can then create a new channel or join an existing one and start chatting.

**NOTE:** All data are stored in local storage, not a SQL database, as per project description.

![screenshot](https://i.ibb.co/nj90F4t/neplechat3.png)
