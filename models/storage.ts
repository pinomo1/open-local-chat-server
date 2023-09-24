import { User } from './user';

export class Storage{
    private users: Map<string, User> = new Map<string, User>();
    private tokens: Map<string, string> = new Map<string, string>();
    private socketToToken: Map<string, string> = new Map<string, string>();
    private userToSocket: Map<string, string> = new Map<string, string>();
    private static instance: Storage;
    private filename: string = "users.txt";

    constructor(){
        if (Storage.instance){
            return Storage.instance;
        }
        this.users = new Map<string, User>();
        this.tokens = new Map<string, string>();
        this.socketToToken = new Map<string, string>();
        this.userToSocket = new Map<string, string>();
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
        return this.tokens.has(token);
    }

    public addUser(username: string, password: string): void{
        this.users.set(username, new User(username, password));
        this.addUserToFile(this.users.get(username)!);
    }

    public getUser(username: string): User{
        return this.users.get(username)!;
    }

    public getUserByToken(token: string): User{
        let username = this.tokens.get(token)!;
        return this.getUser(username);
    }

    public eraseToken(token: string): void{
        this.tokens.delete(token);
    }

    public addToken(token: string, username: string): void{
        this.tokens.set(token, username);
    }

    public addSocketToToken(socket: string, token: string): void{
        this.socketToToken.set(socket, token);
        this.userToSocket.set(this.getUserByToken(token).getUsername(), socket);
    }

    public getTokenBySocket(socket: string): string{
        return this.socketToToken.get(socket)!;
    }

    public removeSocket(socket: string): void{
        this.socketToToken.delete(socket);
        this.userToSocket.delete(this.getUserByToken(this.getTokenBySocket(socket)).getUsername());
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
}