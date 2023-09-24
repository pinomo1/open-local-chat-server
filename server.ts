import { User } from "./models/user";
import { Storage } from "./models/storage";
import { Server } from "socket.io";
import { createServer } from "http";

const storage = new Storage();

const httpServer = createServer(function(req,res){
    let headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        'Content-Type': 'application/json'
    };
    if (req.method == "OPTIONS"){
        res.writeHead(200, headers);
        res.end(JSON.stringify({}));
    }
    else if (req.method == "POST"){
        let body = "";
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            let json : any;
            try{
                json = JSON.parse(body);
            }
            catch(e){
                res.writeHead(400, headers);
                res.end(JSON.stringify({error: "Invalid JSON"}));
                return;
            }
            let username: string, password: string;
            if (json.username == undefined || json.password == undefined){
                res.writeHead(400, headers);
                res.end(JSON.stringify({error: "Invalid JSON"}));
                return;
            }
            else{
                username = json.username;
                password = json.password;
            }
            if(req.url == "/api/login"){
                if(Storage.getInstance().hasUser(username)){
                    let user = Storage.getInstance().getUser(username);
                    if(user.checkPassword(password)){
                        let token = user.generateToken();
                        Storage.getInstance().addToken(token, username);
                        res.writeHead(200, headers);
                        res.end(JSON.stringify({token: token}));
                    }
                    else{
                        res.writeHead(401, headers);
                        res.end(JSON.stringify({error: "Invalid password"}));
                    }
                }
                else{
                    res.writeHead(401, headers);
                    res.end(JSON.stringify({error: "Invalid username"}));
                }
            }
            else if(req.url == "/api/register"){
                if(!Storage.getInstance().hasUser(username)){
                    if(User.isValidUsername(username)){
                        Storage.getInstance().addUser(username, password);
                        res.writeHead(200, headers);
                        res.end(JSON.stringify({}));
                    }
                    else{
                        res.writeHead(401, headers);
                        res.end(JSON.stringify({error: "Invalid username"}));
                    }
                }
                else{
                    res.writeHead(401, headers);
                    res.end(JSON.stringify({error: "Username already taken"}));
                }
            }
            else{
                res.writeHead(404, headers);
                res.end(JSON.stringify({error: "Not found"}));
            }
        });
    }
    else{
        res.writeHead(404, headers);
        res.end(JSON.stringify({error: "Not found"}));
    }
});

const io = new Server(httpServer)
const port = 9001
const generalRoom = "general";

io.on('connection', (socket) => {
    console.log('user connected');
    
    socket.on('join', (token: string) => {
        if(storage.hasToken(token)){
            let user = storage.getUserByToken(token);
            socket.join(generalRoom);
            socket.emit('joined', user.getUsername());
            socket.to(generalRoom).emit('joined', user.getUsername());
            storage.addSocketToToken(socket.id, token);
        }
        else{
            socket.emit('error', "Invalid token");
        }
    });

    socket.on('chat', (message: string) => {
        let token = storage.getTokenBySocket(socket.id);
        let user = storage.getUserByToken(token);
        socket.emit('chat', user.getUsername(), message);
        socket.to(generalRoom).emit('chat', user.getUsername(), message);
    });

    socket.on('disconnect', () => {
        if (storage.hasSocket(socket.id)){
            console.log('user disconnected');
            let token = storage.getTokenBySocket(socket.id);
            let user = storage.getUserByToken(token);
            socket.to(generalRoom).emit('left', user.getUsername());
            storage.removeSocket(socket.id);
        }
    });
});

httpServer.listen(port, () => {
    console.log(`listening on *:${port}`);
});
