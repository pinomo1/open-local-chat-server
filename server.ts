import { User } from "./models/user";
import { Storage } from "./models/storage";
import { Server } from "socket.io";
import { createServer } from "http";
import { networkInterfaces } from "node:os";
import dgram from "node:dgram";

const multicastAddress = "224.0.2.61";
const multicastSocket: dgram.Socket = dgram.createSocket({type: "udp4", reuseAddr: true});
const localAddresses: string[] = [];
const storage = new Storage();

const nets = networkInterfaces();

for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
        if (net.family === 'IPv4' && !net.internal) {
            localAddresses.push(net.address);
        }
    }
}

multicastSocket.on('message', (msg, rinfo) => {
    let message = msg.toString();
    let address = rinfo.address;
    let port = rinfo.port;
    console.log(`Received ${message} from ${address}:${port}`);
    if (message == "DISCOVER"){
        let reply = Buffer.from("OFFER");
        multicastSocket.send(reply, port, address);
    }
});

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
            
            if(req.url == "/api/login"){
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

function isValidMessage(message: string): boolean{
    if (message.length > 1000){
        return false;
    }
    if (message.trim().length == 0){
        return false;
    }
    return true;
}

function logInterface(){
    console.log("Available interfaces:");
    for (let i = 0; i < localAddresses.length; i++){
        console.log(localAddresses[i] + ":" + port);
    }
    console.log("Multicast address: " + multicastAddress);
}

logInterface();

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
        if (!isValidMessage(message)){
            socket.emit('error', "Invalid message");
            return;
        }
        message = message.trim();
        message = message.replace(/\n+/g, '\n');
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

multicastSocket.addMembership(multicastAddress);
