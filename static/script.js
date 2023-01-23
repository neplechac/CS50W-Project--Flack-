document.addEventListener("DOMContentLoaded", () => {
    
    // --- GET DATA FROM LOCAL STORAGE --- //
    let username = localStorage.getItem("username");
    let channel = localStorage.getItem("channel");

    // --- CONNECT TO APP --- //
    let socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
    
    socket.on("connect", () => {
        // Local storage empty/user connecting for the first time
        // Prompt user for username
        if (!username) {
            $("#promptModal").modal({
            show: true,
            backdrop: "static",
            keyboard: false
            });

            document.querySelector("#promptModalForm").onsubmit = () => {
                const newUser = document.querySelector("#promptModalInput").value;

                // Check input - if ok, send username to server
                if (modalInputCheck(newUser)) {
                    socket.emit("log user", {"user": newUser});
                }
                // Prevent page from reloading
                return false;
            };

        // Username is in local storage
        } else {
            // Set default channel if none in local storage
            if (!channel) {
                channel = "#general";
            }
            // Join stored/default channel
            socket.emit("join channel", {"channel": channel, "user": username});
        }   
    });

    // --- USER LOGIN --- //
    socket.on("user logged", data => {
        // Username is unique
        if (data.success) {
            username = data.user;
            $("#promptModal").modal("hide");
        
            // Store username in local storage
            localStorage.setItem("username", username);
                            
            // Reload page
            location.reload();

        // User already exists  
        } else {
            document.querySelector("#promptModalErrorMsg").innerHTML = "User already exists.";
        }
    });

    // --- DISCONNECT FROM APP --- //
    // (reload page/close tab etc.) //
    window.addEventListener("beforeunload", () => {
        if (channel) {
            socket.emit("leave channel", {"channel": channel, "user": username});
        }
    });

    // --- SHOW CHANNELS --- //
    socket.on("show channels", data => {
        // Clear current list of channels
        document.querySelector("#channelList").innerHTML = "";

        // Show updated list of channels
        for (let i = 0; i < data.channels.length; i++) {
            const a = document.createElement("a");
            
            a.setAttribute("class", "list-group-item list-group-item-action channel-select");
            a.setAttribute("href", data.channels[i]);
            a.setAttribute("data-channel", data.channels[i]);
            
            a.innerHTML = data.channels[i];

            document.querySelector("#channelList").append(a);
        }

        // Initializaze button functionality //
        document.querySelectorAll(".channel-select").forEach(button => {
            button.onclick = () => {
                
                // --- SWITCH CHANNEL --- //
                // Update active channel and store it in local storage
                if (button.dataset.channel != channel) {
                    let oldChannel = channel;
                    channel = button.dataset.channel;
                    localStorage.setItem("channel", channel);
            
                    // Leave previous channel
                    socket.emit("leave channel", {"channel": oldChannel, "user": username});
            
                    // Join new channel
                    socket.emit("join channel", {"channel": channel, "user": username});
                }
            };
        });
    });

    // --- CREATE CHANNEL --- //
    document.querySelector("#createChannel").onclick = () => {
        
        // Update and show form
        document.querySelector("#promptModalLongTitle").innerHTML = "Create new channel";
        document.querySelector("#promptModalInput").placeholder = "Enter channel name";
        document.querySelector("#promptModalButton").innerHTML = "Create";
        document.querySelector("#promptModalInputPrepend").innerHTML = "#";
        document.querySelector("#promptModalErrorMsg").innerHTML = "";
        
        $("#promptModal").modal("show");
        document.querySelector("#promptModalForm").onsubmit = () => {
            const newChannel = document.querySelector("#promptModalInput").value;

            // Check input
            if (modalInputCheck(newChannel)) {
                // Check if channel name is unique
                let channelUnique = true;
                document.querySelectorAll(".channel-select").forEach(channel => {
                    if (channel.dataset.channel.slice(1) === newChannel) {
                        channelUnique = false;
                    }
                });

                // If unique
                if (channelUnique) {
                    $("#promptModal").modal("hide");
                    // Create new #channel
                    socket.emit("create channel", {"channel": `#${newChannel}`, "creator": username});
                
                // Channel already exists
                } else {
                    document.querySelector("#promptModalErrorMsg").innerHTML = "Channel already exists.";
                }
            }
            // Prevent page from reloading
            return false;
        };
    };

    function modalInputCheck(input) {
        if (!input) {
            document.querySelector("#promptModalErrorMsg").innerHTML = "Input cannot be empty.";
            return false;
        } else if (input.length > 10) {
            document.querySelector("#promptModalErrorMsg").innerHTML = "Input too long. Enter max 10 characters.";
            return false;
        } else if (!input.match(/^[a-z0-9]+$/i)) {
            document.querySelector("#promptModalErrorMsg").innerHTML = "Invalid input. Letters and numbers only.";
            return false;
        } else {
            return true;
        }
    };

    // --- SHOW USERS IN CHANNEL --- //
    socket.on("show users", data => {
        // Clear current list of users
        document.querySelector("#usersList").innerHTML = "";

        // Update list of users
        for (let i = 0; i < data.users.length; i++) {
            const li = document.createElement("li");
            li.setAttribute("class", "list-group-item py-1 border-0");

            // Highlight own name
            if (data.users[i] === username) {
                li.className += " text-info";
            }

            li.innerHTML = data.users[i];
            document.querySelector("#usersList").append(li);
        }
    });

    // --- LOAD CHANNEL DATA --- //
    let msgWindow = document.querySelector("#messagesWindow");

    socket.on("load channel data", data => {
        // Clear messages from old channel
        document.querySelector("#messagesList").innerHTML = "";
    
        // Show messages from new channel
        for (let i = 0; i < data.length; i++) {
            // username, message, timestamp
            showMessage(data[i][0], data[i][1], data[i][2]);
        }
    
        // Update name of new active channel in user's layout
        document.querySelector("#pageTitle").innerHTML = `nepleChat: ${channel}`;
        document.querySelector("#messagesHeader").innerHTML = channel;
        document.querySelector("#usersHeader").innerHTML = `Users in ${channel}`;
    });

    // --- ANNOUNCE JOINING/LEAVING USER --- //
    socket.on("announce user", data => {
        const li = document.createElement("li");

        if (data.action === "join") {
            li.innerHTML = `${data.user} has joined the channel`;
        } else if (data.action === "leave") {
            li.innerHTML = `${data.user} has left the channel`;
        }

        li.setAttribute("class", "ml-3 small text-danger announce-li");

        document.querySelector("#messagesList").append(li);
        
        // Keep window scrolled to bottom
        msgWindow.scrollTop = msgWindow.scrollHeight;
    });

    // --- SEND MESSAGE --- //
    let message = document.querySelector("#messageTextarea");
    let sendButton = document.querySelector("#messageSendButton");
    
    // via ENTER //
    message.addEventListener("keypress", e => {
        if (e.key === "Enter" && !e.shiftKey) {
            addMessage(username, message.value);
            message.value = "";
            e.preventDefault();
        }
    });

    // via SEND button //
    sendButton.addEventListener("click", () => {
        addMessage(username, message.value);
        message.value = "";
    });

    function addMessage(sender, message) {
    // Check if not only whitespace
        if (/\S/.test(message)) {
            socket.emit("send message", {"sender": sender, "message": message, "channel": channel});
        }
    };

    // --- RECEIVE MESSAGE --- //
    const template = Handlebars.compile(document.querySelector("#messageTemplate").innerHTML);

    socket.on("receive message", data => {
        // Show message
        showMessage(data.sender, data.message, data.time);
    });

    function showMessage(sender, message, time) {
        // Convert UTC timestamp to local time
        time = new Date(time).toLocaleTimeString();

        // Create message from template
        let msg = {"sender": sender, "text": message, "time": time};
        
        // Highlight own messages
        if (sender === username) {
            msg.align = "flex-row-reverse"
            msg.border = "ml-4 mr-2 border border-info";
        } else {
            msg.border = "mr-4 ml-2";
        }

        document.querySelector("#messagesList").innerHTML += template(msg);

        // Keep window scrolled to bottom
        msgWindow.scrollTop = msgWindow.scrollHeight;
    }

    // --- DELETE MESSAGE --- //
    socket.on("delete message", () => {
        document.querySelector(".message-li").remove();
    });


    // --- TOGGLE INFO PANEL IN SMALL VIEW --- //
    const infoButton = document.querySelector("#infoButton");
    infoButton.addEventListener("click", () => {
        document.querySelector(".row-offcanvas").classList.toggle('active');
    });
});
