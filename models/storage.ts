import { User } from './user';

class TokenUserPair{
    private token: string;
    private username: string;

    constructor(token: string, username: string){
        this.token = token;
        this.username = username;
    }

    public getToken(): string{
        return this.token;
    }

    public getUsername(): string{
        return this.username;
    }
}

class SocketTokenUserPair{
    private socket: string;
    private token: string;
    private username: string;

    constructor(socket: string, token: string, username: string){
        this.socket = socket;
        this.token = token;
        this.username = username;
    }

    public getSocket(): string{
        return this.socket;
    }

    public getToken(): string{
        return this.token;
    }

    public getUsername(): string{
        return this.username;
    }
}

export class Storage{
    private users: Map<string, User> = new Map<string, User>();
    private tokens: Map<string, TokenUserPair> = new Map<string, TokenUserPair>();
    private socketToToken: Map<string, SocketTokenUserPair> = new Map<string, SocketTokenUserPair>();
    private userToSocket: Map<string, SocketTokenUserPair> = new Map<string, SocketTokenUserPair>();
    private roomToSokets: Map<string, Set<string>> = new Map<string, Set<string>>();
    private socketToRooms: Map<string, Set<string>> = new Map<string, Set<string>>();
    private static instance: Storage;
    private filename: string = "users.txt";

    constructor(){
        if (Storage.instance){
            return Storage.instance;
        }
        this.users = new Map<string, User>();
        this.tokens = new Map<string, TokenUserPair>();
        this.socketToToken = new Map<string, SocketTokenUserPair>();
        this.userToSocket = new Map<string, SocketTokenUserPair>();
        this.roomToSokets = new Map<string, Set<string>>();
        this.socketToRooms = new Map<string, Set<string>>();
        Storage.instance = this;
        this.loadUsersFromFile();
    }

    static getInstance(): Storage{
        return new Storage();
    }
    
    private createFileIfNotExists(): void{
        let fs = require('fs');
        if(!fs.existsSync(this.filename)){
            fs.writeFileSync(this.filename, "");
        }
    }

    private loadUsersFromFile(): void{
        let fs = require('fs');
        this.createFileIfNotExists();
        let data = fs.readFileSync(this.filename, 'utf8');
        let lines = data.split("\n");
        for(let line of lines){
            let [username, passwordHash] = line.split(" ");
            this.users.set(username, new User(username, passwordHash, false));
        }
    }

    public addUserToFile(user: User): void{
        let fs = require('fs');
        fs.appendFileSync(this.filename, user.getUsername() + " " + user.getPasswordHash() + "\n");
    }

    public hasUser(username: string): boolean{
        return this.users.has(username);
    }

    public hasToken(token: string): boolean{
        if (!this.tokens.has(token)){
            return false;
        }
        if (!this.users.has(this.tokens.get(token)?.getUsername()!)){
            return false;
        }
        return this.users.get(this.tokens.get(token)?.getUsername()!)!.isTokenValid(token);
    }

    public addUser(username: string, password: string): void{
        this.users.set(username, new User(username, password));
        this.addUserToFile(this.users.get(username)!);
    }

    public getUser(username: string): User{
        return this.users.get(username)!;
    }

    public getUserByToken(token: string): User{
        let username = this.tokens.get(token)?.getUsername()!;
        return this.getUser(username);
    }

    public eraseToken(token: string): void{
        this.tokens.delete(token);
    }

    public addToken(token: string, username: string): void{
        let pair = new TokenUserPair(token, username);
        this.tokens.set(token, pair);
    }

    public addSocketToToken(socket: string, token: string): void{
        let username = this.getUserByToken(token).getUsername();
        let pair = new SocketTokenUserPair(socket, token, username);
        this.socketToToken.set(socket, pair);
        this.userToSocket.set(username, pair);
    }

    public getTokenBySocket(socket: string): string{
        return this.socketToToken.get(socket)?.getToken()!;
    }

    public removeSocket(socket: string): void{
        if (!this.hasSocket(socket)){
            return;
        }
        if (!this.hasToken(this.getTokenBySocket(socket))){
            return;
        }
        this.userToSocket.delete(this.getUserByToken(this.getTokenBySocket(socket)).getUsername());
        this.socketToToken.delete(socket);
    }

    public hasSocket(socket: string): boolean{
        return this.socketToToken.has(socket);
    }

    public isUserOnline(username: string): boolean{
        return this.userToSocket.has(username);
    }

    public onlineUsers(): string[]{
        return Array.from(this.userToSocket.keys());
    }

    public getSocketByUsername(username: string): string{
        return this.userToSocket.get(username)?.getSocket()!;
    }

    public hasSocketByUsername(username: string): boolean{
        return this.userToSocket.has(username);
    }

    public addSocketToRoom(socket: string, room: string): void{
        if (!this.hasRoom(room)){
            this.roomToSokets.set(room, new Set<string>());
        }
        this.socketToRooms.set(socket, new Set<string>());
        this.roomToSokets.get(room)?.add(socket);
    }

    public removeSocketFromRoom(socket: string, room: string): void{
        if (!this.hasRoom(room)){
            return;
        }
        this.roomToSokets.get(room)?.delete(socket);
        this.socketToRooms.delete(socket);
        if (this.roomToSokets.get(room)?.size == 0){
            this.roomToSokets.delete(room);
        }
    }

    public getSocketsInRoom(room: string): string[]{
        if (!this.hasRoom(room)){
            return [];
        }
        return Array.from(this.roomToSokets.get(room)!);
    }

    public getUsersInRoom(room: string): string[]{
        let sockets = this.getSocketsInRoom(room);
        let users: string[] = [];
        for(let socket of sockets){
            users.push(this.getUserByToken(this.getTokenBySocket(socket)).getUsername());
        }
        return users;
    }

    public hasRoom(room: string): boolean{
        return this.roomToSokets.has(room);
    }

    public getRoomsBySocket(socket: string): string[]{
        if (!this.hasSocket(socket)){
            return [];
        }
        return Array.from(this.socketToRooms.get(socket)!);
    }
}