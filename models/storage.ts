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
}